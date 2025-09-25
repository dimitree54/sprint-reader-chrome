import { loadPreferences } from './preferences'
import { state } from './state'
import { wordsToTokens } from './text-types'
import { decodeHtml, setWords, setWordsWithStreaming } from './text'
import { renderCurrentWord } from './render'
import { browser } from '../platform/browser'
import { DEFAULTS } from '../config/defaults'
import type { BackgroundMessage } from '../common/messages'

function normaliseText (rawText: string): string {
  return rawText.replace(/\s+/g, ' ').trim()
}

function syncControls (): void {
  const slider = document.getElementById('sliderWpm') as HTMLInputElement | null
  if (slider) {
    slider.value = String(state.wordsPerMinute)
  }

  const wpmValue = document.getElementById('wpmValue')
  if (wpmValue) {
    wpmValue.textContent = String(state.wordsPerMinute)
  }

  const themeToggle = document.getElementById('toggleTheme') as HTMLInputElement | null
  if (themeToggle) {
    themeToggle.checked = state.theme === DEFAULTS.THEMES.light
  }
}

async function getCurrentSelectionFromBackground() {
  try {
    const response = await (browser.runtime.sendMessage as (message: BackgroundMessage) => Promise<{ selection: { text: string; hasSelection: boolean; isRTL: boolean; timestamp: number } }>)({
      target: 'background',
      type: 'getCurrentSelection'
    } satisfies BackgroundMessage)
    return response?.selection
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
    const { readOpenAIApiKey } = await import('../common/storage')
    const apiKey = await readOpenAIApiKey()
    return !!apiKey && apiKey.length > 0
  } catch (error) {
    console.debug('Could not check API key for streaming:', error)
    return false
  }
}
