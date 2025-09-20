import { getBrowser } from '../platform/browser';
import {
  readReaderPreferences,
  readSelection,
  writeReaderPreferences,
  type ReaderTheme,
} from '../common/storage';
import type { ReaderMessage } from '../common/messages';
import { preprocessText } from './text-processor';
import { createChunks, type WordItem, type TimingSettings } from './timing-engine';
import {
  wrapLettersInSpans,
  highlightOptimalLetter,
  setOptimalWordPositioning,
  applyFlickerEffect,
  calculateOptimalFontSizeForText,
  type VisualSettings
} from './visual-effects';

const browser = getBrowser();

function decodeHtml(input: string): string {
  const element = document.createElement('textarea');
  element.innerHTML = input;
  return element.value;
}

type ReaderState = {
  words: string[];
  wordItems: WordItem[];
  index: number;
  playing: boolean;
  timerId: ReturnType<typeof setTimeout> | undefined;
  wordsPerMinute: number;
  highlightOptimalLetter: boolean;
  highlightOptimalLetterColor: string;
  pauseAfterComma: boolean;
  pauseAfterPeriod: boolean;
  pauseAfterParagraph: boolean;
  chunkSize: number;
  wordFlicker: boolean;
  wordFlickerPercent: number;
  optimalFontSize: string;
  theme: ReaderTheme;
};

const state: ReaderState = {
  words: [],
  wordItems: [],
  index: 0,
  playing: false,
  timerId: undefined,
  wordsPerMinute: 400,
  highlightOptimalLetter: true,
  highlightOptimalLetterColor: '#FF8C00',
  pauseAfterComma: true,
  pauseAfterPeriod: true,
  pauseAfterParagraph: true,
  chunkSize: 1,
  wordFlicker: false,
  wordFlickerPercent: 10,
  optimalFontSize: '128px',
  theme: 'dark',
};

function applyTheme(theme: ReaderTheme) {
  const body = document.body;
  if (!body) {
    return;
  }

  body.classList.toggle('reader--light', theme === 'light');
  body.classList.toggle('reader--dark', theme !== 'light');
  body.dataset.theme = theme;
}

function persistReaderPreferences() {
  void writeReaderPreferences({
    wordsPerMinute: state.wordsPerMinute,
    persistSelection: true, // Fixed value since we don't use it in UI
    pauseAfterComma: state.pauseAfterComma,
    pauseAfterPeriod: state.pauseAfterPeriod,
    pauseAfterParagraph: state.pauseAfterParagraph,
    chunkSize: state.chunkSize,
    wordFlicker: state.wordFlicker,
    wordFlickerPercent: state.wordFlickerPercent,
    theme: state.theme,
  });
}

function getTimingSettings(): TimingSettings {
  return {
    wordsPerMinute: state.wordsPerMinute,
    pauseAfterComma: state.pauseAfterComma,
    pauseAfterPeriod: state.pauseAfterPeriod,
    pauseAfterParagraph: state.pauseAfterParagraph,
    chunkSize: state.chunkSize,
  };
}

function getVisualSettings(): VisualSettings {
  return {
    highlightOptimalLetter: state.highlightOptimalLetter,
    highlightOptimalLetterColor: state.highlightOptimalLetterColor,
    wordFlicker: state.wordFlicker,
    wordFlickerPercent: state.wordFlickerPercent,
  };
}

function renderWord() {
  const wordElement = document.getElementById('word');
  const statusElement = document.getElementById('labelStatus');
  const progressElement = document.getElementById('labelProgress');
  if (!wordElement || !statusElement || !progressElement) {
    return;
  }

  const currentWordItem = state.wordItems[state.index];
  if (currentWordItem) {
    // Apply the pre-calculated font size
    wordElement.style.fontSize = state.optimalFontSize;

    // Wrap letters in spans for highlighting
    const wrappedText = wrapLettersInSpans(currentWordItem.text);
    wordElement.innerHTML = wrappedText;

    const visualSettings = getVisualSettings();

    // Apply optimal letter highlighting
    highlightOptimalLetter(wordElement, currentWordItem, visualSettings);

    // Apply optimal word positioning
    setOptimalWordPositioning(wordElement, currentWordItem);

    // Apply word flicker effect if enabled
    if (state.playing) {
      applyFlickerEffect(wordElement, currentWordItem, visualSettings);
    }
  } else {
    wordElement.textContent = '';
  }

  statusElement.textContent = state.playing ? 'Playing' : 'Paused';
  if (state.wordItems.length > 0) {
    const shown = Math.min(state.index + 1, state.wordItems.length);
    const total = state.wordItems.length;
    const percent = Math.min(100, Math.round((shown / total) * 100));
    progressElement.textContent = `${percent}% • ${shown} / ${total}`;
  } else {
    progressElement.textContent = '';
  }

  const playButton = document.getElementById('btnPlay');
  if (playButton) {
    playButton.textContent = state.playing ? 'Pause' : 'Play';
  }
}

