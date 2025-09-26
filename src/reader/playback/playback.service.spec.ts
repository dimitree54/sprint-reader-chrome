import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { playbackService } from './playback.service'
import { useReaderStore } from '../state/reader.store'
import { timingService } from '../timing/timing.service'

describe('PlaybackService', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Reset store
    useReaderStore.setState({ index: 0, status: 'paused', wordItems: [], wordsPerMinute: 100 })
    // Stub timing to deterministic values derived from current WPM
    vi.spyOn(timingService, 'calculateChunkDurations').mockImplementation((words) => {
      const wpm = useReaderStore.getState().wordsPerMinute
      return words.map((w) => ({ ...w, duration: wpm, postdelay: 0 })) as any
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('play() sets status to playing and schedules next word', () => {
    useReaderStore.setState({
      status: 'paused',
      index: 0,
      wordItems: [{ text: 'one' }, { text: 'two' }] as any,
      wordsPerMinute: 100
    })

    playbackService.play()
    expect(useReaderStore.getState().status).toBe('playing')

    // No advance yet
    expect(useReaderStore.getState().index).toBe(0)

    // After 100ms (derived from mocked timing), index should advance
    vi.advanceTimersByTime(100)
    expect(useReaderStore.getState().index).toBe(1)
  })

  it('pause() clears timer and sets status paused', () => {
    useReaderStore.setState({
      status: 'paused',
      index: 0,
      wordItems: [{ text: 'one' }, { text: 'two' }] as any,
      wordsPerMinute: 100
    })
    playbackService.play()
    playbackService.pause()
    expect(useReaderStore.getState().status).toBe('paused')

    // Advancing time should not change index
    vi.advanceTimersByTime(1000)
    expect(useReaderStore.getState().index).toBe(0)
  })

  it('restart() resets index and pauses', () => {
    useReaderStore.setState({ index: 5, status: 'playing' })
    playbackService.restart()
    expect(useReaderStore.getState().index).toBe(0)
    expect(useReaderStore.getState().status).toBe('paused')
  })

  it('end-of-queue pauses playback', () => {
    useReaderStore.setState({
      status: 'paused',
      index: 0,
      wordItems: [{ text: 'one' }] as any,
      wordsPerMinute: 100
    })
    playbackService.play()
    // After 100ms, should attempt to move past end and pause
    vi.advanceTimersByTime(100)
    expect(useReaderStore.getState().status).toBe('paused')
    expect(useReaderStore.getState().index).toBe(0)
  })

  it('reschedules when WPM changes while playing', () => {
    useReaderStore.setState({
      status: 'paused',
      index: 0,
      wordItems: [{ text: 'one' }, { text: 'two' }] as any,
      wordsPerMinute: 100
    })
    playbackService.play()

    // Advance a bit, then change WPM to 50 and expect earlier tick due to reschedule
    vi.advanceTimersByTime(10)
    useReaderStore.setState({ wordsPerMinute: 50 })

    // Not yet advanced at 49ms after change
    vi.advanceTimersByTime(49)
    expect(useReaderStore.getState().index).toBe(0)

    // Advance 1ms more (total 50ms after change) → should advance
    vi.advanceTimersByTime(1)
    expect(useReaderStore.getState().index).toBe(1)
  })
})
