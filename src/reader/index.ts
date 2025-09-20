import { getBrowser } from '../platform/browser';
import { readReaderPreferences, readSelection, writeReaderPreferences } from '../common/storage';
import type { ReaderMessage } from '../common/messages';

const browser = getBrowser();

function decodeHtml(input: string): string {
  const element = document.createElement('textarea');
  element.innerHTML = input;
  return element.value;
}

function assignOptimalLetterPosition(text: string): number {
  // Algorithm from the original engine.js
  const length = text.length;
  if (length === 1) return 1;
  if (length >= 1 && length <= 4) return 2;
  if (length >= 5 && length <= 9) return 3;
  return 4;
}

function createWordItem(text: string): WordItem {
  return {
    text,
    optimalLetterPosition: assignOptimalLetterPosition(text),
  };
}

function wrapLettersInSpans(text: string): string {
  return text
    .split('')
    .map((char, index) => `<span class="char${index + 1}">${char}</span>`)
    .join('');
}

function highlightOptimalLetter(wordElement: HTMLElement, wordItem: WordItem) {
  if (!state.highlightOptimalLetter) return;

  const letterPosition = wordItem.optimalLetterPosition;
  const charElement = wordElement.querySelector(`.char${letterPosition}`) as HTMLElement;
  if (charElement) {
    charElement.style.color = state.highlightOptimalLetterColor;
  }
}

function calculateOptimalLetterCenterPosition(wordItem: WordItem): number {
  const wordElement = document.getElementById('word');
  if (!wordElement) return 0;

  // Get the optimal letter position (1-based index)
  const optimalPosition = wordItem.optimalLetterPosition;

  // Find the span element for the optimal letter
  const optimalLetterSpan = wordElement.querySelector(`.char${optimalPosition}`) as HTMLElement;
  if (!optimalLetterSpan) return 0;

  // Get the current center position of the optimal letter relative to the viewport
  const letterRect = optimalLetterSpan.getBoundingClientRect();
  const letterCenterX = letterRect.left + letterRect.width / 2;

  return letterCenterX;
}

function setOptimalWordPositioning(wordElement: HTMLElement, wordItem: WordItem) {
  // Reset any previous transforms (keep the translateY(-50%) from CSS)
  wordElement.style.transform = 'translateY(-50%)';

  // Get the current position of the optimal letter center
  const currentLetterCenterX = calculateOptimalLetterCenterPosition(wordItem);

  // Calculate how much to move to center the optimal letter
  const viewportCenterX = window.innerWidth / 2;
  const translateX = viewportCenterX - currentLetterCenterX;

  // Apply the transform to center the optimal letter (combine with vertical centering)
  wordElement.style.transform = `translateY(-50%) translateX(${translateX}px)`;
}

type WordItem = {
  text: string;
  optimalLetterPosition: number;
  pixelOffsetToOptimalLetter?: number;
};

type ReaderState = {
  words: string[];
  wordItems: WordItem[];
  index: number;
  playing: boolean;
  timerId: ReturnType<typeof setTimeout> | undefined;
  wordsPerMinute: number;
  persistSelection: boolean;
  highlightOptimalLetter: boolean;
  highlightOptimalLetterColor: string;
};

const state: ReaderState = {
  words: [],
  wordItems: [],
  index: 0,
  playing: false,
  timerId: undefined,
  wordsPerMinute: 400,
  persistSelection: true,
  highlightOptimalLetter: true,
  highlightOptimalLetterColor: '#FF8C00',
};

function renderWord() {
  const wordElement = document.getElementById('word');
  const statusElement = document.getElementById('labelStatus');
  const progressElement = document.getElementById('labelProgress');
  if (!wordElement || !statusElement || !progressElement) {
    return;
  }

  const currentWordItem = state.wordItems[state.index];
  if (currentWordItem) {
    // Wrap letters in spans for highlighting
    const wrappedText = wrapLettersInSpans(currentWordItem.text);
    wordElement.innerHTML = wrappedText;

    // Apply optimal letter highlighting
    highlightOptimalLetter(wordElement, currentWordItem);

    // Apply optimal word positioning after a brief delay to ensure rendering is complete
    requestAnimationFrame(() => {
      setOptimalWordPositioning(wordElement, currentWordItem);
    });
  } else {
    wordElement.textContent = '';
  }

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
  state.wordItems = words.map(createWordItem);
  state.index = 0;
  renderWord();
}

async function loadSelection() {
  const selection = await readSelection();
  const prefs = await readReaderPreferences();
  state.wordsPerMinute = prefs.wordsPerMinute;
  state.persistSelection = prefs.persistSelection;

  const slider = document.getElementById('sliderWpm') as HTMLInputElement | null;
  const wpmValue = document.getElementById('wpmValue');
  if (slider) {
    slider.value = String(state.wordsPerMinute);
  }
  if (wpmValue) {
    wpmValue.textContent = String(state.wordsPerMinute);
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

    // Update the WPM display
    const wpmValue = document.getElementById('wpmValue');
    if (wpmValue) {
      wpmValue.textContent = String(value);
    }

    renderWord();
    void writeReaderPreferences({ wordsPerMinute: value, persistSelection: state.persistSelection });
  });
}

function registerMessageListener() {
  browser.runtime.onMessage.addListener((rawMessage: unknown) => {
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
