import { applyThemeToElement } from '../common/theme'
import type { BackgroundMessage } from '../common/messages'
import {
  readReaderPreferences,
  readTranslationLanguage,
  writeTranslationLanguage,
  readSummarizationLevel,
  writeSummarizationLevel,
  type ReaderTheme
} from '../common/storage'
import {
  type TranslationLanguage
} from '../common/translation'
import {
  sliderIndexToSummarizationLevel,
  summarizationLevelToSliderIndex,
  getSummarizationLevelLabel
} from '../common/summarization'
import { browser } from '../platform/browser'
import { DEFAULTS } from '../config/defaults'

const THEME_OPTIONS = {
  lightClass: 'popup--light',
  darkClass: 'popup--dark'
} as const

type PopupElements = {
  inputText: HTMLInputElement;
  speedReadButton: HTMLButtonElement;
  menuEntryTextSpan: HTMLSpanElement;
  settingsButton: HTMLButtonElement;
  enableTranslationCheckbox: HTMLInputElement;
  summarizationSlider: HTMLInputElement;
  summarizationLabel: HTMLElement;
};

let currentTheme: ReaderTheme = DEFAULTS.READER_PREFERENCES.theme

async function loadPreferences (elements: PopupElements) {
  const prefs = await readReaderPreferences()
  currentTheme = prefs.theme
  applyThemeToElement(document.body, currentTheme, THEME_OPTIONS)

  // Load translation settings
  const language = await readTranslationLanguage()
  const isTranslationEnabled = language !== 'none'
  elements.enableTranslationCheckbox.checked = isTranslationEnabled

  // Load summarization settings
  const summarizationLevel = await readSummarizationLevel()
  const sliderIndex = summarizationLevelToSliderIndex(summarizationLevel)
  elements.summarizationSlider.value = String(sliderIndex)
  elements.summarizationLabel.textContent = getSummarizationLevelLabel(summarizationLevel)
}

async function sendOpenReaderMessage (selectionText: string) {
  const prefs = await readReaderPreferences()
  const message: BackgroundMessage = {
    target: 'background',
    type: 'openReaderFromPopup',
    selectionText,
    wordsPerMinute: prefs.wordsPerMinute,
    theme: currentTheme
  }

  await (browser.runtime.sendMessage as any)(message)
}

async function loadMenuEntryText (elements: PopupElements) {
  try {
    const response = await (browser.runtime.sendMessage as any)({
      target: 'background',
      type: 'getMenuEntryText'
    })
    if (response?.menuEntryText) {
      elements.menuEntryTextSpan.textContent = response.menuEntryText
    }
  } catch (error) {
    console.warn('Failed to load menu entry text:', error)
  }
}

async function registerEvents (elements: PopupElements) {
  function updateButtonState () {
    const text = elements.inputText.value.trim()
    elements.speedReadButton.disabled = text.length === 0
  }

  async function triggerReadFromInput () {
    const text = elements.inputText.value.trim()
    if (text.length === 0) {
      return
    }

    elements.inputText.value = ''
    elements.inputText.blur()
    updateButtonState()
    await sendOpenReaderMessage(text)
  }

  // Handle summarization slider change
  elements.summarizationSlider.addEventListener('input', async () => {
    const index = Number.parseInt(elements.summarizationSlider.value, 10) || 0
    const level = sliderIndexToSummarizationLevel(index)
    elements.summarizationLabel.textContent = getSummarizationLevelLabel(level)

    // Save immediately
    try {
      await writeSummarizationLevel(level)
    } catch (error) {
      console.error('Failed to save summarization level', error)
    }
  })

  // Handle translation checkbox change
  elements.enableTranslationCheckbox.addEventListener('change', async () => {
    const isEnabled = elements.enableTranslationCheckbox.checked
    const language: TranslationLanguage = isEnabled ? 'en' : 'none'

    // Save immediately
    try {
      await writeTranslationLanguage(language)
    } catch (error) {
      console.error('Failed to save translation setting', error)
    }
  })

  elements.inputText.addEventListener('input', updateButtonState)

  elements.speedReadButton.addEventListener('click', () => {
    triggerReadFromInput().catch(console.error)
  })

  elements.settingsButton.addEventListener('click', () => {
    openSettingsPage().catch(console.error)
  })

  // Initialize button state
  updateButtonState()
}

async function openSettingsPage (): Promise<void> {
  const url = browser.runtime.getURL('pages/settings.html')
  await browser.tabs.create({ url })
}

document.addEventListener('DOMContentLoaded', async () => {
  const elements: PopupElements = {
    inputText: document.getElementById('inputTextToRead') as HTMLInputElement,
    speedReadButton: document.getElementById('speedReadButton') as HTMLButtonElement,
    menuEntryTextSpan: document.getElementById('menuEntryText') as HTMLSpanElement,
    settingsButton: document.getElementById('openSettings') as HTMLButtonElement,
    enableTranslationCheckbox: document.getElementById('popupEnableTranslation') as HTMLInputElement,
    summarizationSlider: document.getElementById('popupSummarizationLevel') as HTMLInputElement,
    summarizationLabel: document.getElementById('popupSummarizationLabel') as HTMLElement
  }

  await loadPreferences(elements)
  await loadMenuEntryText(elements)
  await registerEvents(elements)
})
