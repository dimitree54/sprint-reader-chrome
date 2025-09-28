import { preprocessText } from '../text-processor'
import { createChunks } from './chunking'
import { calculateWordTiming, calculatePunctuationTiming } from './durations'
import { getWordFrequency, calculateShannonEntropy, detectPunctuation, assignOptimalLetterPosition } from './word-analysis'
import type { TimingSettings, WordItem } from './types'

export type TimingPreferences = TimingSettings

export class TimingService {
  analyzeWordComplexity (word: string): { frequency: number; entropy: number } {
    return {
      frequency: getWordFrequency(word),
      entropy: calculateShannonEntropy(word)
    }
  }

  calculateChunkDurations (words: WordItem[], prefs: TimingPreferences): WordItem[] {
    return words.map((w) => {
      const duration = calculateWordTiming(w, prefs)
      const punct = calculatePunctuationTiming(w, prefs)
      return { ...w, duration, predelay: punct.predelay, postdelay: punct.postdelay }
    })
  }

  optimizeChunking (words: { text: string; isBold: boolean }[], prefs: TimingPreferences): WordItem[] {
    return createChunks(words, prefs)
  }

  calculateWordTimingFromText (text: string, prefs: TimingPreferences): WordItem[] {
    const words = preprocessText(text)
    const chunks = this.optimizeChunking(words, prefs)
    return this.calculateChunkDurations(chunks, prefs)
  }

  // Exposure of useful helpers used elsewhere
  detectPunctuation = detectPunctuation
  assignOptimalLetterPosition = assignOptimalLetterPosition
}

export const timingService = new TimingService()

