//------------------------------------------------------------------------------
//
// 	SPRINT READER
//	Speed Reading Extension for Google Chrome
//	Copyright (c) 2013-2025, Anthony Nosek
//	https://github.com/anthonynosek/sprint-reader-chrome/blob/master/LICENSE
//
//------------------------------------------------------------------------------

(() => {
    if (typeof window !== 'undefined') {
        if (window.__sprintReaderContentInjected) {
            console.log('[Sprint Reader] Content script already initialised, skipping duplicate injection');
            return;
        }
        window.__sprintReaderContentInjected = true;
    }

    console.log('[Sprint Reader] Content script initialised');

    let mouseX, mouseY;
    let hotKeyEnabled = false;
    let autoSelectEnabled = false;
    let hoveredElement;

const OUTLINE_ELEMENT_CLASS = "outlineElement_SR";
const NOTIFICATION_CLASS = "autoselectNotification_SR";
const NOTIFICATION_TEXT = "Sprint Reader Auto-selection Enabled";

// This event is triggered on mouseup
document.addEventListener("mouseup", (event) => {
    // 1. See what text is selected
    const selectedText = window.getSelection().toString();
    // 2. Enable this line to see what the selected text is
    // console.log(selectedText);
    // 3. Pass the text selection to the background page
    passSelectionToBackground(selectedText, false);
});

//------------------------------------------------------------------------------
// Pass the selected text and variables to the background page
function passSelectionToBackground(selectedText, openReaderAlso) {
    // Determine if we have a selection or not
    const haveSelection = selectedText.length > 0;

    // Determine if the document is right-to-left
    const direction = isScriptRTL(selectedText) || false;
    // console.log('RTL:', direction);

    // Send a message back to the service worker
    // The message is any valid JSON string
    if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
        console.log('[Sprint Reader] Sending selection to background', { length: selectedText.length, haveSelection });
        chrome.runtime.sendMessage({
            target: "background",
            type: openReaderAlso ? "openReaderFromContent" : "getSelection",
            selectedText,
            haveSelection,
            dirRTL: direction
        });
    } else {
        console.warn("[Sprint Reader] Extension context invalidated");
    }
}

//------------------------------------------------------------------------------
// Check for RTL
function isScriptRTL(text) {
    if (!("getBoundingClientRect" in document.documentElement)) return false;

    const div = document.createElement("div");
    Object.assign(div.style, {
        position: "absolute",
        visibility: "hidden",
        width: "auto",
        height: "auto",
        fontSize: "10px",
        fontFamily: "'Ahuramzda'"
    });

    const createSpan = () => {
        const span = document.createElement("span");
        span.textContent = text;
        return span;
    };

    div.appendChild(document.createTextNode(text));
    div.appendChild(createSpan());
    div.appendChild(createSpan());
    div.appendChild(document.createTextNode(text));

    const body = document.body;
    if (body) {
        body.appendChild(div);
        const [span1, span2] = div.querySelectorAll("span");
        const rect1 = span1.getBoundingClientRect();
        const rect2 = span2.getBoundingClientRect();
        body.removeChild(div);

        return rect1.left > rect2.left;
    }

    return false;
}

//------------------------------------------------------------------------------
// Listen for instruction and then return the mouse X,Y coordinates
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.target === "content" && message.type === "getMouseCoordinates") {
        sendResponse({ x: mouseX, y: mouseY });
    }
    return true;
});

document.addEventListener("mousemove", (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
});

//------------------------------------------------------------------------------
// Hotkey, auto-text selection management
const keyDown = async (event) => {
    // Only proceed with auto-selection if it's enabled
    await getHotKeyEnabledStatus();   
    setupHotSelection(hotKeyEnabled);   
    if (!hotKeyEnabled) {
        autoSelectEnabled = false;
        return;
    }

    // Check for CONTROL+SHIFT
    if (event.ctrlKey && event.shiftKey) {
        event.preventDefault();
        autoSelectEnabled = !autoSelectEnabled;

        if (autoSelectEnabled) {
            $("body").append('<div class="' + NOTIFICATION_CLASS + '">' + NOTIFICATION_TEXT + "</div>");
        } else {
            // CONTROL+SHIFT toggle OFF, let's kill all highlights
            $("body")
                .find("div:contains(" + NOTIFICATION_TEXT + ")")
                .remove();
                $(hoveredElement).removeClass(OUTLINE_ELEMENT_CLASS);
            hoveredElement = "";
        }
    }

    // If auto select is enabled and the user hits 'e'
    // we select the text and open the reader
    if (autoSelectEnabled && (event.key.toLowerCase() === 'e')) {
        const selectedText = hoveredElement?.textContent || '';
        passSelectionToBackground(selectedText, true);
    }
};

window.addEventListener("keydown", keyDown);

//------------------------------------------------------------------------------
// Access the extension local storage to determine if the hotkey is enabled
async function getHotKeyEnabledStatus() {
    try {
        const key = "madvHotkeySelectionEnabled";
        const result = await chrome.storage.local.get([key]);
        hotKeyEnabled = result[key] ?? false;
    } catch (error) {
        console.log("[Sprint Reader] Error getting hotkey status:", error);
        hotKeyEnabled = false;
    }
}

function setupHotSelection(enable) {
    if (enable) {
        $("*")
            .mouseover(function (event) {
                if (autoSelectEnabled) {
                    $(event.target).addClass(OUTLINE_ELEMENT_CLASS);
                    hoveredElement = event.target;
                }
            })
            .mouseout(function (event) {
                $(event.target).removeClass(OUTLINE_ELEMENT_CLASS);
                hoveredElement = "";
            });
    }
    else {
        $("*")
            .mouseover(null)
            .mouseout(null);
    }
}

    $(document).ready(function () {
        // Only proceed with auto-selection if it's enabled
        getHotKeyEnabledStatus();
        setupHotSelection(hotKeyEnabled);    
    });
})();
