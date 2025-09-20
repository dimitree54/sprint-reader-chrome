type ChromeAPI = typeof chrome;

type MaybePromise<T> = T | Promise<T>;

interface MinimalBrowserAPI {
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

type BrowserLike = typeof globalThis extends { browser: infer B } ? B : MinimalBrowserAPI;

export type BrowserContext = BrowserLike | ChromeAPI;

function wrapChromeToBrowserLike (chromeApi: ChromeAPI): MinimalBrowserAPI {
  const getLastError = (): Error | undefined => {
    const { lastError } = chromeApi.runtime as typeof chromeApi.runtime & { lastError?: { message?: string } };
    if (lastError?.message) {
      return new Error(lastError.message);
    }
    return undefined;
  };

  const wrapWindowCreate = (
    createData: Parameters<ChromeAPI['windows']['create']>[0]
  ): Promise<chrome.windows.Window | undefined> =>
    new Promise((resolve, reject) => {
      try {
        chromeApi.windows.create(createData, window => {
          const maybeError = getLastError();
          if (maybeError) {
            reject(maybeError);
          } else {
            resolve(window ?? undefined);
          }
        });
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });

  const wrapWindowUpdate = (
    windowId: number,
    updateInfo: Parameters<ChromeAPI['windows']['update']>[1]
  ): Promise<chrome.windows.Window | undefined> =>
    new Promise((resolve, reject) => {
      try {
        chromeApi.windows.update(windowId, updateInfo, window => {
          const maybeError = getLastError();
          if (maybeError) {
            reject(maybeError);
          } else {
            resolve(window ?? undefined);
          }
        });
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });

  const wrapTabsCreate = (
    createProperties: Parameters<ChromeAPI['tabs']['create']>[0]
  ): Promise<chrome.tabs.Tab | undefined> =>
    new Promise((resolve, reject) => {
      try {
        chromeApi.tabs.create(createProperties, tab => {
          const maybeError = getLastError();
          if (maybeError) {
            reject(maybeError);
          } else {
            resolve(tab ?? undefined);
          }
        });
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });

  const wrapTabsQuery = (
    queryInfo: Parameters<ChromeAPI['tabs']['query']>[0]
  ): Promise<chrome.tabs.Tab[]> =>
    new Promise((resolve, reject) => {
      try {
        chromeApi.tabs.query(queryInfo, tabs => {
          const maybeError = getLastError();
          if (maybeError) {
            reject(maybeError);
          } else {
            resolve(tabs);
          }
        });
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });

  const wrapContextMenusRemoveAll = (): Promise<void> =>
    new Promise((resolve, reject) => {
      try {
        chromeApi.contextMenus.removeAll(() => {
          const maybeError = getLastError();
          if (maybeError) {
            reject(maybeError);
          } else {
            resolve();
          }
        });
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });

  function wrapRuntimeSendMessage (message: unknown, options?: chrome.runtime.MessageOptions): Promise<unknown>
  function wrapRuntimeSendMessage (extensionId: string, message: unknown, options?: chrome.runtime.MessageOptions): Promise<unknown>
  function wrapRuntimeSendMessage (...args: unknown[]): Promise<unknown> {
    const callArgs = [...args];
    let userCallback: ((response: unknown) => void) | undefined;
    if (callArgs.length > 0) {
      const maybeCallback = callArgs[callArgs.length - 1];
      if (typeof maybeCallback === 'function') {
        userCallback = maybeCallback as (response: unknown) => void;
        callArgs.pop();
      }
    }

    return new Promise((resolve, reject) => {
      const handler = (response: unknown) => {
        if (userCallback) {
          try {
            userCallback(response);
          } catch (callbackError) {
            console.error(callbackError);
          }
        }

        const maybeError = getLastError();
        if (maybeError) {
          reject(maybeError);
        } else {
          resolve(response);
        }
      };

      try {
        (chromeApi.runtime.sendMessage as (...inner: unknown[]) => void)(...callArgs, handler);
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  function wrapTabsSendMessage (tabId: number, message: unknown, options?: chrome.tabs.MessageSendOptions): Promise<unknown>
  function wrapTabsSendMessage (tabId: number, message: unknown, responseCallback: (response: unknown) => void): Promise<unknown>
  function wrapTabsSendMessage (...args: unknown[]): Promise<unknown> {
    const callArgs = [...args];
    let userCallback: ((response: unknown) => void) | undefined;
    if (callArgs.length > 0) {
      const maybeCallback = callArgs[callArgs.length - 1];
      if (typeof maybeCallback === 'function') {
        userCallback = maybeCallback as (response: unknown) => void;
        callArgs.pop();
      }
    }

    return new Promise((resolve, reject) => {
      const handler = (response: unknown) => {
        if (userCallback) {
          try {
            userCallback(response);
          } catch (callbackError) {
            console.error(callbackError);
          }
        }

        const maybeError = getLastError();
        if (maybeError) {
          reject(maybeError);
        } else {
          resolve(response);
        }
      };

      try {
        (chromeApi.tabs.sendMessage as (...inner: unknown[]) => void)(...callArgs, handler);
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  return {
    runtime: {
      getURL: chromeApi.runtime.getURL.bind(chromeApi.runtime),
      getManifest: chromeApi.runtime.getManifest.bind(chromeApi.runtime),
      onMessage: chromeApi.runtime.onMessage,
      onInstalled: chromeApi.runtime.onInstalled,
      sendMessage: wrapRuntimeSendMessage
    },
    storage: chromeApi.storage,
    windows: {
      create: wrapWindowCreate,
      update: wrapWindowUpdate,
      onRemoved: chromeApi.windows.onRemoved
    },
    tabs: {
      create: wrapTabsCreate,
      query: wrapTabsQuery,
      sendMessage: wrapTabsSendMessage
    },
    contextMenus: {
      removeAll: wrapContextMenusRemoveAll,
      create: chromeApi.contextMenus.create,
      onClicked: chromeApi.contextMenus.onClicked
    },
    commands: chromeApi.commands
  };
}

function resolveBrowser (): BrowserLike {
  if (typeof globalThis !== 'undefined') {
    const scope = globalThis as typeof globalThis & { browser?: BrowserLike; chrome?: ChromeAPI };
    if (typeof scope.browser !== 'undefined') {
      return scope.browser as BrowserLike
    }
    if (typeof scope.chrome !== 'undefined') {
      return wrapChromeToBrowserLike(scope.chrome)
    }
  }
  throw new Error('WebExtension runtime is not available in this context.')
}

let cachedBrowser: BrowserLike | undefined

export function getBrowser (): BrowserLike {
  if (!cachedBrowser) {
    cachedBrowser = resolveBrowser()
  }
  return cachedBrowser
}
