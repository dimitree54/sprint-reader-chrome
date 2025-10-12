import { applyThemeToElement } from '../common/theme'
import type { BackgroundMessage, BackgroundResponse } from '../common/messages'
import {
  readReaderPreferences,
  readSummarizationLevel,
  writeSummarizationLevel,
  readPreprocessingEnabled,
  writePreprocessingEnabled,
  type ReaderTheme
} from '../common/storage'
import {
  sliderIndexToSummarizationLevel,
  summarizationLevelToSliderIndex,
  getSummarizationLevelLabel
} from '../common/summarization'
import { browserApi } from '../core/browser-api.service'
import { DEFAULTS } from '../config/defaults'
import { applyExtensionName } from '../common/app-name'

const THEME_OPTIONS = {
  lightClass: 'popup--light',
  darkClass: 'popup--dark'
} as const

type PopupElements = {
  inputText: HTMLInputElement;
  speedReadButton: HTMLButtonElement;
  menuEntryTextSpan: HTMLSpanElement;
  settingsButton: HTMLButtonElement;
  enablePreprocessingToggle: HTMLInputElement;
  summarizationSlider: HTMLInputElement;
  summarizationLabel: HTMLElement;
};

let currentTheme: ReaderTheme = DEFAULTS.READER_PREFERENCES.theme

async function loadPreferences (elements: PopupElements) {
  const prefs = await readReaderPreferences()
  currentTheme = prefs.theme
  applyThemeToElement(document.body, currentTheme, THEME_OPTIONS)

  // Load preprocessing settings
  const isPreprocessingEnabled = await readPreprocessingEnabled()
  elements.enablePreprocessingToggle.checked = isPreprocessingEnabled

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

  await browserApi.sendMessage(message)
}

async function loadMenuEntryText (elements: PopupElements) {
  try {
    const response = await browserApi.sendMessage({
      target: 'background',
      type: 'getMenuEntryText'
    } satisfies BackgroundMessage) as BackgroundResponse
    if (response && 'menuEntryText' in response) {
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

  // Handle preprocessing toggle change
  elements.enablePreprocessingToggle.addEventListener('change', async () => {
    const isEnabled = elements.enablePreprocessingToggle.checked

    // Save immediately
    try {
      await writePreprocessingEnabled(isEnabled)
    } catch (error) {
      console.error('Failed to save preprocessing setting', error)
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
  const url = browserApi.runtime.getURL('pages/settings.html')
  await browserApi.createTab({ url })
}

document.addEventListener('DOMContentLoaded', async () => {
  applyExtensionName()
  const elements: PopupElements = {
    inputText: document.getElementById('inputTextToRead') as HTMLInputElement,
    speedReadButton: document.getElementById('speedReadButton') as HTMLButtonElement,
    menuEntryTextSpan: document.getElementById('menuEntryText') as HTMLSpanElement,
    settingsButton: document.getElementById('openSettings') as HTMLButtonElement,
    enablePreprocessingToggle: document.getElementById('popupEnableTranslation') as HTMLInputElement,
    summarizationSlider: document.getElementById('popupSummarizationLevel') as HTMLInputElement,
    summarizationLabel: document.getElementById('popupSummarizationLabel') as HTMLElement
  }

  await loadPreferences(elements)
  await loadMenuEntryText(elements)
  await registerEvents(elements)
})
