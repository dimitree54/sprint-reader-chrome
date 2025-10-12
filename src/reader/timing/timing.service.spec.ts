import { describe, it, expect } from 'vitest'
import { timingService } from './timing.service'
import { DEFAULTS } from '../../config/defaults'

describe('TimingService', () => {
  const prefs = {
    wordsPerMinute: DEFAULTS.READER_PREFERENCES.wordsPerMinute,
    pauseAfterComma: DEFAULTS.READER_PREFERENCES.pauseAfterComma,
    pauseAfterPeriod: DEFAULTS.READER_PREFERENCES.pauseAfterPeriod,
    pauseAfterParagraph: DEFAULTS.READER_PREFERENCES.pauseAfterParagraph,
    chunkSize: DEFAULTS.READER_PREFERENCES.chunkSize
  }

  it('calculates word items from text with durations', () => {
    const text = 'Hello, world! This is a test.'
    const items = timingService.calculateWordTimingFromText(text, prefs)
    expect(items.length).toBeGreaterThan(0)
    expect(items[0]).toHaveProperty('duration')
  })

  it('analyzes word complexity', () => {
    const { frequency, entropy } = timingService.analyzeWordComplexity('example')
    expect(frequency).toBeGreaterThan(0)
    expect(entropy).toBeGreaterThan(0)
  })

  it('keeps tokens like "~1.6x" as a single chunk', () => {
    const text = 'Gain ~1.6x efficiency.'
    const items = timingService.calculateWordTimingFromText(text, prefs)

    const tildeChunk = items.find(item => item.originalText === '~1.6x')

    expect(tildeChunk).toBeDefined()
    expect(tildeChunk?.text).toBe('~1.6x')
    expect(tildeChunk?.wordsInChunk).toBe(1)
  })

  it('splits surrounding punctuation but preserves "~1.6x" token', () => {
    const text = '3. ~1.6x from translation'
    const items = timingService.calculateWordTimingFromText(text, prefs)

    const chunkTexts = items.map(item => item.originalText)

    expect(chunkTexts).toContain('~1.6x')
  })
})
