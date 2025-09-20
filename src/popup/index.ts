import { getBrowser } from '../platform/browser';
import type { BackgroundMessage } from '../common/messages';
import { readReaderPreferences, writeReaderPreferences, type ReaderPreferences } from '../common/storage';

const browser = getBrowser();

type PopupElements = {
  inputText: HTMLInputElement;
  inputWpm: HTMLInputElement;
};

let currentPreferences: ReaderPreferences | undefined;

function parseWordsPerMinute(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return 400;
  }

  return Math.min(Math.max(parsed, 100), 2000);
}

async function loadPreferences(elements: PopupElements) {
  const prefs = await readReaderPreferences();
  currentPreferences = prefs;
  elements.inputWpm.value = String(prefs.wordsPerMinute);
}

async function sendOpenReaderMessage(selectionText: string, elements: PopupElements) {
  const wordsPerMinute = parseWordsPerMinute(elements.inputWpm.value);

  const message: BackgroundMessage = {
    target: 'background',
    type: 'openReaderFromPopup',
    selectionText,
    wordsPerMinute,
  };

  await browser.runtime.sendMessage(message);
}

async function registerEvents(elements: PopupElements) {
  let pasteTriggered = false;

  function updateStoredPreferences(wordsPerMinute: number) {
    if (!currentPreferences) {
      return;
    }

    const nextPreferences: ReaderPreferences = {
      ...currentPreferences,
      wordsPerMinute,
    };

    currentPreferences = nextPreferences;
    void writeReaderPreferences(nextPreferences);
  }

  async function triggerReadFromInput() {
    const text = elements.inputText.value.trim();
    if (text.length === 0) {
      return;
    }

    elements.inputText.value = '';
    elements.inputText.blur();
    await sendOpenReaderMessage(text, elements);
  }

  elements.inputText.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
      pasteTriggered = true;
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      void triggerReadFromInput();
    }
  });

  elements.inputText.addEventListener('paste', () => {
    pasteTriggered = true;
  });

  elements.inputText.addEventListener('input', () => {
    if (!pasteTriggered) {
      return;
    }

    pasteTriggered = false;
    void triggerReadFromInput();
  });

  elements.inputWpm.addEventListener('change', () => {
    const wordsPerMinute = parseWordsPerMinute(elements.inputWpm.value);
    elements.inputWpm.value = String(wordsPerMinute);
    updateStoredPreferences(wordsPerMinute);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const elements: PopupElements = {
    inputText: document.getElementById('inputTextToRead') as HTMLInputElement,
    inputWpm: document.getElementById('inputWpm') as HTMLInputElement,
  };

  await loadPreferences(elements);
  await registerEvents(elements);
});

