import { getBrowser } from '../platform/browser';
import { readReaderPreferences, readSelection, writeReaderPreferences } from '../common/storage';
import type { ReaderMessage } from '../common/messages';

const browser = getBrowser();

function decodeHtml(input: string): string {
  const element = document.createElement('textarea');
  element.innerHTML = input;
  return element.value;
}

type ReaderState = {
  words: string[];
  index: number;
  playing: boolean;
  timerId: ReturnType<typeof setTimeout> | undefined;
  wordsPerMinute: number;
  persistSelection: boolean;
};

const state: ReaderState = {
  words: [],
  index: 0,
  playing: false,
  timerId: undefined,
  wordsPerMinute: 400,
  persistSelection: true,
};

function renderWord() {
  const wordElement = document.getElementById('word');
  const statusElement = document.getElementById('labelStatus');
  const progressElement = document.getElementById('labelProgress');
  if (!wordElement || !statusElement || !progressElement) {
    return;
  }

  const currentWord = state.words[state.index] ?? '';
  wordElement.textContent = currentWord;

  statusElement.textContent = state.playing ? 'Playing' : 'Paused';
  if (state.words.length > 0) {
    const percent = Math.min(100, Math.round(((state.index + 1) / state.words.length) * 100));
    progressElement.textContent = `${percent}% • ${state.index + 1} / ${state.words.length}`;
  } else {
    progressElement.textContent = '';
  }

  const playButton = document.getElementById('btnPlay');
  if (playButton) {
    playButton.textContent = state.playing ? 'Pause' : 'Play';
  }
}

function calculateDelay(): number {
  return Math.max(60_000 / Math.max(100, state.wordsPerMinute), 20);
}

function scheduleNextWord() {
  if (!state.playing) {
    return;
  }

  if (state.index >= state.words.length - 1) {
    state.playing = false;
    renderWord();
    return;
  }

  state.index += 1;
  renderWord();
  state.timerId = setTimeout(scheduleNextWord, calculateDelay());
}

function stopPlayback() {
  if (state.timerId) {
    clearTimeout(state.timerId);
    state.timerId = undefined;
  }
  state.playing = false;
}

function startPlayback() {
  stopPlayback();
  state.playing = true;
  state.timerId = setTimeout(scheduleNextWord, calculateDelay());
  renderWord();
}

function setWords(words: string[]) {
  state.words = words;
  state.index = 0;
  renderWord();
}

async function loadSelection() {
  const selection = await readSelection();
  const prefs = await readReaderPreferences();
  state.wordsPerMinute = prefs.wordsPerMinute;
  state.persistSelection = prefs.persistSelection;

  const slider = document.getElementById('sliderWpm') as HTMLInputElement | null;
  if (slider) {
    slider.value = String(state.wordsPerMinute);
  }

  const rawText = selection?.text ? decodeHtml(selection.text) : '';
  const normalised = rawText.replace(/\s+/g, ' ').trim();
  const words = normalised.length > 0 ? normalised.split(' ') : [];
  setWords(words);
  state.playing = false;
  renderWord();
}

function registerControls() {
  const playButton = document.getElementById('btnPlay');
  const restartButton = document.getElementById('btnRestart');
  const slider = document.getElementById('sliderWpm') as HTMLInputElement | null;

  playButton?.addEventListener('click', () => {
    if (state.words.length === 0) {
      return;
    }
    if (state.playing) {
      stopPlayback();
    } else {
      startPlayback();
    }
  });

  restartButton?.addEventListener('click', () => {
    state.index = 0;
    if (!state.playing) {
      renderWord();
    }
  });

  slider?.addEventListener('input', () => {
    const value = Number.parseInt(slider.value, 10) || 400;
    state.wordsPerMinute = value;
    renderWord();
    void writeReaderPreferences({ wordsPerMinute: value, persistSelection: state.persistSelection });
  });
}

function registerMessageListener() {
  browser.runtime.onMessage.addListener((rawMessage) => {
    const message = rawMessage as ReaderMessage;
    if (message.target !== 'reader') {
      return undefined;
    }
    if (message.type === 'refreshReader') {
      void loadSelection();
      return true;
    }
    return undefined;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  void loadSelection();
  registerControls();
  registerMessageListener();
});
