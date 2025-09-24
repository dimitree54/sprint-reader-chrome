import { calculateWordTiming, calculatePunctuationTiming } from './timing/durations'
import type { TimingSettings, WordItem } from './timing/types'

export interface TimeProgress {
  totalDurationMs: number
  elapsedMs: number
  remainingMs: number
  progressPercent: number
}

export interface FormattedTime {
  minutes: number
  seconds: number
  display: string
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
 * Format milliseconds into a readable time format
 */
export function formatTime(ms: number): FormattedTime {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  let display: string
  if (minutes > 0) {
    display = `${minutes}m ${seconds}s`
  } else {
    display = `${seconds}s`
  }

  return {
    minutes,
    seconds,
    display
  }
}

/**
 * Format time remaining display with context
 */
export function formatTimeRemaining(remainingMs: number): string {
  if (remainingMs <= 0) {
    return 'Complete'
  }

  const { display } = formatTime(remainingMs)
  return `${display} left`
}

/**
 * Format progress percentage for display
 */
export function formatProgressPercent(percent: number): string {
  return `${Math.round(percent)}%`
}