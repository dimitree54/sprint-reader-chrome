import { describe, it, expect, vi } from 'vitest'
import { computeProgress } from './renderer'
import { getTimeProgress, formatEta } from '../time-calculator'

// Mock the time calculator
vi.mock('../time-calculator', () => ({
  getTimeProgress: vi.fn(() => ({
    totalDurationMs: 2000,
    elapsedMs: 900,
    remainingMs: 1100,
    progressPercent: 45.5
  })),
  formatEta: vi.fn(() => '-00:02:00')
}))

describe('renderer helpers', () => {
  describe('computeProgress', () => {
    it('returns zero state when no word items', () => {
      const state = {
        wordItems: [],
        index: 0,
        isStreaming: false,
        estimatedTotalChunks: null,
        processedChunkCount: 0,
        isPreprocessing: false,
        wordsPerMinute: 300,
        pauseAfterComma: true,
        pauseAfterPeriod: true,
        pauseAfterParagraph: true,
        chunkSize: 3
      }

      const result = computeProgress(state as any)

      expect(result).toEqual({
        percent: 0,
        eta: '-00:00:00',
        ariaNow: 0
      })
    })

    it('uses timing-based progress when available', () => {
      const state = {
        wordItems: [{ text: 'word1' }, { text: 'word2' }, { text: 'word3' }],
        index: 1,
        isStreaming: true,
        estimatedTotalChunks: 10,
        processedChunkCount: 5,
        isPreprocessing: false,
        wordsPerMinute: 300,
        pauseAfterComma: true,
        pauseAfterPeriod: true,
        pauseAfterParagraph: true,
        chunkSize: 3
      }

      const mockedFormatEta = vi.mocked(formatEta)
      mockedFormatEta.mockReturnValueOnce('-00:10:00')

      const result = computeProgress(state as any)

      expect(result.percent).toBe(45.5)
      expect(result.eta).toBe('-00:10:00')
      expect(result.ariaNow).toBe(46)
    })

    it('falls back to index-based progress when timing data unavailable', () => {
      const mockedGetTimeProgress = vi.mocked(getTimeProgress)
      mockedGetTimeProgress.mockReturnValueOnce({
        totalDurationMs: 0,
        elapsedMs: 0,
        remainingMs: 0,
        progressPercent: 0
      })
      const state = {
        wordItems: [{ text: 'word1' }, { text: 'word2' }, { text: 'word3' }, { text: 'word4' }],
        index: 2,
        isStreaming: true,
        estimatedTotalChunks: null,
        processedChunkCount: 5,
        isPreprocessing: false,
        wordsPerMinute: 300,
        pauseAfterComma: true,
        pauseAfterPeriod: true,
        pauseAfterParagraph: true,
        chunkSize: 3
      }

      const result = computeProgress(state as any)

      expect(result.percent).toBeCloseTo(66.667, 3)
      expect(result.eta).toBe('-00:02:00')
      expect(result.ariaNow).toBe(67)
    })
  })
})
