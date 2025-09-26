import type { ChromeAPI, MinimalBrowserAPI } from './types'
import { browserApi } from '../core/browser-api.service'

// Back-compat thin wrapper delegating to BrowserApiService
export function wrapChromeToBrowserLike (chromeApi: ChromeAPI): MinimalBrowserAPI {
  return browserApi.adaptChrome(chromeApi)
}
