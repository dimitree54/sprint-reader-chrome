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

// Simple frequency database for common English words
const WORD_FREQUENCIES: Record<string, number> = {
  'the': 4038615, 'of': 2086675, 'and': 1620968, 'a': 1543676, 'to': 1458447,
  'in': 1141261, 'is': 1052329, 'you': 996657, 'that': 956536, 'it': 956535,
  'he': 908351, 'was': 857775, 'for': 831445, 'on': 757344, 'are': 729492,
  'as': 681214, 'with': 668014, 'his': 649825, 'they': 567529, 'i': 567526,
  'at': 548989, 'be': 527405, 'this': 524724, 'have': 524220, 'from': 481918,
  'or': 474471, 'one': 441628, 'had': 437324, 'by': 424948, 'word': 422444,
  'but': 418859, 'not': 409251, 'what': 390097, 'all': 386888, 'were': 378193,
  'we': 344788, 'when': 332733, 'your': 328163, 'can': 327473, 'said': 318318,
  'there': 314887, 'each': 304613, 'which': 301080, 'she': 293048, 'do': 289925,
  'how': 289414, 'their': 285391, 'if': 284992, 'will': 256933, 'up': 254545,
  'other': 236431, 'about': 235524, 'out': 233949, 'many': 230372, 'then': 229761,
  'them': 225991, 'these': 221260, 'so': 219056, 'some': 218068, 'her': 216867,
  'would': 214398, 'make': 208712, 'like': 206476, 'into': 199722, 'him': 195186,
  'has': 193023, 'two': 191427, 'more': 189019, 'very': 188068, 'after': 186716,
  'words': 183525, 'first': 179954, 'its': 176551, 'new': 174624, 'who': 171587,
  'could': 168283, 'time': 167336, 'been': 159753, 'call': 157945, 'way': 157325,
  'find': 157062, 'right': 155327, 'may': 154350, 'down': 152893, 'side': 152370
};

function getWordFrequency(word: string): number {
  const lowerWord = word.toLowerCase().replace(/[^a-z]/g, '');
  return WORD_FREQUENCIES[lowerWord] || 1000; // Default frequency for unknown words
}

function calculateShannonEntropy(text: string): number {
  const chars = text.toLowerCase().split('');
  const frequencies: Record<string, number> = {};

  // Count character frequencies
  chars.forEach(char => {
    frequencies[char] = (frequencies[char] || 0) + 1;
  });

  // Calculate entropy
  let entropy = 0;
  Object.values(frequencies).forEach(freq => {
    const probability = freq / chars.length;
    entropy -= probability * Math.log2(probability);
  });

  return entropy;
}

function detectPunctuation(text: string): { hasComma: boolean; hasPeriod: boolean; isParagraph: boolean } {
  return {
    hasComma: /[,;:]/.test(text),
    hasPeriod: /[.!?]/.test(text),
    isParagraph: text.includes('\n\n') || text.includes('\r\n\r\n')
  };
}

function calculateWordTiming(wordItem: WordItem): number {
  const baseDuration = Math.max(60_000 / Math.max(100, state.wordsPerMinute), 20);
  const frequency = wordItem.frequency || getWordFrequency(wordItem.text);
  const entropy = calculateShannonEntropy(wordItem.text);

  let multiplier = 1.0;

  // Очень частые слова (the, and, is, etc.): быстрее
  if (frequency >= 1000000) {
    multiplier = 0.7;
  }
  // Частые слова: немного быстрее
  else if (frequency >= 100000) {
    multiplier = 0.85;
  }
  // Обычные слова: стандартно
  else if (frequency >= 10000) {
    multiplier = 1.0;
  }
  // Редкие слова: медленнее
  else if (frequency >= 1000) {
    multiplier = 1.2;
  }
  // Очень редкие/сложные слова: значительно медленнее
  else {
    multiplier = 1.5;
  }

  // Дополнительная корректировка по энтропии
  const entropyAdjustment = Math.min(entropy / 4.0, 0.3);
  multiplier += entropyAdjustment;

  return baseDuration * multiplier;
}

function calculatePunctuationTiming(wordItem: WordItem): { predelay: number; postdelay: number } {
  const punctuation = detectPunctuation(wordItem.text);
  const baseDuration = Math.max(60_000 / Math.max(100, state.wordsPerMinute), 20);

  let predelay = 0;
  let postdelay = 0;

  // Новые множители согласно требованию
  if (state.pauseAfterComma && punctuation.hasComma) {
    postdelay += baseDuration * 0.5; // ×1.5 для запятой
  }

  if (state.pauseAfterPeriod && punctuation.hasPeriod) {
    postdelay += baseDuration * 1.0; // ×2.0 для точки/вопроса/восклицания
  }

  if (state.pauseAfterParagraph && punctuation.isParagraph) {
    postdelay += baseDuration * 2.5; // ×3-4 для абзаца (среднее 3.5)
  }

  return { predelay, postdelay };
}

function createWordItem(text: string, isNewParagraph: boolean = false): WordItem {
  const wordLength = text.length;
  const frequency = getWordFrequency(text);

  // Calculate timing using advanced word frequency algorithm
  const duration = Math.max(50, Math.min(2000, calculateWordTiming({ text, wordLength, frequency } as WordItem)));

  // Calculate punctuation delays
  const timing = calculatePunctuationTiming({ text, wordLength } as WordItem);

  return {
    text,
    optimalLetterPosition: assignOptimalLetterPosition(text),
    duration,
    predelay: timing.predelay,
    postdelay: timing.postdelay,
    wordLength,
    frequency,
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
  duration: number;
  predelay: number;
  postdelay: number;
  wordLength: number;
  frequency?: number;
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
  pauseAfterComma: boolean;
  pauseAfterPeriod: boolean;
  pauseAfterParagraph: boolean;
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
  pauseAfterComma: true,
  pauseAfterPeriod: true,
  pauseAfterParagraph: true,
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
  const currentWordItem = state.wordItems[state.index];
  if (currentWordItem) {
    return currentWordItem.duration + currentWordItem.postdelay;
  }
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
  // Create word items with paragraph detection
  state.wordItems = words.map((word, index) => {
    // Simple paragraph detection - check if previous word ended with double newline
    const isNewParagraph = index > 0 && words[index - 1].includes('\n\n');
    return createWordItem(word, isNewParagraph);
  });
  state.index = 0;
  renderWord();
}

async function loadSelection() {
  const selection = await readSelection();
  const prefs = await readReaderPreferences();
  state.wordsPerMinute = prefs.wordsPerMinute;
  state.persistSelection = prefs.persistSelection;
  state.pauseAfterComma = prefs.pauseAfterComma;
  state.pauseAfterPeriod = prefs.pauseAfterPeriod;
  state.pauseAfterParagraph = prefs.pauseAfterParagraph;

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

    // Recalculate timing for all words with new WPM
    state.wordItems = state.words.map((word, index) => {
      const isNewParagraph = index > 0 && state.words[index - 1].includes('\n\n');
      return createWordItem(word, isNewParagraph);
    });

    renderWord();
    void writeReaderPreferences({
      wordsPerMinute: value,
      persistSelection: state.persistSelection,
      pauseAfterComma: state.pauseAfterComma,
      pauseAfterPeriod: state.pauseAfterPeriod,
      pauseAfterParagraph: state.pauseAfterParagraph,
    });
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

// Expose state for testing
if (typeof globalThis !== 'undefined') {
  (globalThis as any).state = state;
}
