import { calculateShannonEntropy, detectPunctuation, getWordFrequency } from './word-analysis'
import type { TimingSettings, WordItem } from './types'
import { DEFAULTS } from '../../config/defaults'

const MIN_WPM = DEFAULTS.TIMING.minimumWpmForCalculation
const MAX_DELAY_MS = 2000
const MIN_DELAY_MS = 50

const baseDurationFor = (settings: TimingSettings): number => {
  const modifiedWpm = settings.wordsPerMinute * DEFAULTS.TIMING.wpmModifier
  return Math.max(60_000 / Math.max(MIN_WPM, modifiedWpm), DEFAULTS.TIMING.minimumDelayMs)
}

export function calculateWordTiming (wordItem: WordItem, settings: TimingSettings): number {
  const baseDuration = baseDurationFor(settings)
  const frequency = wordItem.frequency || getWordFrequency(wordItem.text)
  const entropy = calculateShannonEntropy(wordItem.text)

  let multiplier = 1.0

  if (frequency >= 1_000_000) {
    multiplier = 0.7
  } else if (frequency >= 100_000) {
    multiplier = 0.85
  } else if (frequency >= 10_000) {
    multiplier = 1.0
  } else if (frequency >= 1_000) {
    multiplier = 1.2
  } else {
    multiplier = 1.5
  }

  const entropyAdjustment = Math.min(entropy / 4.0, 0.3)
  multiplier += entropyAdjustment

  const duration = baseDuration * multiplier
  return Math.max(MIN_DELAY_MS, Math.min(MAX_DELAY_MS, duration))
}

export function calculatePunctuationTiming (
  wordItem: WordItem,
  settings: TimingSettings
): { predelay: number; postdelay: number } {
  const punctuation = detectPunctuation(wordItem.text)
  const baseDuration = baseDurationFor(settings)

  const predelay = 0
  let postdelay = 0

  if (settings.pauseAfterComma && punctuation.hasComma) {
    postdelay += baseDuration * DEFAULTS.TIMING.MULTIPLIERS.commaPause
  }

  if (settings.pauseAfterPeriod && punctuation.hasPeriod) {
    postdelay += baseDuration * DEFAULTS.TIMING.MULTIPLIERS.periodPause
  }

  if (settings.pauseAfterParagraph && punctuation.isParagraph) {
    postdelay += baseDuration * DEFAULTS.TIMING.MULTIPLIERS.paragraphPause
  }

  return { predelay, postdelay }
}
