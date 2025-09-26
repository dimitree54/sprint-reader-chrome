import { renderCurrentWord } from './render'
import { setTimer, state, stopTimer } from './state'
import { useReaderStore } from './state/reader.store'
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
    useReaderStore.setState({ status: 'paused' })
    renderCurrentWord()
    return
  }

  state.index++
  useReaderStore.getState().setPlaybackIndex(state.index)
  setTimer(setTimeout(scheduleNextWord, calculateDelay()))
  renderCurrentWord()
}

export function stopPlayback (): void {
  state.playing = false
  useReaderStore.setState({ status: 'paused' })
  stopTimer()
}

export function startPlayback (): void {
  stopPlayback()
  state.playing = true
  useReaderStore.setState({ status: 'playing' })
  setTimer(setTimeout(scheduleNextWord, calculateDelay()))
  renderCurrentWord()
}
