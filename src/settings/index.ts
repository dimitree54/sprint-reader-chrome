import { applyThemeToElement } from '../common/theme'
import {
  readReaderPreferences,
  readOpenAIApiKey,
  writeOpenAIApiKey,
  readTranslationLanguage,
  writeTranslationLanguage,
  readSummarizationLevel,
  writeSummarizationLevel,
  type ReaderTheme
} from '../common/storage'
import { DEFAULTS } from '../config/defaults'
import {
  DEFAULT_TRANSLATION_LANGUAGE,
  isTranslationLanguage,
  type TranslationLanguage
} from '../common/translation'
import {
  sliderIndexToSummarizationLevel,
  summarizationLevelToSliderIndex,
  getSummarizationLevelLabel,
  type SummarizationLevel
} from '../common/summarization'

const THEME_OPTIONS = {
  lightClass: 'settings--light',
  darkClass: 'settings--dark'
} as const

type SettingsElements = {
  form: HTMLFormElement;
  apiKeyInput: HTMLInputElement;
  clearButton: HTMLButtonElement;
  languageSelect: HTMLSelectElement;
  summarizationSlider: HTMLInputElement;
  summarizationLabel: HTMLElement;
  status: HTMLElement;
};

let currentTheme: ReaderTheme = DEFAULTS.READER_PREFERENCES.theme
let statusTimeout: ReturnType<typeof setTimeout> | undefined

function showStatus (elements: SettingsElements, message: string, variant: 'success' | 'error'): void {
  if (statusTimeout) {
    clearTimeout(statusTimeout)
    statusTimeout = undefined
  }

  elements.status.textContent = message
  elements.status.dataset.variant = variant
  elements.status.hidden = false

  statusTimeout = setTimeout(() => {
    elements.status.hidden = true
    elements.status.removeAttribute('data-variant')
  }, 4000)
}

async function loadInitialState (elements: SettingsElements): Promise<void> {
  const prefs = await readReaderPreferences()
  currentTheme = prefs.theme
  applyThemeToElement(document.body, currentTheme, THEME_OPTIONS)

  const apiKey = await readOpenAIApiKey()
  if (apiKey) {
    elements.apiKeyInput.value = apiKey
  }

  const language = await readTranslationLanguage()
  const validLanguage = isTranslationLanguage(language) ? language : DEFAULT_TRANSLATION_LANGUAGE
  elements.languageSelect.value = validLanguage

  const summarizationLevel = await readSummarizationLevel()
  const sliderIndex = summarizationLevelToSliderIndex(summarizationLevel)
  elements.summarizationSlider.value = String(sliderIndex)
  elements.summarizationLabel.textContent = getSummarizationLevelLabel(summarizationLevel)
}

async function persistApiKey (value: string): Promise<void> {
  await writeOpenAIApiKey(value)
}

function registerEvents (elements: SettingsElements): void {
  elements.summarizationSlider.addEventListener('input', () => {
    const index = Number.parseInt(elements.summarizationSlider.value, 10) || 0
    const level = sliderIndexToSummarizationLevel(index)
    elements.summarizationLabel.textContent = getSummarizationLevelLabel(level)
  })

  elements.form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const value = elements.apiKeyInput.value.trim()
    const selectedLanguage = elements.languageSelect.value
    const language: TranslationLanguage = isTranslationLanguage(selectedLanguage)
      ? selectedLanguage
      : DEFAULT_TRANSLATION_LANGUAGE
    const sliderIndex = Number.parseInt(elements.summarizationSlider.value, 10) || 0
    const summarizationLevel: SummarizationLevel = sliderIndexToSummarizationLevel(sliderIndex)
    try {
      await Promise.all([
        persistApiKey(value),
        writeTranslationLanguage(language),
        writeSummarizationLevel(summarizationLevel)
      ])
      showStatus(elements, 'Settings saved.', 'success')
    } catch (error: unknown) {
      console.error('Failed to save API key', error)
      showStatus(elements, 'Could not save settings. Try again.', 'error')
    }
  })

  elements.clearButton.addEventListener('click', async () => {
    elements.apiKeyInput.value = ''
    try {
      await persistApiKey('')
      showStatus(elements, 'API key cleared.', 'success')
    } catch (error: unknown) {
      console.error('Failed to clear API key', error)
      showStatus(elements, 'Could not clear API key. Try again.', 'error')
    }
  })
}

document.addEventListener('DOMContentLoaded', () => {
  const elements: SettingsElements = {
    form: document.getElementById('settingsForm') as HTMLFormElement,
    apiKeyInput: document.getElementById('openaiApiKey') as HTMLInputElement,
    clearButton: document.getElementById('clearSettings') as HTMLButtonElement,
    languageSelect: document.getElementById('targetLanguage') as HTMLSelectElement,
    summarizationSlider: document.getElementById('summarizationLevel') as HTMLInputElement,
    summarizationLabel: document.getElementById('summarizationLabel') as HTMLElement,
    status: document.getElementById('settingsStatus') as HTMLElement
  }

  loadInitialState(elements).catch((error: unknown) => {
    console.error('Failed to initialize settings page', error)
    showStatus(elements, 'Could not load settings.', 'error')
  })
  registerEvents(elements)
})
