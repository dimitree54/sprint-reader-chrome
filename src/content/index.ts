import { getBrowser } from '../platform/browser';
import type { BackgroundMessage, ContentRequest } from '../common/messages';

const browser = getBrowser();

let lastMouseX = 0;
let lastMouseY = 0;
let selectionTimeout: ReturnType<typeof setTimeout> | undefined;


function detectDirection(text: string): boolean {
  const rtlChar = /[\u0590-\u08FF\uFB1D-\uFDFD\uFE70-\uFEFC]/u;
  return rtlChar.test(text);
}

function captureSelection() {
  const selection = window.getSelection();
  const selectedText = (selection?.toString() ?? '').trim();
  const haveSelection = selectedText.length > 0;
  const dirRTL = haveSelection ? detectDirection(selectedText) : false;

  const message: BackgroundMessage = {
    target: 'background',
    type: 'getSelection',
    selectedText,
    haveSelection,
    dirRTL,
  };

  browser.runtime.sendMessage(message).catch(() => {
    // Ignore failures when the background context is not available.
  });
}

function scheduleSelectionCapture() {
  if (selectionTimeout) {
    clearTimeout(selectionTimeout);
  }
  selectionTimeout = setTimeout(() => {
    captureSelection();
  }, 120);
}

document.addEventListener('mouseup', scheduleSelectionCapture, true);
document.addEventListener('keyup', (event) => {
  if (event.key === 'Shift' || event.key === 'Control' || event.key === 'Meta') {
    scheduleSelectionCapture();
  }
});
document.addEventListener('selectionchange', scheduleSelectionCapture);

document.addEventListener('mousemove', (event) => {
  lastMouseX = event.clientX;
  lastMouseY = event.clientY;
});


browser.runtime.onMessage.addListener((rawMessage, _sender, sendResponse) => {
  const message = rawMessage as ContentRequest;
  if (message.target !== 'content') {
    return undefined;
  }

  switch (message.type) {
    case 'getMouseCoordinates':
      sendResponse({ x: lastMouseX, y: lastMouseY });
      return true;
    default:
      return undefined;
  }
});
