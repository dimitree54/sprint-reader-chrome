import type { ReaderMessage } from '../common/messages'
import { browser } from '../platform/browser'
import { loadSelectionContent } from './selection-loader'

export function registerMessageListener (): void {
  browser.runtime.onMessage.addListener((rawMessage: unknown) => {
    const message = rawMessage as ReaderMessage
    if (message.target !== 'reader') {
      return undefined
    }

    switch (message.type) {
      case 'refreshReader':
        loadSelectionContent().catch(console.error)
        return true
      default:
        return undefined
    }
  })
}
