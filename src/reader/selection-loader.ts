import { readSelection } from '../common/storage'
import { loadPreferences } from './preferences'
import { renderCurrentWord } from './render'
import { state } from './state'
import { decodeHtml, setWords } from './text'

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
    themeToggle.checked = state.theme === 'light'
  }
}

export async function loadSelectionContent (): Promise<void> {
  await loadPreferences()
  syncControls()

  const selection = await readSelection()
  const rawText = selection?.text ? decodeHtml(selection.text) : ''
  const normalised = normaliseText(rawText)
  const words = normalised.length > 0 ? normalised.split(' ') : []

  setWords(words)
  renderCurrentWord()
}
