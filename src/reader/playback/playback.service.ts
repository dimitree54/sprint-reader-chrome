import { useReaderStore } from '../state/reader.store'
import { timingService } from '../timing/timing.service'
import { DEFAULTS } from '../../config/defaults'

export class PlaybackService {
  private timerId: ReturnType<typeof setTimeout> | null = null
  private lastWatched: {
    wpm: number
    count: number
    index: number
    pauseAfterComma?: boolean
    pauseAfterPeriod?: boolean
    pauseAfterParagraph?: boolean
    chunkSize?: number
  } = { wpm: -1, count: -1, index: -1 }

  constructor () {
    // Subscribe to state changes that should affect scheduling cadence
    useReaderStore.subscribe((s) => {
      const next = {
        wpm: s.wordsPerMinute,
        count: s.wordItems.length,
        index: s.index,
        status: s.status,
        pauseAfterComma: s.pauseAfterComma,
        pauseAfterPeriod: s.pauseAfterPeriod,
        pauseAfterParagraph: s.pauseAfterParagraph,
        chunkSize: s.chunkSize
      }
      const playing = next.status === 'playing'
      // Do not reschedule on count-only changes. When streaming appends
      // new items rapidly, constantly clearing and resetting the timer
      // can push the next tick indefinitely. We intentionally exclude
      // `count` from the cadence comparison.
      const cadenceChanged = (
        next.wpm !== this.lastWatched.wpm ||
        /* next.count excluded */
        next.index !== this.lastWatched.index ||
        next.pauseAfterComma !== this.lastWatched.pauseAfterComma ||
        next.pauseAfterPeriod !== this.lastWatched.pauseAfterPeriod ||
        next.pauseAfterParagraph !== this.lastWatched.pauseAfterParagraph ||
        next.chunkSize !== this.lastWatched.chunkSize
      )
      if (playing && cadenceChanged) {
        this.reschedule()
      }
      this.lastWatched = next
    })
  }

  private clearTimer (): void {
    if (this.timerId) {
      clearTimeout(this.timerId)
      this.timerId = null
    }
  }

  private computeDelay (): number {
    const s = useReaderStore.getState()
    const { wordItems, index, wordsPerMinute } = s
    const current = wordItems[index]
    if (current) {
      // Recalculate duration using current timing preferences from snapshot
      const prefs = {
        wordsPerMinute: s.wordsPerMinute,
        pauseAfterComma: s.pauseAfterComma,
        pauseAfterPeriod: s.pauseAfterPeriod,
        pauseAfterParagraph: s.pauseAfterParagraph,
        chunkSize: s.chunkSize
      }
      const [withTiming] = timingService.calculateChunkDurations([current], prefs)

      // Start with the recalculated base duration
      let duration = withTiming.duration ?? 0

      // Re-apply the bold multiplier, which was the missing step
      if (current.isBold) {
        duration *= DEFAULTS.TIMING.MULTIPLIERS.bold
      }

      // Add punctuation delay and return
      const totalDelay = duration + (withTiming.postdelay ?? 0)
      return Math.max(totalDelay, DEFAULTS.TIMING.minimumDelayMs)
    }
    // Fallback when no current item available
    const wpm = Math.max(DEFAULTS.TIMING.minimumWpmForCalculation, wordsPerMinute)
    return Math.max(60_000 / wpm, DEFAULTS.TIMING.minimumDelayMs)
  }

  private scheduleNextWord = (): void => {
    const store = useReaderStore.getState()
    if (store.status !== 'playing') {
      this.clearTimer()
      return
    }

    if (store.index >= store.wordItems.length - 1) {
      // End of currently available items
      if (store.isStreaming && !store.streamingComplete) {
        // Keep playing state; poll until new items arrive
        this.clearTimer()
        const wpm = Math.max(DEFAULTS.TIMING.minimumWpmForCalculation, store.wordsPerMinute)
        const delay = Math.max(60_000 / wpm, DEFAULTS.TIMING.minimumDelayMs)
        this.timerId = setTimeout(this.scheduleNextWord, delay)
        return
      } else {
        // Streaming finished or not streaming: pause at the end
        useReaderStore.setState({ status: 'paused' })
        this.clearTimer()
        return
      }
    }

    useReaderStore.setState({ index: store.index + 1 })
    this.timerId = setTimeout(this.scheduleNextWord, this.computeDelay())
  }

  private reschedule (): void {
    if (useReaderStore.getState().status !== 'playing') return
    this.clearTimer()
    this.timerId = setTimeout(this.scheduleNextWord, this.computeDelay())
  }

  play (): void {
    if (useReaderStore.getState().status === 'playing') return
    useReaderStore.setState({ status: 'playing' })
    this.clearTimer()
    this.timerId = setTimeout(this.scheduleNextWord, this.computeDelay())
  }

  pause (): void {
    if (useReaderStore.getState().status !== 'playing') return
    useReaderStore.setState({ status: 'paused' })
    this.clearTimer()
  }

  restart (): void {
    this.clearTimer()
    useReaderStore.setState({ index: 0, status: 'paused' })
  }
}

export const playbackService = new PlaybackService()
