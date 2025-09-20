import type { BackgroundMessage, RuntimeMessage } from '../common/messages'
import type { ReaderPreferences } from '../common/storage'
import { CONTEXT_MENU_TITLE } from './constants'
import { openReaderWindowSetup } from './reader-window'
import {
  ensureSelectionLoaded,
  selectionFromMessage
} from './selection'
import {
  ensurePreferencesLoaded,
  persistPreferences
} from './preferences'

export async function primeBackgroundState (): Promise<void> {
  await Promise.all([
    ensureSelectionLoaded(),
    ensurePreferencesLoaded()
  ])
}

export async function handleBackgroundMessage (
  rawMessage: RuntimeMessage,
  _sender: unknown,
  sendResponse: (value?: unknown) => void
): Promise<boolean | undefined> {
  if (rawMessage.target !== 'background') {
    return undefined
  }

  const message = rawMessage as BackgroundMessage

  switch (message.type) {
    case 'getSelection':
      selectionFromMessage(message)
      sendResponse({ ok: true })
      return true
    case 'openReaderFromContent':
      selectionFromMessage(message)
      await openReaderWindowSetup(true, message.selectionText, message.haveSelection, message.dirRTL)
      return true
    case 'openReaderFromContextMenu':
      await openReaderWindowSetup(true, message.selectionText, message.selectionText.length > 0, false)
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
        return true
      }

      await openReaderWindowSetup(false, providedText, true, false)
      return true
    }
    case 'getMenuEntryText':
      sendResponse({ menuEntryText: CONTEXT_MENU_TITLE })
      return true
    default:
      return undefined
  }
}
