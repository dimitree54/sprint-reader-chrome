import { applyThemeToElement } from '../common/theme'
import type { BackgroundMessage } from '../common/messages'
import {
  readReaderPreferences,
  type ReaderTheme
} from '../common/storage'
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
};

let currentTheme: ReaderTheme = DEFAULTS.READER_PREFERENCES.theme

async function loadPreferences () {
  const prefs = await readReaderPreferences()
  currentTheme = prefs.theme
  applyThemeToElement(document.body, currentTheme, THEME_OPTIONS)
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
    settingsButton: document.getElementById('openSettings') as HTMLButtonElement
  }

  await loadPreferences()
  await loadMenuEntryText(elements)
  await registerEvents(elements)
})
