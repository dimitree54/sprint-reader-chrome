//------------------------------------------------------------------------------
//
// SPRINT READER
// Speed Reading Extension for Google Chrome
// Copyright (c) 2013-2024, Anthony Nosek
// https://github.com/anthonynosek/sprint-reader-chrome/blob/master/LICENSE
//
//------------------------------------------------------------------------------

// Load utility script
try {
    importScripts("utility.js");
} catch (e) {
    console.error('[Sprint Reader] Error loading utility script:', e);
}

//------------------------------------------------------------------------------
// Version Management
function getVersion() {
    return chrome.runtime.getManifest().version;
}

function onInstall() {
    chrome.tabs.create({ url: "src/welcome.html" });
}

function onUpdate() {
    chrome.tabs.create({ url: "src/updated.html" });
}

function checkAndUpdateVersion() {
    const currentVersion = getVersion();
    chrome.storage.local.get(["version"], (result) => {
        const prevVersion = result.version;

        if (typeof prevVersion === "undefined") {
            onInstall();
        } else {
            onUpdate();
        }

        chrome.storage.local.set({ version: currentVersion }, () => {
            console.log(`[Sprint Reader] Version set to ${currentVersion}`);
        });
    });
}

chrome.runtime.onInstalled.addListener(checkAndUpdateVersion);

//------------------------------------------------------------------------------
// Message Management
let dirRTL = false;
let selectedText = "";
let haveSelection = false;

async function receiveMessage(message, sender, sendResponse) {
    if (message.target !== "background") return true;

    selectedText = "";
    dirRTL = false;

    switch (message.type) {
        case "getSelection":
            haveSelection = message.haveSelection;
            selectedText = message.selectedText;
            dirRTL = message.dirRTL;
            sendResponse();
            break;
        case "openReaderFromContent":
            openReaderWindowSetup(true, message.selectedText, message.haveSelection, message.dirRTL);
            return false;
        case "openReaderFromContextMenu":
            openReaderWindowSetup(message.selectionText ? true : false, message.selectionText || "", true, dirRTL);
            return false;
        case "openReaderFromPopup":
            openReaderWindowSetup(false, "", false, dirRTL);
            return false;
    }

    return true;
}

chrome.runtime.onMessage.addListener(receiveMessage);

//------------------------------------------------------------------------------
// Storage Helpers
function getFromStorage(key) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([key], (result) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(result[key]);
            }
        });
    });
}

//------------------------------------------------------------------------------
// Context Menu Management
chrome.runtime.onInstalled.addListener(() => {
    const contexts = ["page", "selection"];
    contexts.forEach((context, index) => {
        const title = context === "page" ? "Sprint read last saved selection" : "Sprint read selected text";
        chrome.contextMenus.create({
            title: title,
            contexts: [context],
            id: index.toString(),
        });
    });
});

chrome.contextMenus.onClicked.addListener(async (context) => {
    if (context.menuItemId === "1") {
        const message = {
            target: "background",
            type: "openReaderFromContextMenu",
            selectionText: context.selectionText,
        };
        receiveMessage(message);
    }
});

//------------------------------------------------------------------------------
// Window Management
let readerWindowId = null;

chrome.windows.onRemoved.addListener(async (windowId) => {
    if (windowId === readerWindowId) {
        readerWindowId = null;
    }
});

async function openReaderWindowSetup(saveToLocal, text, haveSelect, directionRTL) {
    if (saveToLocal) {
        const selectedTextEncoded = htmlEntitiesEncode(text);
        saveSelectedTextToResource(selectedTextEncoded);
        await chrome.storage.local.set({
            selectedText: selectedTextEncoded,
            haveSelection: haveSelect,
            selectedTextIsRTL: directionRTL
        });
    }

    await openReaderWindow();
}

async function openReaderWindow() {
    const displays = await chrome.system.display.getInfo();
    const primaryDisplay = displays[0];
    const screenWidth = primaryDisplay.bounds.width;
    const screenHeight = primaryDisplay.bounds.height;

    const readerWidthPercentOfScreen = 0.7;
    const readerHeightPercentOfScreen = 0.53;
    const percentOfScreenWidth = screenWidth * 0.05;

    let readerWidth = screenWidth * readerWidthPercentOfScreen;
    let readerHeight = screenHeight * readerHeightPercentOfScreen;

    let width = await getFromLocalGreaterThanZero("readerWidth", readerWidth);
    let height = await getFromLocalGreaterThanZero("readerHeight", readerHeight);

    width = Math.max(width, 880);
    height = Math.max(height, 550);

    const top = Math.round(screenHeight - screenHeight * readerHeightPercentOfScreen - percentOfScreenWidth);
    const left = Math.round(screenWidth - screenWidth * readerWidthPercentOfScreen - percentOfScreenWidth);

    await openReader("src/reader.html", Math.round(width), Math.round(height), top, left);
}

async function openReader(url, w, h, t, l) {
    if (readerWindowId !== null) {
        try {
            await chrome.windows.update(readerWindowId, { focused: true });
            await chrome.runtime.sendMessage({ 
                target: "reader", 
                type: "refreshReader" 
            });
        } catch (error) {
            readerWindowId = null;
        }
    }

    if (readerWindowId === null) {
        const createdWindow = await chrome.windows.create({
            url: url,
            type: "popup",
            width: w,
            height: h,
            top: t,
            left: l,
            focused: true,
        });
        readerWindowId = createdWindow.id;
    }
}

//------------------------------------------------------------------------------
// Keyboard Shortcut Management
let mouseY, mouseX;
chrome.commands.onCommand.addListener(async function (command) {
    if (command === "sprint_read_shortcut") {
        if (selectedText.length) {
            openReaderWindowSetup(true, selectedText, haveSelection, dirRTL);
        } else {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                chrome.runtime.sendMessage(
                    {
                        target: "content",
                        type: "getMouseCoordinates",
                    },
                    function (response) {
                        mouseX = response.x;
                        mouseY = response.y;
                    }
                );
            });
        }
    }

    return true;
});

//------------------------------------------------------------------------------
// Text History Management
async function saveSelectedTextToResource(latestTextSelection) {
    if (latestTextSelection == null) latestTextSelection = "";

    try {
        const result = await new Promise((resolve, reject) => {
            chrome.storage.local.get(["selectedText", "selectedTextHistory1", "selectedTextHistory2"], (items) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(items);
                }
            });
        });

        const currentText = getSelectedTextFromResourceString(result.selectedText || "");
        const hist1 = getSelectedTextFromResourceString(result.selectedTextHistory1 || "");

        if (currentText.text === latestTextSelection) return;

        const updates = {};

        if (currentText.text !== hist1.text) {
            if (hist1.text !== "") {
                updates.selectedTextHistory2 = hist1.fulltext;
            }

            if (currentText.text !== "") {
                updates.selectedTextHistory1 = currentText.fulltext;
            }
        }

        updates.selectedText = latestTextSelection;

        await new Promise((resolve, reject) => {
            chrome.storage.local.set(updates, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
    } catch (error) {
        console.error("[Sprint Reader] Error saving selected text:", error);
    }
}