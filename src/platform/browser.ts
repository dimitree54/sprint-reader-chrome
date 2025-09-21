import { wrapChromeToBrowserLike } from './wrap-chrome'
import type { BrowserContext, BrowserLike, ChromeAPI } from './types'

function resolveBrowser (): BrowserLike {
  if (typeof globalThis !== 'undefined') {
    const scope = globalThis as typeof globalThis & { browser?: BrowserLike, chrome?: ChromeAPI }
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

export const browser: BrowserContext = getBrowser()

export type { BrowserContext }
