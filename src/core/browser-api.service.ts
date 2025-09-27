import type { ChromeAPI, MinimalBrowserAPI, BrowserContext } from './browser-types'
import { ChromeAdapter } from './chrome-adapter'

type WindowsCreateArgs = Parameters<ChromeAPI['windows']['create']>[0]
type WindowsUpdateArgs = Parameters<ChromeAPI['windows']['update']>[1]
type TabsCreateArgs = Parameters<ChromeAPI['tabs']['create']>[0]
type TabsQueryArgs = Parameters<ChromeAPI['tabs']['query']>[0]
type TabsMessageOptions = Parameters<ChromeAPI['tabs']['sendMessage']>[2]

export class BrowserApiService {
  private static instance: BrowserApiService | null = null
  private cachedBrowser: MinimalBrowserAPI | null = null
  private chromeAdapter = new ChromeAdapter()

  static getInstance (): BrowserApiService {
    if (!this.instance) this.instance = new BrowserApiService()
    return this.instance
  }

  // Test-only: allow unit tests to reset singleton and cache
  static __resetForTests (): void {
    this.instance = null
  }

  // Public surface ---------------------------------------------------------

  public getBrowser (): MinimalBrowserAPI {
    if (!this.cachedBrowser) {
      this.cachedBrowser = this.resolveBrowser()
    }
    return this.cachedBrowser
  }

  public getBrowserContext (): BrowserContext {
    return this.getBrowser()
  }

  // runtime
  public get runtime () {
    return this.getBrowser().runtime
  }

  public async sendMessage (message: unknown, options?: chrome.runtime.MessageOptions): Promise<unknown>
  public async sendMessage (extensionId: string, message: unknown, options?: chrome.runtime.MessageOptions): Promise<unknown>
  public async sendMessage (
    messageOrExtensionId: unknown,
    messageOrOptions?: unknown,
    options?: chrome.runtime.MessageOptions
  ): Promise<unknown> {
    const browser = this.getBrowser()
    if (typeof messageOrExtensionId === 'string' && messageOrOptions !== undefined) {
      return browser.runtime.sendMessage(messageOrExtensionId, messageOrOptions, options)
    } else {
      return browser.runtime.sendMessage(messageOrExtensionId, messageOrOptions as chrome.runtime.MessageOptions | undefined)
    }
  }

  // windows
  public async createWindow (createData: WindowsCreateArgs): Promise<chrome.windows.Window | undefined> {
    return this.getBrowser().windows.create(createData)
  }

  public async updateWindow (windowId: number, updateInfo: WindowsUpdateArgs): Promise<chrome.windows.Window | undefined> {
    return this.getBrowser().windows.update(windowId, updateInfo)
  }

  public get onWindowRemoved () {
    return this.getBrowser().windows.onRemoved
  }

  // tabs
  public async createTab (props: TabsCreateArgs): Promise<chrome.tabs.Tab | undefined> {
    return this.getBrowser().tabs.create(props)
  }

  public async queryTabs (query: TabsQueryArgs): Promise<chrome.tabs.Tab[]> {
    return this.getBrowser().tabs.query(query)
  }

  public async sendTabMessage (
    tabId: number, message: unknown, options?: TabsMessageOptions
  ): Promise<unknown> {
    return this.getBrowser().tabs.sendMessage(tabId, message, options)
  }

  // storage helpers (local)
  public async getStorage<T = unknown>(keys: string[]): Promise<Partial<Record<string, T>>> {
    const browser = this.getBrowser()
    if ('storage' in browser && 'local' in browser.storage && 'get' in browser.storage.local) {
      return new Promise<Partial<Record<string, T>>>((resolve, reject) => {
        try {
          browser.storage.local.get(keys, (items: Record<string, T>) => {
            const lastError = (browser.runtime as typeof browser.runtime & { lastError?: { message?: string } }).lastError
            if (lastError?.message) return reject(new Error(lastError.message))
            resolve(items)
          })
        } catch (e) {
          reject(e instanceof Error ? e : new Error(String(e)))
        }
      })
    }
    return {}
  }

  public async setStorage (items: Record<string, unknown>): Promise<void> {
    const browser = this.getBrowser()
    if ('storage' in browser && 'local' in browser.storage && 'set' in browser.storage.local) {
      await new Promise<void>((resolve, reject) => {
        try {
          browser.storage.local.set(items, () => {
            const lastError = (browser.runtime as typeof browser.runtime & { lastError?: { message?: string } }).lastError
            if (lastError?.message) return reject(new Error(lastError.message))
            resolve()
          })
        } catch (e) {
          reject(e instanceof Error ? e : new Error(String(e)))
        }
      })
    }
  }

  // context menus
  public async contextMenusRemoveAll (): Promise<void> {
    await this.wrapContextMenusRemoveAll()()
  }

  public contextMenusCreate: MinimalBrowserAPI['contextMenus']['create'] = ((createProps) => {
    return this.getBrowser().contextMenus.create(createProps)
  }) as MinimalBrowserAPI['contextMenus']['create']

  public get onContextMenuClicked () {
    return this.getBrowser().contextMenus.onClicked
  }

  public get commands () {
    return this.getBrowser().commands
  }

  // Internal helpers -------------------------------------------------------

  private resolveBrowser (): MinimalBrowserAPI {
    if (typeof globalThis !== 'undefined') {
      const scope = globalThis as typeof globalThis & { browser?: MinimalBrowserAPI, chrome?: ChromeAPI }
      if (typeof scope.browser !== 'undefined') {
        return scope.browser as MinimalBrowserAPI
      }
      if (typeof scope.chrome !== 'undefined') {
        return this.chromeAdapter.adapt(scope.chrome)
      }
    }
    throw new Error('WebExtension runtime is not available in this context.')
  }

  public adaptChrome (chromeApi: ChromeAPI): MinimalBrowserAPI {
    return this.chromeAdapter.adapt(chromeApi)
  }

  private wrapContextMenusRemoveAll (chromeApi?: ChromeAPI): () => Promise<void> {
    const api = chromeApi ?? (globalThis as typeof globalThis & { chrome?: ChromeAPI }).chrome
    if (!api) {
      // use resolved browser if chrome is not available (e.g. Firefox)
      const browser = this.getBrowser()
      return () => Promise.resolve(browser.contextMenus.removeAll())
    }
    const removeAll = this.chromeAdapter.adapt(api).contextMenus.removeAll
    return () => Promise.resolve(removeAll())
  }
}

export const browserApi = BrowserApiService.getInstance()
