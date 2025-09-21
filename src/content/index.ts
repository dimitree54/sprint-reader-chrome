import { getBrowser } from '../platform/browser'
import type { BackgroundMessage, ContentRequest } from '../common/messages'
import { DEFAULTS } from '../config/defaults'
import { startInlineReader, stopInlineReader } from './inline-reader'

const browser = getBrowser()

let lastMouseX = 0
let lastMouseY = 0
let selectionTimeout: ReturnType<typeof setTimeout> | undefined
let selectionHintElement: HTMLElement | null = null
let hideHintTimeout: ReturnType<typeof setTimeout> | undefined

function removeSelectionHint (): void {
  if (hideHintTimeout) {
    clearTimeout(hideHintTimeout)
    hideHintTimeout = undefined
  }
  if (selectionHintElement && selectionHintElement.parentElement) {
    selectionHintElement.parentElement.removeChild(selectionHintElement)
  }
  selectionHintElement = null
}

function ensureSelectionHint (): HTMLElement | null {
  const root = document.body ?? document.documentElement
  if (!root) {
    return null
  }

  if (!selectionHintElement) {
    const hint = document.createElement('div')
    hint.className = 'speed-reader__selection-hint'
    hint.textContent = 'Select text to speed read'
    root.appendChild(hint)
    selectionHintElement = hint
  }

  return selectionHintElement
}

function positionSelectionHint (hint: HTMLElement, x: number, y: number): void {
  const offset = DEFAULTS.UI.selectionHintOffset
  const maxX = window.innerWidth - hint.offsetWidth - offset
  const maxY = window.innerHeight - hint.offsetHeight - offset

  const clampedX = Math.max(offset, Math.min(x + offset, Math.max(offset, maxX)))
  const clampedY = Math.max(offset, Math.min(y + offset, Math.max(offset, maxY)))

  hint.style.left = `${clampedX}px`
  hint.style.top = `${clampedY}px`
}

function showSelectionHint (x: number, y: number): void {
  const hint = ensureSelectionHint()
  if (!hint) {
    return
  }

  if (hideHintTimeout) {
    clearTimeout(hideHintTimeout)
    hideHintTimeout = undefined
  }

  hint.style.position = 'fixed'
  hint.style.display = 'block'
  positionSelectionHint(hint, x, y)

  hideHintTimeout = setTimeout(() => {
    removeSelectionHint()
  }, DEFAULTS.UI.selectionHintTimeoutMs)
}


function detectDirection (text: string): boolean {
  const rtlChar = /[\u0590-\u08FF\uFB1D-\uFDFD\uFE70-\uFEFC]/u
  return rtlChar.test(text)
}

function captureSelection () {
  const selection = window.getSelection()
  const selectedText = (selection?.toString() ?? '').trim()
  const haveSelection = selectedText.length > 0
  const dirRTL = haveSelection ? detectDirection(selectedText) : false

  const message: BackgroundMessage = {
    target: 'background',
    type: 'getSelection',
    selectedText,
    haveSelection,
    dirRTL
  }

  ;(browser.runtime.sendMessage(message) as Promise<unknown>).catch(() => {
    // Ignore failures when the background context is not available.
  })

  if (haveSelection) {
    removeSelectionHint()
  }
}

function scheduleSelectionCapture () {
  if (selectionTimeout) {
    clearTimeout(selectionTimeout)
  }
  selectionTimeout = setTimeout(() => {
    captureSelection()
  }, DEFAULTS.TIMING.selectionCaptureDelayMs)
}

document.addEventListener('mouseup', scheduleSelectionCapture, true)
document.addEventListener('keyup', (event) => {
  if (event.key === 'Shift' || event.key === 'Control' || event.key === 'Meta') {
    scheduleSelectionCapture()
  }
})
document.addEventListener('selectionchange', scheduleSelectionCapture)

document.addEventListener('mousemove', (event) => {
  lastMouseX = event.clientX
  lastMouseY = event.clientY
})

browser.runtime.onMessage.addListener((rawMessage: ContentRequest, _sender: chrome.runtime.MessageSender, sendResponse: (response?: unknown) => void) => {
  const message = rawMessage
  if (message.target !== 'content') {
    return undefined
  }

  switch (message.type) {
    case 'getMouseCoordinates':
      sendResponse({ x: lastMouseX, y: lastMouseY })
      return true
    case 'showSelectionHint':
      showSelectionHint(message.x, message.y)
      return true
    case 'hideSelectionHint':
      removeSelectionHint()
      return true
    case 'startInlineReader':
      startInlineReader(message.text, message.preferences, message.isRTL)
      return true
    case 'stopInlineReader':
      stopInlineReader()
      return true
    default:
      return undefined
  }
})
