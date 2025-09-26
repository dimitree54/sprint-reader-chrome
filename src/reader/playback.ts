import { renderCurrentWord } from './render'
import { setTimer, stopTimer } from './state/legacy-state-helpers'
import { useReaderStore } from './state/reader.store'
import { DEFAULTS } from '../config/defaults'

function calculateDelay (): number {
  const { wordItems, index, wordsPerMinute } = useReaderStore.getState()
  const currentWordItem = wordItems[index]
  if (currentWordItem) {
    const delay = (currentWordItem.duration ?? 0) + (currentWordItem.postdelay ?? 0)
    return Math.max(delay, DEFAULTS.TIMING.minimumDelayMs)
  }
  return Math.max(60_000 / Math.max(DEFAULTS.TIMING.minimumWpmForCalculation, wordsPerMinute), DEFAULTS.TIMING.minimumDelayMs)
}

function scheduleNextWord (): void {
  const store = useReaderStore.getState()
  if (store.status !== 'playing') {
    return
  }

  if (store.index >= store.wordItems.length - 1) {
    store.setStatus('paused')
    renderCurrentWord()
    return
  }

  store.setPlaybackIndex(store.index + 1)
  setTimer(setTimeout(scheduleNextWord, calculateDelay()))
  renderCurrentWord()
}

export function stopPlayback (): void {
  useReaderStore.getState().setStatus('paused')
  stopTimer()
}

export function startPlayback (): void {
  stopPlayback()
  useReaderStore.getState().setStatus('playing')
  setTimer(setTimeout(scheduleNextWord, calculateDelay()))
  renderCurrentWord()
}
