import type { ReaderMessage } from '../common/messages'
import { browserApi } from '../core/browser-api.service'
import { loadSelectionContent } from './selection-loader'

export function registerMessageListener (): void {
  browserApi.runtime.onMessage.addListener((rawMessage: unknown) => {
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