function calculateDelay(): number {
  const currentWordItem = state.wordItems[state.index];
  if (currentWordItem) {
    const delay = (currentWordItem.duration ?? 0) + (currentWordItem.postdelay ?? 0);
    return Math.max(delay, 20);
  }
  return Math.max(60_000 / Math.max(100, state.wordsPerMinute), 20);
}

function scheduleNextWord() {
  if (!state.playing) {
    return;
  }

  if (state.index >= state.wordItems.length - 1) {
    state.playing = false;
    renderWord();
    return;
  }

  state.index++;
  state.timerId = setTimeout(scheduleNextWord, calculateDelay());
  renderWord();
}

function stopPlayback() {
  state.playing = false;
  if (state.timerId) {
    clearTimeout(state.timerId);
    state.timerId = undefined;
  }
}

function startPlayback() {
  stopPlayback();
  state.playing = true;
  state.timerId = setTimeout(scheduleNextWord, calculateDelay());
  renderWord();
}

function setWords(words: string[]) {
  state.words = words;

  // Use advanced preprocessing and chunking
  const rawText = words.join(' ');
  const preprocessedWords = preprocessText(rawText);
  const timingSettings = getTimingSettings();
  state.wordItems = createChunks(preprocessedWords, timingSettings);

  // Calculate optimal font size for the entire text
  state.optimalFontSize = calculateOptimalFontSizeForText(state.wordItems);

  state.index = 0;
  renderWord();
}

async function loadSelection() {
  const selection = await readSelection();
  const prefs = await readReaderPreferences();
  state.wordsPerMinute = prefs.wordsPerMinute;
  state.pauseAfterComma = prefs.pauseAfterComma;
  state.pauseAfterPeriod = prefs.pauseAfterPeriod;
  state.pauseAfterParagraph = prefs.pauseAfterParagraph;
  state.chunkSize = prefs.chunkSize;
  state.wordFlicker = prefs.wordFlicker;
  state.wordFlickerPercent = prefs.wordFlickerPercent;
  state.theme = prefs.theme;

  applyTheme(state.theme);

  const slider = document.getElementById('sliderWpm') as HTMLInputElement | null;
  const wpmValue = document.getElementById('wpmValue');
  if (slider) {
    slider.value = String(state.wordsPerMinute);
  }
  if (wpmValue) {
    wpmValue.textContent = String(state.wordsPerMinute);
  }

  const themeToggle = document.getElementById('toggleTheme') as HTMLInputElement | null;
  if (themeToggle) {
    themeToggle.checked = state.theme === 'light';
  }

  const rawText = selection?.text ? decodeHtml(selection.text) : '';
  const normalised = rawText.replace(/\s+/g, ' ').trim();
  const words = normalised.length > 0 ? normalised.split(' ') : [];

  setWords(words);
}

function registerControls() {
  const playButton = document.getElementById('btnPlay');
  playButton?.addEventListener('click', () => {
    if (state.playing) {
      stopPlayback();
    } else {
      startPlayback();
    }
    renderWord();
  });

  const restartButton = document.getElementById('btnRestart');
  restartButton?.addEventListener('click', () => {
    stopPlayback();
    state.index = 0;
    renderWord();
  });

  const slider = document.getElementById('sliderWpm') as HTMLInputElement | null;
  slider?.addEventListener('input', () => {
    const value = Number.parseInt(slider.value, 10) || 400;
    state.wordsPerMinute = value;

    // Update the WPM display
    const wpmValue = document.getElementById('wpmValue');
    if (wpmValue) {
      wpmValue.textContent = String(value);
    }

    // Recalculate timing for all words with new WPM
    const rawText = state.words.join(' ');
    const preprocessedWords = preprocessText(rawText);
    const timingSettings = getTimingSettings();
    state.wordItems = createChunks(preprocessedWords, timingSettings);

    // Recalculate optimal font size for the new word items
    state.optimalFontSize = calculateOptimalFontSizeForText(state.wordItems);

    renderWord();
    persistReaderPreferences();
  });

  const themeToggle = document.getElementById('toggleTheme') as HTMLInputElement | null;
  themeToggle?.addEventListener('change', () => {
    state.theme = themeToggle.checked ? 'light' : 'dark';
    applyTheme(state.theme);
    persistReaderPreferences();
  });

  // Handle window resize to recalculate font sizes
  let resizeTimeout: ReturnType<typeof setTimeout> | undefined;
  window.addEventListener('resize', () => {
    // Debounce resize events to avoid excessive recalculations
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }
    resizeTimeout = setTimeout(() => {
      // Recalculate optimal font size for new window size
      if (state.wordItems.length > 0) {
        state.optimalFontSize = calculateOptimalFontSizeForText(state.wordItems);
      }
      renderWord();
    }, 150);
  });
}

function registerMessageListener() {
  browser.runtime.onMessage.addListener((rawMessage: unknown) => {
    const message = rawMessage as ReaderMessage;
    if (message.target !== 'reader') {
      return undefined;
    }

    switch (message.type) {
      case 'refreshReader':
        void loadSelection();
        return true;
      default:
        return undefined;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  void loadSelection();
  registerControls();
  registerMessageListener();
});

// Expose state for testing
if (typeof globalThis !== 'undefined') {
  (globalThis as any).state = state;
}