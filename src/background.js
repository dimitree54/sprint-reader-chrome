//------------------------------------------------------------------------------
//
//  SPRINT READER
//  Speed Reading Extension for Google Chrome
//  Copyright (c) 2013-2025, Anthony Nosek
//  https://github.com/anthonynosek/sprint-reader-chrome/blob/master/LICENSE
//
//------------------------------------------------------------------------------

// Load utility script when running in a worker context (MV3)
if (typeof self !== "undefined" && typeof self.importScripts === "function") {
    try {
        self.importScripts("utility.js");
        console.log('[Sprint Reader] Background script (worker) loaded utility.js');
    } catch (e) {
        console.error('[Sprint Reader] Error loading utility script in worker context:', e);
    }
}

console.log('[Sprint Reader] Background script initialised');

//------------------------------------------------------------------------------
// Version Management
function getVersion() {
    return chrome.runtime.getManifest().version;
}

function onInstall() {
    chrome.tabs.create({ url: "src/welcome.html" });
}

function onUpdate() {
    console.log(`[Sprint Reader] Showing update page`);
    chrome.tabs.create({ url: "src/updated.html" });
}

function checkAndUpdateVersion(details) {
    const currentVersion = getVersion();

    if (details.reason === 'chrome_update') {
        chrome.storage.local.set({ version: currentVersion });
        return;
    }

    chrome.storage.local.get(["version"], (result) => {
        const previousVersion = result.version;

        if (previousVersion === currentVersion) {
            console.log(`[Sprint Reader] Version already set to v${currentVersion}, no action required`);
            return;
        }

        if (details.reason === 'install') {
            onInstall();
        } else if (details.reason === 'update') {
            if (typeof previousVersion === 'undefined') {
                console.log(`[Sprint Reader] Updated, but no previous version found in storage, treating as a major update to v${currentVersion}`);
            } else {
                console.log(`[Sprint Reader] Updated from v${previousVersion} to v${currentVersion}`);
            }
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

    console.log('[Sprint Reader] Background received message', message.type, {
        haveSelection: message.haveSelection,
        textLength: message.selectedText ? message.selectedText.length : 0
    });

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
const menusApi = (typeof chrome !== 'undefined' && chrome.contextMenus)
    || (typeof chrome !== 'undefined' && chrome.menus)
    || (typeof browser !== 'undefined' && (browser.contextMenus || browser.menus));

if (menusApi) {
    chrome.runtime.onInstalled.addListener(() => {
        const contexts = ["page", "selection"];
        contexts.forEach((context, index) => {
            const title = context === "page" ? "Sprint read last saved selection" : "Sprint read selected text";
            try {
                menusApi.create({
                    title,
                    contexts: [context],
                    id: index.toString(),
                });
            } catch (error) {
                console.error('[Sprint Reader] Failed to create context menu item', error);
            }
        });
    });

    menusApi.onClicked.addListener(async (context, tab) => {
        console.log('[Sprint Reader] Context menu onClicked', {
            id: context.menuItemId,
            selectionLength: context.selectionText ? context.selectionText.length : 0,
            contexts: context.contexts,
            pageUrl: context.pageUrl,
        });

        const menuId = context.menuItemId;
        const isSelectionMenu = menuId === "1" || menuId === 1;
        const isLastSavedMenu = menuId === "0" || menuId === 0;

        if (isSelectionMenu) {
            const message = {
                target: "background",
                type: "openReaderFromContextMenu",
                selectionText: context.selectionText,
            };
            receiveMessage(message);
            return;
        }

        if (isLastSavedMenu) {
            const message = {
                target: "background",
                type: "openReaderFromContextMenu",
                selectionText: "",
            };
            receiveMessage(message);
        }
    });
} else {
    console.warn('[Sprint Reader] Context menus API not available in this environment');
}

//------------------------------------------------------------------------------
// Window Management
let readerWindowId = null;

chrome.windows.onRemoved.addListener(async (windowId) => {
    if (windowId === readerWindowId) {
        readerWindowId = null;
    }
});

async function getDisplayBounds() {
    const fallback = { width: 1280, height: 720, left: 0, top: 0 };

    try {
        const lastFocused = await chrome.windows.getLastFocused({ populate: false });
        if (lastFocused && typeof lastFocused.width === "number" && typeof lastFocused.height === "number") {
            return {
                width: lastFocused.width,
                height: lastFocused.height,
                left: typeof lastFocused.left === "number" ? lastFocused.left : fallback.left,
                top: typeof lastFocused.top === "number" ? lastFocused.top : fallback.top,
            };
        }
    } catch (error) {
        console.warn("[Sprint Reader] Unable to determine window bounds, using defaults.", error);
    }

    return fallback;
}

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
    const bounds = await getDisplayBounds();
    const screenWidth = bounds.width;
    const screenHeight = bounds.height;

    const readerWidthPercentOfScreen = 0.7;
    const readerHeightPercentOfScreen = 0.53;
    const percentOfScreenWidth = screenWidth * 0.05;

    let readerWidth = screenWidth * readerWidthPercentOfScreen;
    let readerHeight = screenHeight * readerHeightPercentOfScreen;

    let width = await getFromLocalGreaterThanZero("readerWidth", readerWidth);
    let height = await getFromLocalGreaterThanZero("readerHeight", readerHeight);

    width = Math.max(width, 880);
    height = Math.max(height, 550);

    const topOffset = screenHeight - screenHeight * readerHeightPercentOfScreen - percentOfScreenWidth;
    const leftOffset = screenWidth - screenWidth * readerWidthPercentOfScreen - percentOfScreenWidth;

    const top = Math.round((bounds.top || 0) + Math.max(topOffset, 0));
    const left = Math.round((bounds.left || 0) + Math.max(leftOffset, 0));

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
        try {
            const readerUrl = chrome.runtime.getURL(url);
            console.log('[Sprint Reader] Opening reader window', { url: readerUrl, width: w, height: h, top: t, left: l });
            const createdWindow = await chrome.windows.create({
                url: readerUrl,
                type: "popup",
                width: w,
                height: h,
                top: t,
                left: l,
                focused: true,
            });
            readerWindowId = createdWindow?.id ?? null;
        } catch (error) {
            console.error('[Sprint Reader] Failed to create reader window', error);
        }
    }
}

//------------------------------------------------------------------------------
// Keyboard Shortcut Management
let mouseY, mouseX;
chrome.commands.onCommand.addListener(async function (command) {
    console.log('[Sprint Reader] Command triggered', command);
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
