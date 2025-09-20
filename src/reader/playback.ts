import { renderCurrentWord } from './render'
import { setTimer, state, stopTimer } from './state'

function calculateDelay (): number {
  const currentWordItem = state.wordItems[state.index]
  if (currentWordItem) {
    const delay = (currentWordItem.duration ?? 0) + (currentWordItem.postdelay ?? 0)
    return Math.max(delay, 20)
  }
  return Math.max(60_000 / Math.max(100, state.wordsPerMinute), 20)
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
