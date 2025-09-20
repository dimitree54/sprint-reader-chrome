type ChromeAPI = typeof chrome;

type MaybePromise<T> = T | Promise<T>;

interface MinimalBrowserAPI {
  runtime: {
    getURL: ChromeAPI['runtime']['getURL'];
    sendMessage: (...args: Parameters<ChromeAPI['runtime']['sendMessage']>) => MaybePromise<unknown>;
    getManifest: ChromeAPI['runtime']['getManifest'];
    onMessage: ChromeAPI['runtime']['onMessage'];
    onInstalled: ChromeAPI['runtime']['onInstalled'];
  };
  storage: ChromeAPI['storage'];
  windows: {
    create: (...args: Parameters<ChromeAPI['windows']['create']>) => MaybePromise<chrome.windows.Window | undefined>;
    update: (windowId: number, updateInfo: Parameters<ChromeAPI['windows']['update']>[1]) => MaybePromise<chrome.windows.Window | undefined>;
    onRemoved: ChromeAPI['windows']['onRemoved'];
  };
  tabs: {
    create: (...args: Parameters<ChromeAPI['tabs']['create']>) => MaybePromise<chrome.tabs.Tab | undefined>;
    query: ChromeAPI['tabs']['query'];
    sendMessage: (
      tabId: number,
      message: Parameters<ChromeAPI['tabs']['sendMessage']>[1],
      options?: Parameters<ChromeAPI['tabs']['sendMessage']>[2]
    ) => MaybePromise<unknown>;
  };
  contextMenus: {
    removeAll: () => MaybePromise<void>;
    create: ChromeAPI['contextMenus']['create'];
    onClicked: ChromeAPI['contextMenus']['onClicked'];
  };
  commands: ChromeAPI['commands'];
}

type BrowserLike = typeof globalThis extends { browser: infer B } ? B : MinimalBrowserAPI;

export type BrowserContext = typeof chrome extends undefined ? BrowserLike : ChromeAPI;

function resolveBrowser (): BrowserContext {
  if (typeof globalThis !== 'undefined') {
    if (typeof (globalThis as typeof globalThis & { browser?: BrowserContext }).browser !== 'undefined') {
      return (globalThis as typeof globalThis & { browser: BrowserContext }).browser
    }
    if (typeof (globalThis as typeof globalThis & { chrome?: BrowserContext }).chrome !== 'undefined') {
      return (globalThis as typeof globalThis & { chrome: BrowserContext }).chrome
    }
  }
  throw new Error('WebExtension runtime is not available in this context.')
}

let cachedBrowser: BrowserContext | undefined

export function getBrowser (): BrowserContext {
  if (!cachedBrowser) {
    cachedBrowser = resolveBrowser()
  }
  return cachedBrowser
}
