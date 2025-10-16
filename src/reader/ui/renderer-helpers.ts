import { useReaderStore } from '../state/reader.store'
import { getTimeProgress, formatEta } from '../time-calculator'

export interface ProgressData {
  percent: number
  eta: string
  ariaNow: number
}

// Pure helper functions
export function computeProgress(state: ReturnType<typeof useReaderStore.getState>): ProgressData {
  if (state.wordItems.length === 0 || state.isPreprocessing) {
    return { percent: 0, eta: '-00:00:00', ariaNow: 0 }
  }

  const available = state.wordItems.length
  const clampedIndex = Math.min(Math.max(state.index, 0), available - 1)

  let fallbackPercent = 0
  if (available === 1) {
    fallbackPercent = clampedIndex > 0 ? 100 : 0
  } else if (available > 1) {
    fallbackPercent = (clampedIndex / (available - 1)) * 100
  }

  fallbackPercent = Math.min(Math.max(fallbackPercent, 0), 100)

  const timingSettings = {
    wordsPerMinute: state.wordsPerMinute,
    pauseAfterComma: state.pauseAfterComma,
    pauseAfterPeriod: state.pauseAfterPeriod,
    pauseAfterParagraph: state.pauseAfterParagraph,
    chunkSize: state.chunkSize
  }
  const timeProgress = getTimeProgress(state.wordItems, clampedIndex, timingSettings)
  const eta = formatEta(timeProgress.remainingMs)

  const hasTiming = timeProgress.totalDurationMs > 0 && Number.isFinite(timeProgress.progressPercent)
  const percent = hasTiming ? Math.min(Math.max(timeProgress.progressPercent, 0), 100) : fallbackPercent

  return {
    percent,
    eta,
    ariaNow: Math.round(percent)
  }
}