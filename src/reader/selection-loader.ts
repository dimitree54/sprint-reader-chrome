import { readSelection } from '../common/storage'
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

  // Try to get current selection from background first (for popup text)
  let selection = await getCurrentSelectionFromBackground()

  // If no current selection or it's older than stored selection, use stored
  if (!selection) {
    selection = await readSelection()
  } else {
    // Compare with stored selection to use the more recent one
    const storedSelection = await readSelection()
    if (storedSelection && storedSelection.timestamp > selection.timestamp) {
      selection = storedSelection
    }
  }

  const rawText = selection?.text ? decodeHtml(selection.text) : ''
  const normalised = normaliseText(rawText)
  const words = normalised.length > 0 ? normalised.split(' ') : []

  setWords(words)
  renderCurrentWord()
}
