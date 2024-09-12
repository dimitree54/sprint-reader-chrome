//------------------------------------------------------------------------------
//
// 	SPRINT READER
//	Speed Reading Extension for Google Chrome
//	Copyright (c) 2013-2024, Anthony Nosek
//	https://github.com/anthonynosek/sprint-reader-chrome/blob/master/LICENSE
//
//------------------------------------------------------------------------------

// Load our utility file which contains common shared functions
try {
    importScripts("utility.js");
} catch (e) {
    console.log('[Sprint Reader] Error loading utility script from background worker: ' + e);
}

//------------------------------------------------------------------------------
// Install or update detection
// Check if the version has changed
function getVersion() {
    return chrome.runtime.getManifest().version;
}
// Function is fired when the extension is initially installed
function onInstall() {
    chrome.tabs.create({ url: "src/welcome.html" });
}
// Function is fired after the extension has been updated
function onUpdate() {
    chrome.tabs.create({ url: "src/updated.html" });
}
// Function to check the version against the installed version (if applicable)
function checkAndUpdateVersion() {
    const currentVersion = getVersion();
    chrome.storage.local.get(["version"], (result) => {
        const prevVersion = result.version;

        if (typeof prevVersion == "undefined") {
            onInstall();
        } else {
            onUpdate();
        }

        chrome.storage.local.set({ version: currentVersion }, () => {
            console.log(`[Sprint Reader] Version set to ${currentVersion}`);
        });
    });
}
// Run the version check when the extension is installed or updated
chrome.runtime.onInstalled.addListener(checkAndUpdateVersion);

//------------------------------------------------------------------------------
// Message management, listener
var dirRTL;
var selectedText;
var haveSelection;
async function receiveMessage(message, sender, sendResponse) {
    // Return early if this message isn't meant for the background worker
    if (message.target !== "background") {
        return;
    }

    // Reset the selected text
    selectedText = "";
    dirRTL = false;

    // Check the message
    //console.log(message);

    // Determine the message type and process
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
            if (message.selectionText) {
                openReaderWindowSetup(true, message.selectionText, true, dirRTL);
            } else {
                openReaderWindowSetup(false, "", true, dirRTL);
            }
            return false;
        case "openReaderFromPopup":
            openReaderWindowSetup(false, "", false, dirRTL);
            return false;
    }

    return true;
}
// Listen for messages
chrome.runtime.onMessage.addListener(receiveMessage);

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
// Create the selection menu item in the default context menu
chrome.runtime.onInstalled.addListener(() => {
    var contexts = ["page", "selection"];
    for (var i = 0; i < contexts.length; i++) {
        var context = contexts[i];

        var title = "Sprint read selected text";
        if (context == "page") {
            title = "Sprint read last saved selection";
        }

        chrome.contextMenus.create({
            title: title,
            contexts: [context],
            id: i + "",
        });
    }
});
// Handle the context menu click
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
// Listener for window close
chrome.windows.onRemoved.addListener(async function (windowId) {
    readerWindowId = null;
});

//------------------------------------------------------------------------------
// Open Reader functions
async function openReaderWindowSetup(saveToLocal, text, haveSelect, directionRTL) {
    if (saveToLocal) {
        var selectedText = text;
        var selectedTextEncoded = htmlEntitiesEncode(selectedText);
        saveSelectedTextToResource(selectedTextEncoded);
        chrome.storage.local.set({ selectedText: selectedTextEncoded });
        chrome.storage.local.set({ haveSelection: haveSelect });
        chrome.storage.local.set({ selectedTextIsRTL: directionRTL });
    }

    await openReaderWindow();
}
// Open reader window id
var readerWindowId = null;
// Setup the layout and position of the reader window
async function openReaderWindow() {
    // Get the primary display information
    const displays = await chrome.system.display.getInfo();
    const primaryDisplay = displays[0];
    const screenWidth = primaryDisplay.bounds.width;
    const screenHeight = primaryDisplay.bounds.height;

    // Constants (adjust these as needed)
    const readerWidthPercentOfScreen = 0.7;
    const readerHeightPercentOfScreen = 0.53;
    const percentOfScreenWidth = screenWidth * 0.05;

    // Calculate dimensions
    let readerWidth = screenWidth * readerWidthPercentOfScreen;
    let readerHeight = screenHeight * readerHeightPercentOfScreen;

    // Get stored values (you'll need to implement these functions)
    let width = await getFromLocalGreaterThanZero("readerWidth", readerWidth);
    let height = await getFromLocalGreaterThanZero("readerHeight", readerHeight);

    // Ensure minimum dimensions
    width = Math.max(width, 880);
    height = Math.max(height, 550);

    // Calculate position
    const top = Math.round(screenHeight - screenHeight * readerHeightPercentOfScreen - percentOfScreenWidth);
    const left = Math.round(screenWidth - screenWidth * readerWidthPercentOfScreen - percentOfScreenWidth);

    // Call openReader with calculated dimensions
    await openReader("src/reader.html", Math.round(width), Math.round(height), top, left);
}
// Open the reader window
async function openReader(url, w, h, t, l) {
    // Check if a reader window already exists
    if (readerWindowId !== null) {
        try {
            // If the window exists, focus it and potentially refresh
            await chrome.windows.update(readerWindowId, { focused: true });
            // You might want to send a message to the window to refresh its content
            await chrome.runtime.sendMessage({ 
                target: "reader", 
                type: "refreshReader" 
            });
        } catch (error) {
            // If there's an error, the window probably doesn't exist anymore
            readerWindowId = null;
        }
    }

    // If no reader window exists, create a new one
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
var mouseY;
var mouseX;
chrome.commands.onCommand.addListener(async function (command) {
    // Listening for commands
    if (command == "sprint_read_shortcut") {
        // User has hit CTRL+SHIFT+E (MAC=CONTROL+SHIFT+E) on the keyboard
        // Display the selection of text in the sprint reader or
        // automatically attempt to select text where the mouse is located
        if (selectedText.length) {
            // The user has selected text
            openReaderWindowSetup(true, selectedText, haveSelection, dirRTL);
        } else {
            // No selection of text exists so we try and obtain a selection
            // using the mouse location as a guide, i.e. select text block at cursor
            // Ask the browser for the mouse coordinates
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

// -------------------------------------------------------------
// Shuffle the text history items as the reader is closed
async function saveSelectedTextToResource(latestTextSelection) {
    if (latestTextSelection == null) latestTextSelection = "";

    try {
        // Get current selected text and history
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

        // Don't save duplicate text selections
        if (currentText.text === latestTextSelection) return;

        const updates = {};

        // Save the historical text
        if (currentText.text !== hist1.text) {
            // Move history1 to history2
            if (hist1.text !== "") {
                updates.selectedTextHistory2 = hist1.fulltext;
            }

            // Save the currently selected text to history1
            if (currentText.text !== "") {
                updates.selectedTextHistory1 = currentText.fulltext;
            }
        }

        // Save the latest text selection
        updates.selectedText = latestTextSelection;

        // Apply all updates
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