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
  speedReadPageButton: HTMLButtonElement;
  menuEntryTextSpan: HTMLSpanElement;
};

let currentTheme: ReaderTheme = DEFAULTS.READER_PREFERENCES.theme

async function loadPreferences () {
  const prefs = await readReaderPreferences()
  currentTheme = prefs.theme
  applyThemeToElement(document.body, currentTheme, THEME_OPTIONS)
}

async function sendOpenReaderMessage (selectionText: string, dirRTL: boolean = false) {
  const prefs = await readReaderPreferences()
  const message: BackgroundMessage = {
    target: 'background',
    type: 'openReaderFromPopup',
    selectionText,
    wordsPerMinute: prefs.wordsPerMinute,
    theme: currentTheme,
    dirRTL
  }

  await (browser.runtime.sendMessage as any)(message)
}

async function extractReadableContentFromActiveTab (): Promise<{ text: string; isRTL: boolean; wordCount: number }> {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true })
  const activeTab = tabs[0]

  if (!activeTab?.id) {
    throw new Error('Unable to determine the active tab')
  }

  const response = await (browser.tabs.sendMessage as any)(activeTab.id, {
    target: 'content',
    type: 'collectReadableContent'
  })

  const result = (response as { text?: string; isRTL?: boolean; wordCount?: number } | undefined) ?? {}
  const text = (result.text ?? '').trim()
  const wordCount = typeof result.wordCount === 'number' ? result.wordCount : text.split(/\s+/).filter(Boolean).length

  return {
    text,
    isRTL: Boolean(result.isRTL),
    wordCount
  }
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

  const pageButtonDefaultLabel = elements.speedReadPageButton.textContent ?? 'Speed read this page'

  async function triggerReadFullPage () {
    if (elements.speedReadPageButton.dataset.loading === 'true') {
      return
    }

    elements.speedReadPageButton.dataset.loading = 'true'
    elements.speedReadPageButton.disabled = true
    elements.speedReadPageButton.textContent = 'Scanning page…'

    try {
      const result = await extractReadableContentFromActiveTab()
      if (result.text.length === 0 || result.wordCount < 80) {
        elements.speedReadPageButton.textContent = 'No readable text found'
        setTimeout(() => {
          elements.speedReadPageButton.textContent = pageButtonDefaultLabel
          elements.speedReadPageButton.disabled = false
          delete elements.speedReadPageButton.dataset.loading
        }, 2200)
        return
      }

      elements.speedReadPageButton.textContent = 'Opening reader…'
      await sendOpenReaderMessage(result.text, result.isRTL)
      setTimeout(() => {
        elements.speedReadPageButton.textContent = pageButtonDefaultLabel
        elements.speedReadPageButton.disabled = false
        delete elements.speedReadPageButton.dataset.loading
      }, 800)
    } catch (error) {
      console.error('Failed to extract readable content from page', error)
      elements.speedReadPageButton.textContent = 'Failed to scan page'
      setTimeout(() => {
        elements.speedReadPageButton.textContent = pageButtonDefaultLabel
        elements.speedReadPageButton.disabled = false
        delete elements.speedReadPageButton.dataset.loading
      }, 2400)
    }
  }

  elements.speedReadPageButton.addEventListener('click', () => {
    triggerReadFullPage().catch(console.error)
  })

  // Initialize button state
  updateButtonState()
}

document.addEventListener('DOMContentLoaded', async () => {
  const elements: PopupElements = {
    inputText: document.getElementById('inputTextToRead') as HTMLInputElement,
    speedReadButton: document.getElementById('speedReadButton') as HTMLButtonElement,
    speedReadPageButton: document.getElementById('speedReadPageButton') as HTMLButtonElement,
    menuEntryTextSpan: document.getElementById('menuEntryText') as HTMLSpanElement
  }

  await loadPreferences()
  await loadMenuEntryText(elements)
  await registerEvents(elements)
})
