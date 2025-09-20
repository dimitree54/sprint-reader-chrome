import { getBrowser } from '../platform/browser';
import type { BackgroundMessage } from '../common/messages';
import {
  readReaderPreferences,
  writeReaderPreferences,
  type ReaderPreferences,
  type ReaderTheme,
} from '../common/storage';

const browser = getBrowser();

type PopupElements = {
  btnReadSelection: HTMLButtonElement;
  btnReadLast: HTMLButtonElement;
  inputWpm: HTMLInputElement;
  checkboxPersist: HTMLInputElement;
};

let prefsState: ReaderPreferences = {
  wordsPerMinute: 400,
  persistSelection: true,
  pauseAfterComma: true,
  pauseAfterPeriod: true,
  pauseAfterParagraph: true,
  chunkSize: 1,
  wordFlicker: false,
  wordFlickerPercent: 10,
  theme: 'dark',
};

function applyTheme(theme: ReaderTheme) {
  const body = document.body;
  if (!body) {
    return;
  }

  body.classList.toggle('popup--light', theme === 'light');
  body.classList.toggle('popup--dark', theme !== 'light');
  body.dataset.theme = theme;
}

function updatePreferences(partial: Partial<ReaderPreferences>) {
  prefsState = { ...prefsState, ...partial };
  void writeReaderPreferences(prefsState);
}

async function loadPreferences(elements: PopupElements) {
  const prefs = await readReaderPreferences();
  prefsState = { ...prefsState, ...prefs };
  elements.inputWpm.value = String(prefsState.wordsPerMinute);
  elements.checkboxPersist.checked = prefsState.persistSelection;
  applyTheme(prefsState.theme);
}

async function sendOpenReaderMessage(selectionText: string | undefined, elements: PopupElements) {
  const wordsPerMinute = Number.parseInt(elements.inputWpm.value, 10) || 400;
  const persistSelection = elements.checkboxPersist.checked;

  prefsState = {
    ...prefsState,
    wordsPerMinute,
    persistSelection,
  };
  void writeReaderPreferences(prefsState);

  const message: BackgroundMessage = {
    target: 'background',
    type: 'openReaderFromPopup',
    selectionText,
    wordsPerMinute,
    persistSelection,
    theme: prefsState.theme,
  };

  await browser.runtime.sendMessage(message);
}

async function registerEvents(elements: PopupElements) {
  elements.btnReadSelection.addEventListener('click', () => {
    void sendOpenReaderMessage('', elements);
  });

  elements.btnReadLast.addEventListener('click', () => {
    void sendOpenReaderMessage(undefined, elements);
  });

  elements.inputWpm.addEventListener('change', () => {
    const value = Number.parseInt(elements.inputWpm.value, 10) || 400;
    updatePreferences({
      wordsPerMinute: value,
      persistSelection: elements.checkboxPersist.checked,
    });
  });

  elements.checkboxPersist.addEventListener('change', () => {
    const value = Number.parseInt(elements.inputWpm.value, 10) || 400;
    updatePreferences({
      wordsPerMinute: value,
      persistSelection: elements.checkboxPersist.checked,
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const elements: PopupElements = {
    btnReadSelection: document.getElementById('btnReadSelection') as HTMLButtonElement,
    btnReadLast: document.getElementById('btnReadLast') as HTMLButtonElement,
    inputWpm: document.getElementById('inputWpm') as HTMLInputElement,
    checkboxPersist: document.getElementById('inputPersistSelection') as HTMLInputElement,
  };

  await loadPreferences(elements);
  await registerEvents(elements);
});
