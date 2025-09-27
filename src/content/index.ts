import { browserApi } from '../core/browser-api.service'
import type { BackgroundMessage } from '../common/messages'
import { DEFAULTS } from '../config/defaults'


let selectionTimeout: ReturnType<typeof setTimeout> | undefined






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

  browserApi.sendMessage(message).catch(() => {
    // Ignore failures when the background context is not available.
  })

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

