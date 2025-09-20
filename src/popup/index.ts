import { getBrowser } from '../platform/browser';
import type { BackgroundMessage } from '../common/messages';

const browser = getBrowser();

type PopupElements = {
  inputText: HTMLInputElement;
  speedReadButton: HTMLButtonElement;
  menuEntryTextSpan: HTMLSpanElement;
};


async function sendOpenReaderMessage(selectionText: string) {
  const message: BackgroundMessage = {
    target: 'background',
    type: 'openReaderFromPopup',
    selectionText,
    wordsPerMinute: 400, // Default speed
  };

  await browser.runtime.sendMessage(message);
}

async function loadMenuEntryText(elements: PopupElements) {
  try {
    const response = await browser.runtime.sendMessage({
      target: 'background',
      type: 'getMenuEntryText'
    });
    if (response?.menuEntryText) {
      elements.menuEntryTextSpan.textContent = response.menuEntryText;
    }
  } catch (error) {
    console.warn('Failed to load menu entry text:', error);
  }
}

async function registerEvents(elements: PopupElements) {
  function updateButtonState() {
    const text = elements.inputText.value.trim();
    elements.speedReadButton.disabled = text.length === 0;
  }

  async function triggerReadFromInput() {
    const text = elements.inputText.value.trim();
    if (text.length === 0) {
      return;
    }

    elements.inputText.value = '';
    elements.inputText.blur();
    updateButtonState();
    await sendOpenReaderMessage(text);
  }

  elements.inputText.addEventListener('input', updateButtonState);

  elements.speedReadButton.addEventListener('click', () => {
    void triggerReadFromInput();
  });

  // Initialize button state
  updateButtonState();
}

document.addEventListener('DOMContentLoaded', async () => {
  const elements: PopupElements = {
    inputText: document.getElementById('inputTextToRead') as HTMLInputElement,
    speedReadButton: document.getElementById('speedReadButton') as HTMLButtonElement,
    menuEntryTextSpan: document.getElementById('menuEntryText') as HTMLSpanElement,
  };

  await loadMenuEntryText(elements);
  await registerEvents(elements);
});

