import { describe, it, expect } from 'vitest'
import { useReaderStore } from './reader.store'

describe('reader.store (Zustand)', () => {
  it('toggles play/pause status', () => {
    const get = useReaderStore.getState
    const set = useReaderStore.getState().togglePlay
    expect(get().status).toBe('paused')
    set()
    expect(get().status).toBe('playing')
    set()
    expect(get().status).toBe('paused')
  })

  it('appends word items and tracks progress', () => {
    const { appendWordItems } = useReaderStore.getState()
    appendWordItems([{ text: 'Hello', originalText: 'Hello', optimalLetterPosition: 0, duration: 0, predelay: 0, postdelay: 0, wordLength: 5, wordsInChunk: 1, isGrouped: false, isBold: false }])
    expect(useReaderStore.getState().wordItems.length).toBe(1)
    expect(useReaderStore.getState().processedChunkCount).toBeGreaterThan(0)
  })
})

