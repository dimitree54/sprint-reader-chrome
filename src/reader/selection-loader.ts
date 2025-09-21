import { loadPreferences } from './preferences'
import { renderCurrentWord } from './render'
import { state } from './state'
import { decodeHtml, setWords } from './text'
import { browser } from '../platform/browser'
import { DEFAULTS } from '../config/defaults'

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
    const response = await (browser.runtime.sendMessage as any)({
      target: 'background',
      type: 'getCurrentSelection'
    })
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

  await setWords(words)
  renderCurrentWord()
}
