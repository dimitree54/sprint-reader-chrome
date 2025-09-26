import { describe, it, expect, vi } from 'vitest'
import { computeProgress, computeStatus } from './renderer'

// Mock the time calculator
vi.mock('../time-calculator', () => ({
  getTimeProgress: vi.fn(() => ({
    progressPercent: 45.5,
    remainingMs: 120000
  })),
  formatProgressPercent: vi.fn((percent: number) => `${Math.round(percent)}%`),
  formatTimeRemaining: vi.fn(() => '2:00')
}))

describe('renderer helpers', () => {
  describe('computeProgress', () => {
    it('returns zero state when no word items', () => {
      const state = {
        wordItems: [],
        index: 0,
        isStreaming: false,
        estimatedTotalChunks: null,
        processedChunkCount: 0
      }

      const result = computeProgress(state as any)

      expect(result).toEqual({
        percent: 0,
        text: '',
        ariaNow: 0
      })
    })

    it('computes streaming progress with estimated total chunks', () => {
      const state = {
        wordItems: [{ text: 'word1' }, { text: 'word2' }, { text: 'word3' }],
        index: 1, // showing word at index 1, so 2 words shown
        isStreaming: true,
        estimatedTotalChunks: 10,
        processedChunkCount: 5
      }

      const result = computeProgress(state as any)

      // 3 available, 2 shown, 3/10 = 30% processed, 2/3 * 30% = 20% reading progress
      expect(result.percent).toBe(20)
      expect(result.text).toBe('2 / 3 (30% processed)')
      expect(result.ariaNow).toBe(20)
    })

    it('computes streaming progress without estimated total chunks', () => {
      const state = {
        wordItems: [{ text: 'word1' }, { text: 'word2' }, { text: 'word3' }, { text: 'word4' }],
        index: 2, // showing word at index 2, so 3 words shown
        isStreaming: true,
        estimatedTotalChunks: null,
        processedChunkCount: 5
      }

      const result = computeProgress(state as any)

      // 4 available, 3 shown, 3/4 = 75%
      expect(result.percent).toBe(75)
      expect(result.text).toBe('3 / 4 (processing...)')
      expect(result.ariaNow).toBe(75)
    })

    it('computes regular progress for non-streaming mode', () => {
      const state = {
        wordItems: [{ text: 'word1' }, { text: 'word2' }],
        index: 0,
        isStreaming: false,
        estimatedTotalChunks: null,
        processedChunkCount: 0
      }

      const result = computeProgress(state as any)

      expect(result.percent).toBe(45.5) // From mocked getTimeProgress
      expect(result.text).toBe('46% • 2:00') // From mocked formatters
      expect(result.ariaNow).toBe(46) // Rounded
    })
  })

  describe('computeStatus', () => {
    it('returns preprocessing status when isPreprocessing is true', () => {
      const state = {
        isPreprocessing: true,
        isStreaming: false,
        wordItems: [],
        status: 'paused'
      }

      const result = computeStatus(state as any)

      expect(result.text).toBe('Preprocessing...')
    })

    it('returns loading status when streaming with no word items', () => {
      const state = {
        isPreprocessing: false,
        isStreaming: true,
        wordItems: [],
        status: 'paused'
      }

      const result = computeStatus(state as any)

      expect(result.text).toBe('Loading...')
    })

    it('returns playing streaming status when streaming and playing', () => {
      const state = {
        isPreprocessing: false,
        isStreaming: true,
        wordItems: [{ text: 'word1' }],
        status: 'playing'
      }

      const result = computeStatus(state as any)

      expect(result.text).toBe('Playing (streaming)')
    })

    it('returns loading status when streaming but not playing', () => {
      const state = {
        isPreprocessing: false,
        isStreaming: true,
        wordItems: [{ text: 'word1' }],
        status: 'paused'
      }

      const result = computeStatus(state as any)

      expect(result.text).toBe('Loading...')
    })

    it('returns playing status for non-streaming playing state', () => {
      const state = {
        isPreprocessing: false,
        isStreaming: false,
        wordItems: [{ text: 'word1' }],
        status: 'playing'
      }

      const result = computeStatus(state as any)

      expect(result.text).toBe('Playing')
    })

    it('returns paused status for non-streaming paused state', () => {
      const state = {
        isPreprocessing: false,
        isStreaming: false,
        wordItems: [{ text: 'word1' }],
        status: 'paused'
      }

      const result = computeStatus(state as any)

      expect(result.text).toBe('Paused')
    })
  })
})
