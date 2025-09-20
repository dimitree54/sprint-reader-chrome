import { assignOptimalLetterPosition, getWordFrequency } from './word-analysis'
import { calculatePunctuationTiming, calculateWordTiming } from './durations'
import type { TimingSettings, WordItem } from './types'

export function createWordItem (text: string, settings: TimingSettings): WordItem {
  const wordLength = text.length
  const frequency = getWordFrequency(text)

  const duration = calculateWordTiming({ text, wordLength, frequency } as WordItem, settings)
  const timing = calculatePunctuationTiming({ text, wordLength } as WordItem, settings)

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
    isGrouped: false
  }
}

export function createChunks (words: string[], settings: TimingSettings): WordItem[] {
  if (settings.chunkSize <= 1) {
    return words.map(word => createWordItem(word, settings))
  }

  const chunks: WordItem[] = []
  let i = 0

  while (i < words.length) {
    const chunkWords = [words[i]]
    let j = i + 1

    while (
      j < words.length &&
      chunkWords.length < settings.chunkSize &&
      words[j].length <= 3 &&
      !/[.!?]/.test(words[j]) &&
      !/\n/.test(words[j])
    ) {
      chunkWords.push(words[j])
      j++
    }

    const chunkText = chunkWords.join(' ')
    const wordItem = createWordItem(chunkText, settings)
    wordItem.wordsInChunk = chunkWords.length
    wordItem.isGrouped = chunkWords.length > 1
    wordItem.originalText = chunkWords.join(' ')

    if (wordItem.isGrouped) {
      wordItem.duration = wordItem.duration * 0.9
    }

    chunks.push(wordItem)
    i = j
  }

  return chunks
}
