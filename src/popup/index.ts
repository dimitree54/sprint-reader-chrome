import { getBrowser } from '../platform/browser'
import type { BackgroundMessage } from '../common/messages'
import {
  readReaderPreferences,
  type ReaderTheme
} from '../common/storage'

const browser = getBrowser()

type PopupElements = {
  inputText: HTMLInputElement;
  speedReadButton: HTMLButtonElement;
  menuEntryTextSpan: HTMLSpanElement;
};

let currentTheme: ReaderTheme = 'dark'

function applyTheme (theme: ReaderTheme) {
  const body = document.body
  if (!body) {
    return
  }

  body.classList.toggle('popup--light', theme === 'light')
  body.classList.toggle('popup--dark', theme !== 'light')
  body.dataset.theme = theme
}

async function loadPreferences () {
  const prefs = await readReaderPreferences()
  currentTheme = prefs.theme
  applyTheme(currentTheme)
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

  await browser.runtime.sendMessage(message)
}

async function loadMenuEntryText (elements: PopupElements) {
  try {
    const response = await browser.runtime.sendMessage({
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

  // Initialize button state
  updateButtonState()
}

document.addEventListener('DOMContentLoaded', async () => {
  const elements: PopupElements = {
    inputText: document.getElementById('inputTextToRead') as HTMLInputElement,
    speedReadButton: document.getElementById('speedReadButton') as HTMLButtonElement,
    menuEntryTextSpan: document.getElementById('menuEntryText') as HTMLSpanElement
  }

  await loadPreferences()
  await loadMenuEntryText(elements)
  await registerEvents(elements)
})
