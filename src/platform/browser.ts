export type BrowserContext = typeof chrome extends undefined ? any : typeof chrome;

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
