import type { BackgroundMessage, RuntimeMessage } from '../common/messages'
import type { ReaderPreferences } from '../common/storage'
import { CONTEXT_MENU_TITLE } from './constants'
import { openReaderWindowSetup } from './reader-window'
import {
  selectionFromMessage
} from './selection'
import { getSelectionState } from './state'
import {
  ensurePreferencesLoaded,
  persistPreferences
} from './preferences'
import { authService } from '../auth'

export async function primeBackgroundState (): Promise<void> {
  await ensurePreferencesLoaded()
}

export async function handleBackgroundMessage (
  rawMessage: RuntimeMessage,
  _sender: unknown,
  sendResponse: (value?: unknown) => void
): Promise<boolean | undefined> {
  if (rawMessage.target !== 'background') {
    // Informational: message not intended for background
    return undefined
  }

  const message = rawMessage as BackgroundMessage

  switch (message.type) {
    case 'getSelection':
      selectionFromMessage(message)
      sendResponse({ ok: true })
      // Informational: selection message processed
      return true
    case 'openReaderFromContent':
      selectionFromMessage(message)
      await openReaderWindowSetup(message.selectionText, message.haveSelection, message.dirRTL)
      // Informational: reader opened from content script
      return true
    case 'openReaderFromContextMenu':
      await openReaderWindowSetup(message.selectionText, message.selectionText.length > 0, false)
      // Informational: reader opened from context menu
      return true
    case 'openReaderFromPopup': {
      const prefs = await ensurePreferencesLoaded()
      const nextPrefs: ReaderPreferences = {
        ...prefs,
        wordsPerMinute: message.wordsPerMinute,
        theme: message.theme ?? prefs.theme
      }
      await persistPreferences(nextPrefs)

      const providedText = message.selectionText?.trim() ?? ''
      if (providedText.length === 0) {
        // Informational: popup request processed but no text provided
        return true
      }

      await openReaderWindowSetup(providedText, true, false)
      // Informational: reader opened from popup
      return true
    }
    case 'getMenuEntryText':
      sendResponse({ menuEntryText: CONTEXT_MENU_TITLE })
      // Informational: menu entry text requested
      return true
    case 'getCurrentSelection':
      sendResponse({ selection: getSelectionState() })
      // Informational: current selection requested
      return true
    case 'triggerAuthFlow': {
      if (message.flow !== 'register') {
        sendResponse({ authStarted: false, error: `Unsupported auth flow: ${message.flow}` })
        return true
      }

      authService
        .login()
        .catch((error) => {
          console.error('Background failed to trigger registration flow:', error)
        })

      sendResponse({ authStarted: true })
      return true
    }
    default:
      // Informational: unknown message type
      return undefined
  }
}
