import {
  readReaderPreferences,
  writeReaderPreferences
} from '../common/storage'
import { state } from './state'
import { applyThemeToElement } from '../common/theme'
import { DEFAULTS } from '../config/defaults'

const THEME_OPTIONS = {
  lightClass: 'reader--light',
  darkClass: 'reader--dark'
} as const

export async function loadPreferences (): Promise<void> {
  const prefs = await readReaderPreferences()
  state.wordsPerMinute = prefs.wordsPerMinute
  state.pauseAfterComma = prefs.pauseAfterComma
  state.pauseAfterPeriod = prefs.pauseAfterPeriod
  state.pauseAfterParagraph = prefs.pauseAfterParagraph
  state.chunkSize = prefs.chunkSize
  state.wordFlicker = prefs.wordFlicker
  state.wordFlickerPercent = prefs.wordFlickerPercent
  state.theme = prefs.theme

  applyThemeToElement(document.body, state.theme, THEME_OPTIONS)
}

export function persistPreferences (): void {
  writeReaderPreferences({
    wordsPerMinute: state.wordsPerMinute,
    pauseAfterComma: state.pauseAfterComma,
    pauseAfterPeriod: state.pauseAfterPeriod,
    pauseAfterParagraph: state.pauseAfterParagraph,
    chunkSize: state.chunkSize,
    wordFlicker: state.wordFlicker,
    wordFlickerPercent: state.wordFlickerPercent,
    theme: state.theme
  }).catch(console.error)
}

export function syncThemeToggle (checked: boolean): void {
  state.theme = checked ? DEFAULTS.THEMES.light : DEFAULTS.THEMES.dark
  applyThemeToElement(document.body, state.theme, THEME_OPTIONS)
}
