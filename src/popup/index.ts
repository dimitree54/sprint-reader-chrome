import { getBrowser } from '../platform/browser';
import type { BackgroundMessage } from '../common/messages';
import { readReaderPreferences, writeReaderPreferences } from '../common/storage';

const browser = getBrowser();

type PopupElements = {
  btnReadSelection: HTMLButtonElement;
  btnReadLast: HTMLButtonElement;
  inputWpm: HTMLInputElement;
  checkboxPersist: HTMLInputElement;
};

async function loadPreferences(elements: PopupElements) {
  const prefs = await readReaderPreferences();
  elements.inputWpm.value = String(prefs.wordsPerMinute);
  elements.checkboxPersist.checked = prefs.persistSelection;
}

async function sendOpenReaderMessage(selectionText: string | undefined, elements: PopupElements) {
  const wordsPerMinute = Number.parseInt(elements.inputWpm.value, 10) || 400;
  const persistSelection = elements.checkboxPersist.checked;

  const message: BackgroundMessage = {
    target: 'background',
    type: 'openReaderFromPopup',
    selectionText,
    wordsPerMinute,
    persistSelection,
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
    void writeReaderPreferences({
      wordsPerMinute: value,
      persistSelection: elements.checkboxPersist.checked,
    });
  });

  elements.checkboxPersist.addEventListener('change', () => {
    const value = Number.parseInt(elements.inputWpm.value, 10) || 400;
    void writeReaderPreferences({
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
