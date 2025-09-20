/**
 * Advanced timing engine for RSVP reading
 * Implements word frequency + Shannon entropy algorithm
 * with punctuation pauses and chunking support
 */

export type WordItem = {
  text: string;
  originalText: string;
  optimalLetterPosition: number;
  pixelOffsetToOptimalLetter?: number;
  duration: number;
  predelay: number;
  postdelay: number;
  wordLength: number;
  frequency?: number;
  wordsInChunk: number;
  isGrouped: boolean;
};

export type TimingSettings = {
  wordsPerMinute: number;
  pauseAfterComma: boolean;
  pauseAfterPeriod: boolean;
  pauseAfterParagraph: boolean;
  chunkSize: number;
};

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

export function getWordFrequency(word: string): number {
  const lowerWord = word.toLowerCase().replace(/[^a-z]/g, '');
  return WORD_FREQUENCIES[lowerWord] || 1000; // Default frequency for unknown words
}

export function calculateShannonEntropy(text: string): number {
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

export function detectPunctuation(text: string): { hasComma: boolean; hasPeriod: boolean; isParagraph: boolean } {
  return {
    hasComma: /[,;:]/.test(text),
    hasPeriod: /[.!?]/.test(text),
    isParagraph: text.includes('\n\n') || text.includes('\r\n\r\n')
  };
}

export function assignOptimalLetterPosition(text: string): number {
  const indices: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== ' ') {
      indices.push(i + 1); // 1-based for .charN spans
    }
  }

  const count = indices.length;
  if (count === 0) return 1;
  if (count === 1) return indices[0];
  if (count <= 4) return indices[1] ?? indices[count - 1];
  if (count <= 9) return indices[2] ?? indices[count - 1];
  return indices[3] ?? indices[count - 1];
}

export function calculateWordTiming(wordItem: WordItem, settings: TimingSettings): number {
  const baseDuration = Math.max(60_000 / Math.max(100, settings.wordsPerMinute), 20);
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

export function calculatePunctuationTiming(wordItem: WordItem, settings: TimingSettings): { predelay: number; postdelay: number } {
  const punctuation = detectPunctuation(wordItem.text);
  const baseDuration = Math.max(60_000 / Math.max(100, settings.wordsPerMinute), 20);

  let predelay = 0;
  let postdelay = 0;

  // Новые множители согласно требованию
  if (settings.pauseAfterComma && punctuation.hasComma) {
    postdelay += baseDuration * 0.5; // ×1.5 для запятой
  }

  if (settings.pauseAfterPeriod && punctuation.hasPeriod) {
    postdelay += baseDuration * 1.0; // ×2.0 для точки/вопроса/восклицания
  }

  if (settings.pauseAfterParagraph && punctuation.isParagraph) {
    postdelay += baseDuration * 2.5; // ×3-4 для абзаца (среднее 3.5)
  }

  return { predelay, postdelay };
}

export function createWordItem(text: string, settings: TimingSettings, isNewParagraph: boolean = false): WordItem {
  const wordLength = text.length;
  const frequency = getWordFrequency(text);

  // Calculate timing using advanced word frequency algorithm
  const duration = Math.max(50, Math.min(2000, calculateWordTiming({ text, wordLength, frequency } as WordItem, settings)));

  // Calculate punctuation delays
  const timing = calculatePunctuationTiming({ text, wordLength } as WordItem, settings);

  return {
    text,
    originalText: text,
    optimalLetterPosition: assignOptimalLetterPosition(text),
    duration,
    predelay: timing.predelay,
    postdelay: timing.postdelay,
    wordLength,
    frequency,
    wordsInChunk: 1,
    isGrouped: false,
  };
}

export function createChunks(words: string[], settings: TimingSettings): WordItem[] {
  if (settings.chunkSize <= 1) {
    return words.map(word => createWordItem(word, settings, false));
  }

  const chunks: WordItem[] = [];
  let i = 0;

  while (i < words.length) {
    let chunkWords = [words[i]];
    let j = i + 1;

    // Group short words (≤ 3 characters) up to chunkSize
    while (j < words.length &&
           chunkWords.length < settings.chunkSize &&
           words[j].length <= 3 &&
           !/[.!?]/.test(words[j]) &&    // Don't chunk across sentences
           !/\n/.test(words[j])) {       // Don't chunk across paragraphs
      chunkWords.push(words[j]);
      j++;
    }

    // Create chunk
    const chunkText = chunkWords.join(' ');
    const wordItem = createWordItem(chunkText, settings, false);
    wordItem.wordsInChunk = chunkWords.length;
    wordItem.isGrouped = chunkWords.length > 1;
    wordItem.originalText = chunkWords.join(' ');

    // Adjust timing for chunks (slight speed bonus)
    if (wordItem.isGrouped) {
      wordItem.duration = wordItem.duration * 0.9; // 10% faster for grouped words
    }

    chunks.push(wordItem);
    i = j;
  }

  return chunks;
}