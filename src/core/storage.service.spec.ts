import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StorageService, STORAGE_KEYS } from './storage.service'

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

  it('initializes usage stats with sane defaults', async () => {
    const service = new StorageService()
    const stats = await service.readUsageStats()

    expect(typeof stats.firstUsedAt).toBe('number')
    expect(stats.firstUsedAt).toBeGreaterThan(0)
    expect(stats.totalWordsRead).toBe(0)
    expect(stats.totalOriginalReadingTimeMs).toBe(0)
    expect(stats.totalExtensionReadingTimeMs).toBe(0)

    const stored = mockStorage[STORAGE_KEYS.usageStats] as typeof stats | undefined
    expect(stored).toBeTruthy()
    expect(stored?.firstUsedAt).toBe(stats.firstUsedAt)
  })

  it('updates usage stats cumulatively', async () => {
    const service = new StorageService()
    const initial = await service.readUsageStats()

    await service.updateUsageStats(current => ({
      ...current,
      totalWordsRead: current.totalWordsRead + 120,
      totalOriginalReadingTimeMs: current.totalOriginalReadingTimeMs + 3000,
      totalExtensionReadingTimeMs: current.totalExtensionReadingTimeMs + 1500
    }))

    const updated = await service.readUsageStats()

    expect(updated.totalWordsRead).toBe(initial.totalWordsRead + 120)
    expect(updated.totalOriginalReadingTimeMs).toBe(initial.totalOriginalReadingTimeMs + 3000)
    expect(updated.totalExtensionReadingTimeMs).toBe(initial.totalExtensionReadingTimeMs + 1500)
    expect(updated.firstUsedAt).toBe(initial.firstUsedAt)
  })
})
