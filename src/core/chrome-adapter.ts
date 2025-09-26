import type { ChromeAPI, MinimalBrowserAPI } from '../platform/types'

type Callback<T> = (value: T) => void
type WindowsCreateArgs = Parameters<ChromeAPI['windows']['create']>[0]
type WindowsUpdateArgs = Parameters<ChromeAPI['windows']['update']>[1]
type TabsCreateArgs = Parameters<ChromeAPI['tabs']['create']>[0]
type TabsQueryArgs = Parameters<ChromeAPI['tabs']['query']>[0]
type TabsMessageOptions = Parameters<ChromeAPI['tabs']['sendMessage']>[2]
type ResponseCallback = (response: unknown) => void

export class ChromeAdapter {
  private toError (value: unknown): Error {
    if (value instanceof Error) return value
    return new Error(String(value))
  }

  private captureLastError (chromeApi: ChromeAPI): Error | undefined {
    const runtime = chromeApi.runtime as typeof chrome.runtime & { lastError?: { message?: string } }
    const message = runtime.lastError?.message
    return message ? new Error(message) : undefined
  }

  private wrapAsyncCall<Args extends unknown[], Result>(
    fn: (...args: [...Args, Callback<Result>]) => void,
    chromeApi: ChromeAPI
  ): ((...args: Args) => Promise<Result>) {
    return (...args: Args) => new Promise<Result>((resolve, reject) => {
      try {
        fn(...args, (value) => {
          const maybeError = this.captureLastError(chromeApi)
          if (maybeError) {
            reject(maybeError)
          } else {
            resolve(value)
          }
        })
      } catch (error) {
        reject(this.toError(error))
      }
    })
  }

  private normalizeSendMessageArgs (args: unknown[]): {
    callArgs: unknown[];
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

  private wrapSendMessage (
    send: (...args: unknown[]) => void,
    chromeApi: ChromeAPI
  ) {
    return (...args: unknown[]) => {
      const { callArgs, callback } = this.normalizeSendMessageArgs(args)
      return new Promise<unknown>((resolve, reject) => {
        const handler: ResponseCallback = (response) => {
          if (callback) {
            try {
              callback(response)
            } catch (callbackError) {
              console.error(callbackError)
            }
          }

          const maybeError = this.captureLastError(chromeApi)
          if (maybeError) {
            reject(maybeError)
          } else {
            resolve(response)
          }
        }

        try {
          send(...callArgs, handler)
        } catch (error) {
          reject(this.toError(error))
        }
      })
    }
  }

  private wrapContextMenusRemoveAll (chromeApi: ChromeAPI): () => Promise<void> {
    return () => new Promise((resolve, reject) => {
      try {
        chromeApi.contextMenus.removeAll(() => {
          const maybeError = this.captureLastError(chromeApi)
          if (maybeError) {
            reject(maybeError)
          } else {
            resolve()
          }
        })
      } catch (error) {
        reject(this.toError(error))
      }
    })
  }

  public adapt (chromeApi: ChromeAPI): MinimalBrowserAPI {
    const wrapWindowCreate = this.wrapAsyncCall<[
      WindowsCreateArgs
    ], chrome.windows.Window | undefined>(chromeApi.windows.create.bind(chromeApi.windows), chromeApi)

    const wrapWindowUpdate = this.wrapAsyncCall<[
      number,
      WindowsUpdateArgs
    ], chrome.windows.Window | undefined>(chromeApi.windows.update.bind(chromeApi.windows), chromeApi)

    const wrapTabsCreate = this.wrapAsyncCall<[
      TabsCreateArgs
    ], chrome.tabs.Tab | undefined>(chromeApi.tabs.create.bind(chromeApi.tabs), chromeApi)

    const wrapTabsQuery = this.wrapAsyncCall<[
      TabsQueryArgs
    ], chrome.tabs.Tab[]>(chromeApi.tabs.query.bind(chromeApi.tabs), chromeApi)

    const wrapRuntimeSendMessage = this.wrapSendMessage(
      chromeApi.runtime.sendMessage.bind(chromeApi.runtime) as (...args: unknown[]) => void,
      chromeApi
    ) as {
      (message: unknown, options?: chrome.runtime.MessageOptions): Promise<unknown>;
      (extensionId: string, message: unknown, options?: chrome.runtime.MessageOptions): Promise<unknown>;
    }

    const wrapTabsSendMessage = this.wrapSendMessage(
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
        removeAll: this.wrapContextMenusRemoveAll(chromeApi),
        create: chromeApi.contextMenus.create,
        onClicked: chromeApi.contextMenus.onClicked
      },
      commands: chromeApi.commands
    }
  }
}