import type { BrowserContext, BrowserLike } from './types'
import { browserApi } from '../core/browser-api.service'

// Backwards-compatible surface that now delegates to BrowserApiService
export function getBrowser (): BrowserLike {
  return browserApi.getBrowser() as BrowserLike
}

export const browser: BrowserContext = browserApi.getBrowserContext()

export type { BrowserContext }
