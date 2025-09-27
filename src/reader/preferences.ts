import {
  readReaderPreferences,
  writeReaderPreferences
} from '../common/storage'
import { applyThemeToElement } from '../common/theme'
import { DEFAULTS } from '../config/defaults'
import { useReaderStore } from './state/reader.store'

const THEME_OPTIONS = {
  lightClass: 'reader--light',
  darkClass: 'reader--dark'
} as const

export async function loadPreferences (): Promise<void> {
  const prefs = await readReaderPreferences()
  useReaderStore.setState({
    wordsPerMinute: prefs.wordsPerMinute,
    pauseAfterComma: prefs.pauseAfterComma,
    pauseAfterPeriod: prefs.pauseAfterPeriod,
    pauseAfterParagraph: prefs.pauseAfterParagraph,
    chunkSize: prefs.chunkSize,
    wordFlicker: prefs.wordFlicker,
    wordFlickerPercent: prefs.wordFlickerPercent,
    theme: prefs.theme
  })

  applyThemeToElement(document.body, prefs.theme, THEME_OPTIONS)
}

export function persistPreferences (): void {
  const store = useReaderStore.getState()
  writeReaderPreferences({
    wordsPerMinute: store.wordsPerMinute,
    pauseAfterComma: store.pauseAfterComma,
    pauseAfterPeriod: store.pauseAfterPeriod,
    pauseAfterParagraph: store.pauseAfterParagraph,
    chunkSize: store.chunkSize,
    wordFlicker: store.wordFlicker,
    wordFlickerPercent: store.wordFlickerPercent,
    theme: store.theme
  }).catch(console.error)
}

export function syncThemeToggle (checked: boolean): void {
  const theme = checked ? DEFAULTS.THEMES.light : DEFAULTS.THEMES.dark
  applyThemeToElement(document.body, theme, THEME_OPTIONS)
  useReaderStore.setState({ theme })
}
