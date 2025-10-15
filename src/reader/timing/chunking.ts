import { assignOptimalLetterPosition, getWordFrequency } from './word-analysis'
import { calculatePunctuationTiming, calculateWordTiming } from './durations'
import type { TimingSettings, WordItem } from './types'
import type { WordInfo } from '../text-processor'
import { DEFAULTS } from '../../config/defaults'

const PUNCT_OR_BREAK_RE = /[.!?]|\n/

function isGroupable (text: string): boolean {
  return text.length <= DEFAULTS.WORD_PROCESSING.maxWordLengthForGrouping &&
    !PUNCT_OR_BREAK_RE.test(text)
}

export function createWordItem (wordInfo: WordInfo, settings: TimingSettings): WordItem {
  const text = wordInfo.text
  const wordLength = text.length
  const frequency = getWordFrequency(text)

  const duration = calculateWordTiming({ text, wordLength, frequency } as WordItem, settings)
  const timing = calculatePunctuationTiming({ text, wordLength } as WordItem, settings)

  // Apply 5x timing multiplier for bold words
  let adjustedDuration = wordInfo.isBold ? duration * DEFAULTS.TIMING.MULTIPLIERS.bold : duration

  // Apply multiplier for chunks with non-letter characters
  const hasNonLetter = /[^a-zA-Z\s]/.test(wordInfo.text)
  if (hasNonLetter) {
    adjustedDuration *= DEFAULTS.TIMING.MULTIPLIERS.nonLetterChunk
  }

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

function collectChunkWords (startIndex: number, words: WordInfo[], settings: TimingSettings): { chunkWords: WordInfo[], nextIndex: number } {
  const chunkWords = [words[startIndex]]
  let nextIndex = startIndex + 1

  if (!isGroupable(words[startIndex].text)) {
    return { chunkWords, nextIndex }
  }

  while (
    nextIndex < words.length &&
    chunkWords.length < settings.chunkSize &&
    isGroupable(words[nextIndex].text)
  ) {
    chunkWords.push(words[nextIndex])
    nextIndex++
  }

  return { chunkWords, nextIndex }
}

function groupWordsIntoChunks (words: WordInfo[], settings: TimingSettings): WordItem[] {
  const chunks: WordItem[] = []
  let i = 0

  while (i < words.length) {
    const { chunkWords, nextIndex } = collectChunkWords(i, words, settings)

    const chunkText = chunkWords.map(w => w.text).join(' ')
    const hasBoldWords = chunkWords.some(w => w.isBold)

    const wordItem = createWordItem({ text: chunkText, isBold: false }, settings)
    wordItem.wordsInChunk = chunkWords.length
    wordItem.isGrouped = chunkWords.length > 1
    wordItem.originalText = chunkWords.map(w => w.text).join(' ')

    if (wordItem.isGrouped) {
      wordItem.duration *= DEFAULTS.TIMING.MULTIPLIERS.groupedChunk
    }

    if (hasBoldWords) {
      wordItem.duration *= DEFAULTS.TIMING.MULTIPLIERS.bold
      wordItem.isBold = true
    }

    chunks.push(wordItem)
    i = nextIndex
  }
  return chunks
}

function mergeChunksWithoutOptimalLetter (chunks: WordItem[]): WordItem[] {
  if (chunks.length < 2) {
    return chunks
  }

  const mergedChunks: WordItem[] = [chunks[0]]
  for (let i = 1; i < chunks.length; i++) {
    const currentChunk = chunks[i]

    if (currentChunk.optimalLetterPosition === 0 && mergedChunks.length > 0) {
      const previousChunk = mergedChunks[mergedChunks.length - 1]
      previousChunk.text += ` ${currentChunk.text}`
      previousChunk.originalText += ` ${currentChunk.originalText}`
      previousChunk.duration += currentChunk.duration
      previousChunk.wordsInChunk += currentChunk.wordsInChunk
      previousChunk.postdelay = currentChunk.postdelay
      previousChunk.isBold = previousChunk.isBold || currentChunk.isBold
    } else {
      mergedChunks.push(currentChunk)
    }
  }
  return mergedChunks
}

export function createChunks (words: WordInfo[], settings: TimingSettings): WordItem[] {
  let baseChunks: WordItem[]

  if (settings.chunkSize <= 1) {
    baseChunks = words.map(word => createWordItem(word, settings))
  } else {
    baseChunks = groupWordsIntoChunks(words, settings)
  }

  return mergeChunksWithoutOptimalLetter(baseChunks)
}