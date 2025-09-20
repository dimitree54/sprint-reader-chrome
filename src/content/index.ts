import { getBrowser } from '../platform/browser';
import type { BackgroundMessage, ContentRequest } from '../common/messages';

const browser = getBrowser();

let lastMouseX = 0;
let lastMouseY = 0;
let hintElement: HTMLDivElement | undefined;
let selectionTimeout: ReturnType<typeof setTimeout> | undefined;

function ensureHintElement(): HTMLDivElement {
  if (!hintElement) {
    hintElement = document.createElement('div');
    hintElement.className = 'sprint-reader__selection-hint';
    hintElement.textContent = 'Press Ctrl+Shift+E to sprint read';
    hintElement.style.display = 'none';
    document.body.appendChild(hintElement);
  }
  return hintElement;
}

function hideHint() {
  if (hintElement) {
    hintElement.style.display = 'none';
  }
}

function showHint(x: number, y: number) {
  const element = ensureHintElement();
  element.style.left = `${Math.round(x)}px`;
  element.style.top = `${Math.round(y)}px`;
  element.style.display = 'block';
}

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

  if (haveSelection) {
    showHint(lastMouseX, lastMouseY - 32);
  } else {
    hideHint();
  }
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

document.addEventListener('scroll', () => hideHint(), true);

browser.runtime.onMessage.addListener((rawMessage, _sender, sendResponse) => {
  const message = rawMessage as ContentRequest;
  if (message.target !== 'content') {
    return undefined;
  }

  switch (message.type) {
    case 'getMouseCoordinates':
      sendResponse({ x: lastMouseX, y: lastMouseY });
      return true;
    case 'showSelectionHint':
      showHint(message.x, message.y);
      return true;
    case 'hideSelectionHint':
      hideHint();
      return true;
    default:
      return undefined;
  }
});
