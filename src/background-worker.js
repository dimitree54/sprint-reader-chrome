//------------------------------------------------------------------------------
//
// 	SPRINT READER
//	Speed Reading Extension for Google Chrome
//	Copyright (c) 2013-2025, Anthony Nosek
//	https://github.com/anthonynosek/sprint-reader-chrome/blob/master/LICENSE
//
//------------------------------------------------------------------------------

try {
    self.importScripts("../lib/browser-polyfill.js", "background.js");
    console.log('[Sprint Reader] Background worker initialised');
} catch (e) {
    console.error("[Sprint Reader] Error initiating background worker");
    console.error(e);
}

self.addEventListener("install", (event) => {
    console.log("[Sprint Reader] Service Worker installed");
});

self.addEventListener("activate", (event) => {
    console.log("[Sprint Reader] Service Worker activated");
});

self.addEventListener("error", (error) => {
    console.error("[Sprint Reader] Service Worker error:", error);
});

self.addEventListener("unhandledrejection", (event) => {
    console.error("[Sprint Reader] Unhandled rejection in Service Worker:", event.reason);
});
