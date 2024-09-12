//------------------------------------------------------------------------------
//
// 	SPRINT READER
//	Speed Reading Extension for Google Chrome
//	Copyright (c) 2013-2024, Anthony Nosek
//	https://github.com/anthonynosek/sprint-reader-chrome/blob/master/LICENSE
//
//------------------------------------------------------------------------------

// This event is triggered on mouseup
document.addEventListener("mouseup", function (event) {
    // 1. See what text is selected
    var sel = window.getSelection().toString();
    // 2. Enable this line to see what the selected text is
    //alert(sel);
    // 3. Pass the text selection to the background page
    passSelectionToBackground(sel, false);
});

//------------------------------------------------------------------------------
// Pass the selected text and variables to the background page
function passSelectionToBackground(selectedText, openReaderAlso) {
    // Determine if we have a selection or not
    var haveSelection = selectedText.length;

    // Determine if the document is right-to-left
    var direction = is_script_rtl(selectedText);
    if (typeof direction == "undefined") direction = false;
    //alert('RTL: ' + direction);

    // Send a message back to the service worker
    // The message is any valid JSON string
    if (openReaderAlso) {
        if (chrome.runtime?.id) {
            chrome.runtime.sendMessage({ 
                target: "background", 
                type: "openReaderFromContent", 
                selectedText: selectedText, 
                haveSelection: haveSelection, 
                dirRTL: direction 
            });
        } else {
            console.warn("[Sprint Reader] Extension context invalidated");
        }
    } else {
        if (chrome.runtime?.id) {
            chrome.runtime.sendMessage({ 
                target: "background", 
                type: "getSelection", 
                selectedText: selectedText, 
                haveSelection: haveSelection, 
                dirRTL: direction 
            });
        } else {
            console.warn("[Sprint Reader] Extension context invalidated");
        }
    }
}

//------------------------------------------------------------------------------
// Check for RTL
function is_script_rtl(t) {
    var d, s1, s2, bodies;

    //If the browser doesn’t support this, it probably doesn’t support Unicode 5.2
    if (!("getBoundingClientRect" in document.documentElement)) return false;

    //Set up a testing DIV
    d = document.createElement("div");
    d.style.position = "absolute";
    d.style.visibility = "hidden";
    d.style.width = "auto";
    d.style.height = "auto";
    d.style.fontSize = "10px";
    d.style.fontFamily = "'Ahuramzda'";
    d.appendChild(document.createTextNode(t));

    s1 = document.createElement("span");
    s1.appendChild(document.createTextNode(t));
    d.appendChild(s1);

    s2 = document.createElement("span");
    s2.appendChild(document.createTextNode(t));
    d.appendChild(s2);

    d.appendChild(document.createTextNode(t));

    bodies = document.getElementsByTagName("body");
    if (bodies) {
        var body, r1, r2;

        body = bodies[0];
        body.appendChild(d);
        var r1 = s1.getBoundingClientRect();
        var r2 = s2.getBoundingClientRect();
        body.removeChild(d);

        return r1.left > r2.left;
    }

    return false;
}

//------------------------------------------------------------------------------
var mouseX;
var mouseY;
// Listen for instruction and then return the mouse X,Y coordinates
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.target !== "content") {
        return;
    }

    if (message.type == "getMouseCoordinates") {
        sendResponse({
            x: mouseX,
            y: mouseY,
        });
    }
    return true;
});
document.addEventListener("mousemove", function (event) {
    mouseX = event.clientX;
    mouseY = event.clientY;
});

//------------------------------------------------------------------------------
// Hotkey, auto-text selection management
var hotKeyEnabled = false;
var autoSelectEnabled = false;
var keyDown = function (event) {
    // Only proceed with auto-selection if it's enabled
    getHotKeyEnabledStatus();
    if (hotKeyEnabled == false) {
        autoSelectEnabled = false;
        return;
    }

    // Check for CONTROL+SHIFT
    if (event.ctrlKey && event.shiftKey) {
        // Prevent the default action to avoid triggering browser shortcuts
        event.preventDefault();
        // Toggle the auto-selection
        autoSelectEnabled = !autoSelectEnabled;
        if (autoSelectEnabled) $("body").append('<div class="' + notificationClass + '">' + notificationText + "</div>");
        else {
            // CONTROL+SHIFT toggle OFF, let's kill all highlights
            $("body")
                .find("div:contains(" + notificationText + ")")
                .remove();
            $(hoveredEvent).removeClass(outlineElementClass);
            hoveredEvent = "";
        }
    }

    // If auto select is enabled and the user hits 'e'
    // we select the text and open the reader
    if (autoSelectEnabled && (event.key === 'e' || event.key === 'E')) {
        var selectedText = $(hoveredEvent).text();
        passSelectionToBackground(selectedText, true);
    }
};
window.addEventListener ? document.addEventListener("keydown", keyDown) : document.attachEvent("keydown", keyDown);

//------------------------------------------------------------------------------
// Access the extension local storage to determine if the hotkey is enabled
async function getHotKeyEnabledStatus() {
    try {
        var key = "madvHotkeySelectionEnabled"; 
        let c = await chrome.storage.local.get([key]);
        if (c[key] != undefined) {
            hotKeyEnabled = c[key];
        }
    }
    catch(error) {
        hotKeyEnabled = false;
    }
}
getHotKeyEnabledStatus();

var hoveredEvent;
var outlineElementClass = "outlineElement_SR";
var notificationClass = "autoselectNotification_SR";
var notificationText = "Sprint Reader Auto-selection Enabled";
$(document).ready(function () {

    // Only proceed with auto-selection if it's enabled
    if (hotKeyEnabled == false) {
        return;
    }

    $("*")
        .mouseover(function (event) {
            if (autoSelectEnabled) {
                $(event.target).addClass(outlineElementClass);
                hoveredEvent = event.target;
            }
        })
        .mouseout(function (event) {
            $(event.target).removeClass(outlineElementClass);
            hoveredEvent = "";
        });
});