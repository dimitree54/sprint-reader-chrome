import { calculateWordTiming, calculatePunctuationTiming } from './timing/durations'
import type { TimingSettings, WordItem } from './timing/types'

export interface TimeProgress {
  totalDurationMs: number
  elapsedMs: number
  remainingMs: number
  progressPercent: number
}

/**
 * Calculate the total reading time for all word items
 */
export function calculateTotalReadingTime(wordItems: WordItem[], settings: TimingSettings): number {
  let totalMs = 0

  for (const wordItem of wordItems) {
    // Calculate word timing
    const wordDuration = calculateWordTiming(wordItem, settings)
    totalMs += wordDuration

    // Calculate punctuation delays
    const { postdelay } = calculatePunctuationTiming(wordItem, settings)
    totalMs += postdelay
  }

  return totalMs
}

/**
 * Calculate elapsed time up to the current index
 */
export function calculateElapsedTime(wordItems: WordItem[], currentIndex: number, settings: TimingSettings): number {
  let elapsedMs = 0

  for (let i = 0; i <= currentIndex && i < wordItems.length; i++) {
    const wordItem = wordItems[i]

    // Calculate word timing
    const wordDuration = calculateWordTiming(wordItem, settings)
    elapsedMs += wordDuration

    // Calculate punctuation delays
    const { postdelay } = calculatePunctuationTiming(wordItem, settings)
    elapsedMs += postdelay
  }

  return elapsedMs
}

/**
 * Get comprehensive time progress information
 */
export function getTimeProgress(wordItems: WordItem[], currentIndex: number, settings: TimingSettings): TimeProgress {
  const totalDurationMs = calculateTotalReadingTime(wordItems, settings)
  const elapsedMs = calculateElapsedTime(wordItems, currentIndex, settings)
  const remainingMs = Math.max(0, totalDurationMs - elapsedMs)
  const progressPercent = totalDurationMs > 0 ? Math.min(100, (elapsedMs / totalDurationMs) * 100) : 0

  return {
    totalDurationMs,
    elapsedMs,
    remainingMs,
    progressPercent
  }
}

/**
 * Format the remaining time in -HH:MM:SS format
 */
export function formatEta(remainingMs: number): string {
  const safeMs = Math.max(0, remainingMs)
  const totalSeconds = Math.ceil(safeMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const hoursStr = String(hours).padStart(2, '0')
  const minutesStr = String(minutes).padStart(2, '0')
  const secondsStr = String(seconds).padStart(2, '0')

  return `-${hoursStr}:${minutesStr}:${secondsStr}`
}