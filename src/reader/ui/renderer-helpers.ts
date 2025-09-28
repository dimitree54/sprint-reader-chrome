import { useReaderStore } from '../state/reader.store'
import { getTimeProgress, formatTimeRemaining, formatProgressPercent } from '../time-calculator'

export interface ProgressData {
  percent: number
  text: string
  ariaNow: number
}

export interface StatusData {
  text: string
}

// Pure helper functions
export function computeProgress(state: ReturnType<typeof useReaderStore.getState>): ProgressData {
  if (state.wordItems.length === 0) {
    return { percent: 0, text: '', ariaNow: 0 }
  }

  if (state.isStreaming) {
    const shown = Math.min(state.index + 1, state.wordItems.length)
    const available = state.wordItems.length

    let progressPercent = 0
    if (state.estimatedTotalChunks && state.estimatedTotalChunks > 0) {
      const processingProgress = (available / state.estimatedTotalChunks) * 100
      const readingProgress = (shown / available) * processingProgress
      progressPercent = Math.min(readingProgress, 100)
    } else {
      progressPercent = (shown / available) * 100
    }

    const processedInfo = state.estimatedTotalChunks
      ? ` (${Math.round(Math.min(100, (available / state.estimatedTotalChunks) * 100))}% processed)`
      : ' (processing...)'

    return {
      percent: progressPercent,
      text: `${shown} / ${available}${processedInfo}`,
      ariaNow: Math.round(progressPercent)
    }
  } else {
    const timingSettings = {
      wordsPerMinute: state.wordsPerMinute,
      pauseAfterComma: state.pauseAfterComma,
      pauseAfterPeriod: state.pauseAfterPeriod,
      pauseAfterParagraph: state.pauseAfterParagraph,
      chunkSize: state.chunkSize
    }
    const timeProgress = getTimeProgress(state.wordItems, state.index, timingSettings)
    const percentDisplay = formatProgressPercent(timeProgress.progressPercent)
    const timeDisplay = formatTimeRemaining(timeProgress.remainingMs)

    return {
      percent: timeProgress.progressPercent,
      text: `${percentDisplay} • ${timeDisplay}`,
      ariaNow: Math.round(timeProgress.progressPercent)
    }
  }
}

const LOADING_TEXT = 'Loading...'

export function computeStatus(state: ReturnType<typeof useReaderStore.getState>): StatusData {
  if (state.isPreprocessing) {
    return { text: 'Preprocessing...' }
  }

  if (state.status === 'loading') {
    return { text: LOADING_TEXT }
  }

  if (state.isStreaming && state.wordItems.length === 0) {
    return { text: LOADING_TEXT }
  }

  if (state.isStreaming && state.status === 'playing') {
    return { text: 'Playing (streaming)' }
  }

  if (state.isStreaming) {
    return { text: LOADING_TEXT }
  }

  return { text: state.status === 'playing' ? 'Playing' : (state.status === 'idle' ? 'Idle' : 'Paused') }
}