import { loadPreferences } from './preferences'
import { useReaderStore } from './state/reader.store'
import { wordsToTokens } from './text-types'
import { decodeHtml, setWords, setWordsWithStreaming } from './text'
import { renderCurrentWord } from './render'
import { browserApi } from '../core/browser-api.service'
import { DEFAULTS } from '../config/defaults'
import { aiPreprocessingService } from '../preprocessing/ai-preprocessing.service'
import type { BackgroundMessage, BackgroundResponse } from '../common/messages'

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

async function getCurrentSelectionFromBackground() {
  try {
    const response = await browserApi.sendMessage({
      target: 'background',
      type: 'getCurrentSelection'
    } satisfies BackgroundMessage) as BackgroundResponse
    if (response && 'selection' in response) {
      return response.selection
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

  // Check if streaming should be used (when OpenAI API key is available)
  const shouldUseStreaming = await shouldEnableStreaming()
  const tokens = wordsToTokens(words)
  const setWordsFunction = shouldUseStreaming ? setWordsWithStreaming : setWords

  await setWordsFunction(tokens)

  // Update UI after text processing
  renderCurrentWord()
}

async function shouldEnableStreaming(): Promise<boolean> {
  try {
    return await aiPreprocessingService.isAvailable()
  } catch (error) {
    console.debug('Could not check AI preprocessing availability:', error)
    return false
  }
}
