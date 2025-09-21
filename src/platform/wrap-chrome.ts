import type { ChromeAPI, MinimalBrowserAPI } from './types'

type Callback<T> = (value: T) => void


type WindowsCreateArgs = Parameters<ChromeAPI['windows']['create']>[0]

type WindowsUpdateArgs = Parameters<ChromeAPI['windows']['update']>[1]

type TabsCreateArgs = Parameters<ChromeAPI['tabs']['create']>[0]

type TabsQueryArgs = Parameters<ChromeAPI['tabs']['query']>[0]

type TabsMessageOptions = Parameters<ChromeAPI['tabs']['sendMessage']>[2]

type RuntimeMessageOptions = chrome.runtime.MessageOptions

type ResponseCallback = (response: unknown) => void

type SendMessageArgs = [...unknown[]]

const toError = (value: unknown): Error => {
  if (value instanceof Error) return value
  return new Error(String(value))
}

const captureLastError = (chromeApi: ChromeAPI): Error | undefined => {
  const runtime = chromeApi.runtime as typeof chrome.runtime & { lastError?: { message?: string } }
  const message = runtime.lastError?.message
  return message ? new Error(message) : undefined
}

const wrapAsyncCall = <Args extends unknown[], Result>(
  fn: (...args: [...Args, Callback<Result>]) => void,
  chromeApi: ChromeAPI
): ((...args: Args) => Promise<Result>) => {
  return (...args: Args) => new Promise<Result>((resolve, reject) => {
    try {
      fn(...args, (value) => {
        const maybeError = captureLastError(chromeApi)
        if (maybeError) {
          reject(maybeError)
        } else {
          resolve(value)
        }
      })
    } catch (error) {
      reject(toError(error))
    }
  })
}

function normalizeSendMessageArgs (args: SendMessageArgs): {
  callArgs: SendMessageArgs;
  callback: ResponseCallback | undefined;
} {
  const callArgs = [...args]
  const maybeCallback = callArgs[callArgs.length - 1]
  if (typeof maybeCallback === 'function') {
    callArgs.pop()
    return { callArgs, callback: maybeCallback as ResponseCallback }
  }
  return { callArgs, callback: undefined }
}

function wrapSendMessage(
  send: (...args: unknown[]) => void,
  chromeApi: ChromeAPI
) {
  return (...args: unknown[]) => {
    const { callArgs, callback } = normalizeSendMessageArgs(args)
    return new Promise<unknown>((resolve, reject) => {
      const handler: ResponseCallback = (response) => {
        if (callback) {
          try {
            callback(response)
          } catch (callbackError) {
            console.error(callbackError)
          }
        }

        const maybeError = captureLastError(chromeApi)
        if (maybeError) {
          reject(maybeError)
        } else {
          resolve(response)
        }
      }

      try {
        send(...callArgs, handler)
      } catch (error) {
        reject(toError(error))
      }
    })
  }
}

function wrapContextMenusRemoveAll (chromeApi: ChromeAPI): () => Promise<void> {
  return () => new Promise((resolve, reject) => {
    try {
      chromeApi.contextMenus.removeAll(() => {
        const maybeError = captureLastError(chromeApi)
        if (maybeError) {
          reject(maybeError)
        } else {
          resolve()
        }
      })
    } catch (error) {
      reject(toError(error))
    }
  })
}

export function wrapChromeToBrowserLike (chromeApi: ChromeAPI): MinimalBrowserAPI {
  const wrapWindowCreate = wrapAsyncCall<[
    WindowsCreateArgs
  ], chrome.windows.Window | undefined>(chromeApi.windows.create.bind(chromeApi.windows), chromeApi)

  const wrapWindowUpdate = wrapAsyncCall<[
    number,
    WindowsUpdateArgs
  ], chrome.windows.Window | undefined>(chromeApi.windows.update.bind(chromeApi.windows), chromeApi)

  const wrapTabsCreate = wrapAsyncCall<[
    TabsCreateArgs
  ], chrome.tabs.Tab | undefined>(chromeApi.tabs.create.bind(chromeApi.tabs), chromeApi)

  const wrapTabsQuery = wrapAsyncCall<[
    TabsQueryArgs
  ], chrome.tabs.Tab[]>(chromeApi.tabs.query.bind(chromeApi.tabs), chromeApi)

  const wrapRuntimeSendMessage = wrapSendMessage(
    chromeApi.runtime.sendMessage.bind(chromeApi.runtime) as (...args: unknown[]) => void,
    chromeApi
  ) as {
    (message: unknown, options?: RuntimeMessageOptions): Promise<unknown>;
    (extensionId: string, message: unknown, options?: RuntimeMessageOptions): Promise<unknown>;
  }

  const wrapTabsSendMessage = wrapSendMessage(
    chromeApi.tabs.sendMessage.bind(chromeApi.tabs) as (...args: unknown[]) => void,
    chromeApi
  ) as {
    (tabId: number, message: unknown, options?: TabsMessageOptions): Promise<unknown>;
    (tabId: number, message: unknown, callback: ResponseCallback): Promise<unknown>;
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
      removeAll: wrapContextMenusRemoveAll(chromeApi),
      create: chromeApi.contextMenus.create,
      onClicked: chromeApi.contextMenus.onClicked
    },
    commands: chromeApi.commands
  }
}
