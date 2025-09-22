import { assignOptimalLetterPosition, getWordFrequency } from './word-analysis'
import { calculatePunctuationTiming, calculateWordTiming } from './durations'
import type { TimingSettings, WordItem } from './types'
import type { WordInfo } from '../text-processor'
import { DEFAULTS } from '../../config/defaults'

export function createWordItem (wordInfo: WordInfo, settings: TimingSettings): WordItem {
  const text = wordInfo.text
  const wordLength = text.length
  const frequency = getWordFrequency(text)

  const duration = calculateWordTiming({ text, wordLength, frequency } as WordItem, settings)
  const timing = calculatePunctuationTiming({ text, wordLength } as WordItem, settings)

  // Apply 1.5x timing multiplier for bold words
  const adjustedDuration = wordInfo.isBold ? duration * 1.5 : duration

  return {
    text,
    originalText: text,
    optimalLetterPosition: assignOptimalLetterPosition(text),
    duration: adjustedDuration,
    predelay: timing.predelay,
    postdelay: timing.postdelay,
    wordLength,
    frequency,
    wordsInChunk: 1,
    isGrouped: false,
    isBold: wordInfo.isBold
  }
}

export function createChunks (words: WordInfo[], settings: TimingSettings): WordItem[] {
  if (settings.chunkSize <= 1) {
    return words.map(word => createWordItem(word, settings))
  }

  const chunks: WordItem[] = []
  let i = 0

  while (i < words.length) {
    const chunkWords = [words[i]]
    let j = i + 1

    // Only attempt grouping if the first word is ≤3 characters AND doesn't end with punctuation or contain newlines
    const canGroup = words[i].text.length <= DEFAULTS.WORD_PROCESSING.maxWordLengthForGrouping &&
      !/[.!?]/.test(words[i].text) &&
      !/\n/.test(words[i].text)

    while (
      canGroup &&
      j < words.length &&
      chunkWords.length < settings.chunkSize &&
      words[j].text.length <= DEFAULTS.WORD_PROCESSING.maxWordLengthForGrouping &&
      !/[.!?]/.test(words[j].text) &&
      !/\n/.test(words[j].text)
    ) {
      chunkWords.push(words[j])
      j++
    }

    const chunkText = chunkWords.map(w => w.text).join(' ')
    const hasBoldWords = chunkWords.some(w => w.isBold)

    // Create base word item using the first word's bold status (will be overridden)
    const wordItem = createWordItem({ text: chunkText, isBold: false }, settings)
    wordItem.wordsInChunk = chunkWords.length
    wordItem.isGrouped = chunkWords.length > 1
    wordItem.originalText = chunkWords.map(w => w.text).join(' ')

    // Apply grouping speed bonus
    if (wordItem.isGrouped) {
      wordItem.duration = wordItem.duration * 0.9
    }

    // Apply 1.5x timing multiplier if any word in chunk is bold
    if (hasBoldWords) {
      wordItem.duration = wordItem.duration * 1.5
      wordItem.isBold = true // Mark the entire chunk as bold for display purposes
    }

    chunks.push(wordItem)
    i = j
  }

  return chunks
}
