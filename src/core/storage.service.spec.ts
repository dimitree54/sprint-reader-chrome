import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StorageService } from './storage.service'

// Persisted in-memory mock store for true round-trip behavior
const mockStorage: Record<string, unknown> = {}

vi.mock('./browser-api.service', () => ({
  browserApi: {
    getStorage: vi.fn(async (keys: string[]) => {
      const result: Record<string, unknown> = {}
      for (const k of keys) result[k] = mockStorage[k]
      return result
    }),
    setStorage: vi.fn(async (items: Record<string, unknown>) => {
      Object.assign(mockStorage, items)
    })
  }
}))

beforeEach(() => {
  Object.keys(mockStorage).forEach((key) => {
    delete mockStorage[key]
  })
  vi.clearAllMocks()
})

describe('StorageService', () => {
  it('reads reader preferences with defaults fallback', async () => {
    const service = new StorageService()
    // No prefs set → expect defaults
    const prefs = await service.readReaderPreferences()
    expect(prefs.wordsPerMinute).toBeGreaterThan(0)
    expect(['dark', 'light']).toContain(prefs.theme)
  })

  it('round-trips OpenAI API key via set/get', async () => {
    const service = new StorageService()
    await service.writeOpenAIApiKey('sk-abc')
    const key = await service.readOpenAIApiKey()
    expect(key).toBe('sk-abc')
  })

  it('persists reader preferences exactly and reads them back', async () => {
    const service = new StorageService()
    const prefs = {
      wordsPerMinute: 480,
      pauseAfterComma: false,
      pauseAfterPeriod: true,
      pauseAfterParagraph: false,
      chunkSize: 2,
      wordFlicker: true,
      wordFlickerPercent: 20,
      theme: 'light' as const
    }
    await service.writeReaderPreferences(prefs)
    const roundTrip = await service.readReaderPreferences()
    expect(roundTrip).toEqual(prefs)
  })
})
