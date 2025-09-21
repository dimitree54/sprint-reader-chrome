import { renderCurrentWord } from './render'
import { setTimer, state, stopTimer } from './state'
import { DEFAULTS } from '../config/defaults'

function calculateDelay (): number {
  const currentWordItem = state.wordItems[state.index]
  if (currentWordItem) {
    const delay = (currentWordItem.duration ?? 0) + (currentWordItem.postdelay ?? 0)
    return Math.max(delay, DEFAULTS.TIMING.minimumDelayMs)
  }
  return Math.max(60_000 / Math.max(DEFAULTS.TIMING.minimumWpmForCalculation, state.wordsPerMinute), DEFAULTS.TIMING.minimumDelayMs)
}

function scheduleNextWord (): void {
  if (!state.playing) {
    return
  }

  if (state.index >= state.wordItems.length - 1) {
    state.playing = false
    renderCurrentWord()
    return
  }

  state.index++
  setTimer(setTimeout(scheduleNextWord, calculateDelay()))
  renderCurrentWord()
}

export function stopPlayback (): void {
  state.playing = false
  stopTimer()
}

export function startPlayback (): void {
  stopPlayback()
  state.playing = true
  setTimer(setTimeout(scheduleNextWord, calculateDelay()))
  renderCurrentWord()
}
