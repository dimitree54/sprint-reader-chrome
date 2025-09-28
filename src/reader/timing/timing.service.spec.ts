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
})

