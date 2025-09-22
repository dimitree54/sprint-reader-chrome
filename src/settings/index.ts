import { applyThemeToElement } from '../common/theme'
import {
  readReaderPreferences,
  writeReaderPreferences,
  readOpenAIApiKey,
  writeOpenAIApiKey,
  readTranslationLanguage,
  writeTranslationLanguage,
  readSummarizationLevel,
  writeSummarizationLevel,
  readPreprocessingEnabled,
  writePreprocessingEnabled,
  type ReaderTheme
} from '../common/storage'
import { DEFAULTS } from '../config/defaults'
import {
  TRANSLATION_LANGUAGES,
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
  enablePreprocessingToggle: HTMLInputElement;
  languageSelect: HTMLSelectElement;
  wpmSlider: HTMLInputElement;
  wpmValue: HTMLElement;
  summarizationSlider: HTMLInputElement;
  summarizationLabel: HTMLElement;
  themeToggle: HTMLInputElement;
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

function populateLanguageOptions (selectElement: HTMLSelectElement): void {
  // Clear existing options
  selectElement.innerHTML = ''

  // Add all languages
  TRANSLATION_LANGUAGES.forEach(lang => {
      const option = document.createElement('option')
      option.value = lang.value
      option.textContent = lang.label
      selectElement.appendChild(option)
    })
}

async function loadInitialState (elements: SettingsElements): Promise<void> {
  const prefs = await readReaderPreferences()
  currentTheme = prefs.theme
  applyThemeToElement(document.body, currentTheme, THEME_OPTIONS)

  // Set theme toggle state
  elements.themeToggle.checked = currentTheme === 'light'

  const apiKey = await readOpenAIApiKey()
  if (apiKey) {
    elements.apiKeyInput.value = apiKey
  }

  // Populate language dropdown with all available languages
  populateLanguageOptions(elements.languageSelect)

  const language = await readTranslationLanguage()
  const isPreprocessingEnabled = await readPreprocessingEnabled()

  // Set toggle state
  elements.enablePreprocessingToggle.checked = isPreprocessingEnabled

  // Set dropdown state
  if (isTranslationLanguage(language)) {
    elements.languageSelect.value = language
  } else {
    // Fallback for invalid language codes
    elements.languageSelect.value = 'en'
  }

  // Enable/disable dropdown based on preprocessing toggle
  elements.languageSelect.disabled = !isPreprocessingEnabled

  // Set WPM slider
  elements.wpmSlider.value = String(prefs.wordsPerMinute)
  elements.wpmValue.textContent = String(prefs.wordsPerMinute)

  const summarizationLevel = await readSummarizationLevel()
  const sliderIndex = summarizationLevelToSliderIndex(summarizationLevel)
  elements.summarizationSlider.value = String(sliderIndex)
  elements.summarizationLabel.textContent = getSummarizationLevelLabel(summarizationLevel)
}

async function persistApiKey (value: string): Promise<void> {
  await writeOpenAIApiKey(value)
}

function registerEvents (elements: SettingsElements): void {
  elements.wpmSlider.addEventListener('input', () => {
    const value = Number.parseInt(elements.wpmSlider.value, 10) || DEFAULTS.READER_PREFERENCES.wordsPerMinute
    elements.wpmValue.textContent = String(value)
  })

  elements.summarizationSlider.addEventListener('input', () => {
    const index = Number.parseInt(elements.summarizationSlider.value, 10) || 0
    const level = sliderIndexToSummarizationLevel(index)
    elements.summarizationLabel.textContent = getSummarizationLevelLabel(level)
  })

  // Handle preprocessing toggle change to enable/disable language dropdown
  elements.enablePreprocessingToggle.addEventListener('change', () => {
    const isEnabled = elements.enablePreprocessingToggle.checked
    elements.languageSelect.disabled = !isEnabled
  })

  // Handle theme toggle
  elements.themeToggle.addEventListener('change', async () => {
    const newTheme: ReaderTheme = elements.themeToggle.checked ? 'light' : 'dark'
    currentTheme = newTheme
    applyThemeToElement(document.body, currentTheme, THEME_OPTIONS)

    // Save theme preference
    try {
      const currentPrefs = await readReaderPreferences()
      const updatedPrefs = { ...currentPrefs, theme: newTheme }
      await writeReaderPreferences(updatedPrefs)
    } catch (error) {
      console.error('Failed to save theme preference', error)
    }
  })

  elements.form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const value = elements.apiKeyInput.value.trim()

    // Get preprocessing enabled state
    const preprocessingEnabled = elements.enablePreprocessingToggle.checked

    // Get language from dropdown
    const selectedLanguage = elements.languageSelect.value
    const language: TranslationLanguage = isTranslationLanguage(selectedLanguage) ? selectedLanguage : 'en'

    // Get WPM value
    const wpmValue = Number.parseInt(elements.wpmSlider.value, 10) || DEFAULTS.READER_PREFERENCES.wordsPerMinute

    const sliderIndex = Number.parseInt(elements.summarizationSlider.value, 10) || 0
    const summarizationLevel: SummarizationLevel = sliderIndexToSummarizationLevel(sliderIndex)

    try {
      // Update reader preferences with new WPM value
      const currentPrefs = await readReaderPreferences()
      const updatedPrefs = { ...currentPrefs, wordsPerMinute: wpmValue }

      await Promise.all([
        persistApiKey(value),
        writePreprocessingEnabled(preprocessingEnabled),
        writeTranslationLanguage(language),
        writeSummarizationLevel(summarizationLevel),
        writeReaderPreferences(updatedPrefs)
      ])
      showStatus(elements, 'Settings saved.', 'success')
    } catch (error: unknown) {
      console.error('Failed to save settings', error)
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
    enablePreprocessingToggle: document.getElementById('enablePreprocessing') as HTMLInputElement,
    languageSelect: document.getElementById('targetLanguage') as HTMLSelectElement,
    wpmSlider: document.getElementById('wordsPerMinute') as HTMLInputElement,
    wpmValue: document.getElementById('wpmValue') as HTMLElement,
    summarizationSlider: document.getElementById('summarizationLevel') as HTMLInputElement,
    summarizationLabel: document.getElementById('summarizationLabel') as HTMLElement,
    themeToggle: document.getElementById('settingsToggleTheme') as HTMLInputElement,
    status: document.getElementById('settingsStatus') as HTMLElement
  }

  loadInitialState(elements).catch((error: unknown) => {
    console.error('Failed to initialize settings page', error)
    showStatus(elements, 'Could not load settings.', 'error')
  })
  registerEvents(elements)
})
