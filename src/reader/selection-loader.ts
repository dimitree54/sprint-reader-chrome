import { loadPreferences } from './preferences'
import { useReaderStore } from './state/reader.store'
import { wordsToTokens } from './text-types'
import { decodeHtml, startStreamingFromTokens } from './text'
import { browserApi } from '../core/browser-api.service'
import { DEFAULTS } from '../config/defaults'
// aiPreprocessingService availability is handled within streaming manager
import type { BackgroundMessage } from '../common/messages'

function normaliseText (rawText: string): string {
  return rawText.replace(/\s+/g, ' ').trim()
}

function syncControls (): void {
  const store = useReaderStore.getState()
  const slider = document.getElementById('sliderWpm') as HTMLInputElement | null
  if (slider) {
    slider.value = String(store.wordsPerMinute)
  }

  const wpmValue = document.getElementById('wpmValue')
  if (wpmValue) {
    wpmValue.textContent = String(store.wordsPerMinute)
  }

  const themeToggle = document.getElementById('toggleTheme') as HTMLInputElement | null
  if (themeToggle) {
    themeToggle.checked = store.theme === DEFAULTS.THEMES.light
  }
}

async function getCurrentSelectionFromBackground(): Promise<{ text: string; hasSelection: boolean; isRTL: boolean; timestamp: number } | null> {
  try {
    const response = await Promise.race([
      browserApi.sendMessage({
        target: 'background',
        type: 'getCurrentSelection'
      } satisfies BackgroundMessage),
      new Promise((_resolve, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
    ])

    if (response && typeof response === 'object' && 'selection' in response && response.selection && typeof response.selection === 'object') {
      return response.selection as { text: string; hasSelection: boolean; isRTL: boolean; timestamp: number };
    }
    return null
  } catch (error) {
    console.warn('Failed to get current selection from background:', error)
    return null
  }
}

export async function loadSelectionContent (): Promise<void> {
  await loadPreferences()
  syncControls()

  // Always get current selection from background (no persistence)
  const selection = await getCurrentSelectionFromBackground()

  const rawText = selection?.text ? decodeHtml(selection.text) : ''
  const normalised = normaliseText(rawText)
  const words = normalised.length > 0 ? normalised.split(' ') : []

  const tokens = wordsToTokens(words)

  // Guard empty selections: reset store state instead of streaming
  if (tokens.length === 0) {
    useReaderStore.getState().reset()
    return
  }

  await startStreamingFromTokens(
    tokens,
    selection?.text ? decodeHtml(selection.text) : ''
  )
}

// Streaming is always used; availability is handled inside the streaming manager
