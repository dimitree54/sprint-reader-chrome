export type ChromeAPI = typeof chrome

type MaybePromise<T> = T | Promise<T>

export interface MinimalBrowserAPI {
  runtime: {
    getURL: ChromeAPI['runtime']['getURL'];
    getManifest: ChromeAPI['runtime']['getManifest'];
    onMessage: ChromeAPI['runtime']['onMessage'];
    onInstalled: ChromeAPI['runtime']['onInstalled'];
    sendMessage (message: unknown, options?: chrome.runtime.MessageOptions): MaybePromise<unknown>;
    sendMessage (extensionId: string, message: unknown, options?: chrome.runtime.MessageOptions): MaybePromise<unknown>;
  };
  storage: ChromeAPI['storage'];
  windows: {
    create: (createData: Parameters<ChromeAPI['windows']['create']>[0]) => MaybePromise<chrome.windows.Window | undefined>;
    update: (windowId: number, updateInfo: Parameters<ChromeAPI['windows']['update']>[1]) => MaybePromise<chrome.windows.Window | undefined>;
    onRemoved: ChromeAPI['windows']['onRemoved'];
  };
  tabs: {
    create: (createProperties: Parameters<ChromeAPI['tabs']['create']>[0]) => MaybePromise<chrome.tabs.Tab | undefined>;
    query: (queryInfo: Parameters<ChromeAPI['tabs']['query']>[0]) => MaybePromise<chrome.tabs.Tab[]>;
    sendMessage (tabId: number, message: unknown, options?: chrome.tabs.MessageSendOptions): MaybePromise<unknown>;
    sendMessage (
      tabId: number,
      message: unknown,
      responseCallback: (response: unknown) => void
    ): MaybePromise<unknown>;
  };
  contextMenus: {
    removeAll: () => MaybePromise<void>;
    create: ChromeAPI['contextMenus']['create'];
    onClicked: ChromeAPI['contextMenus']['onClicked'];
  };
  commands: ChromeAPI['commands'];
}

export type BrowserLike = typeof globalThis extends { browser: infer B } ? B : MinimalBrowserAPI
export type BrowserContext = BrowserLike | ChromeAPI
