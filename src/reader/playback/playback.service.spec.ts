import { describe, it, expect, vi } from 'vitest'
import { playbackService } from './playback.service'
import { useReaderStore } from '../state/reader.store'

vi.mock('../playback', () => ({ startPlayback: vi.fn(), stopPlayback: vi.fn() }))

describe('PlaybackService', () => {
  it('play() sets status to playing', () => {
    useReaderStore.setState({ status: 'paused' })
    playbackService.play()
    expect(useReaderStore.getState().status).toBe('playing')
  })

  it('pause() sets status to paused', () => {
    useReaderStore.setState({ status: 'playing' })
    playbackService.pause()
    expect(useReaderStore.getState().status).toBe('paused')
  })

  it('restart() resets index to 0 and pauses', () => {
    useReaderStore.setState({ index: 5, status: 'playing' })
    playbackService.restart()
    expect(useReaderStore.getState().index).toBe(0)
    expect(useReaderStore.getState().status).toBe('paused')
  })
})
