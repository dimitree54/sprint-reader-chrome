//------------------------------------------------------------------------------
//
//  SPRINT READER
//  Speed Reading Extension for Google Chrome
//  Copyright (c) 2013-2025, Anthony Nosek
//  https://github.com/anthonynosek/sprint-reader-chrome/blob/master/LICENSE
//
//------------------------------------------------------------------------------

// Initialise the popup (popup.html) screen
// This screen (popup.html) is opened when the user clicks on the
// Sprint Reader icon located in the top right corner of the
// Google Chrome screen.
function init() {
    displayVersion();
    setTabHeight();
}

function setTabHeight() {
    const windowHeight = Math.min(window.innerHeight, 600);
    
    // Set the tab control height
    const tabHeight = `${Math.round(windowHeight - 5)}px`;
    document.querySelector(".tabbable").style.height = tabHeight;
    
    // Set the tab content height based on the size of the window
    const tabContentHeight = `${Math.round(windowHeight - 70)}px`;
    document.querySelector(".tab-content").style.height = tabContentHeight;
}

// Open the reader window when a user clicks on the reader link
function setupReaderLink() {
    const openReaderLink = document.getElementById("openReader");
    openReaderLink.addEventListener("click", async (event) => {
        event.preventDefault();
        await chrome.runtime.sendMessage({
            target: "background",
            type: "openReaderFromPopup",
        });
        window.close();
    });
}

document.addEventListener("DOMContentLoaded", () => {
    init();
    setupReaderLink();
});