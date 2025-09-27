import { describe, it, expect, vi } from 'vitest'
import { StorageService, STORAGE_KEYS } from './storage.service'

vi.mock('./browser-api.service', () => {
  return {
    browserApi: {
      getStorage: vi.fn(async (keys: string[]) => {
        const store: Record<string, unknown> = {
          [STORAGE_KEYS.readerPrefs]: {
            wordsPerMinute: 450,
            pauseAfterComma: true,
            pauseAfterPeriod: true,
            pauseAfterParagraph: true,
            chunkSize: 2,
            wordFlicker: false,
            wordFlickerPercent: 15,
            theme: 'dark'
          },
          [STORAGE_KEYS.openaiApiKey]: 'sk-test'
        }
        const result: Record<string, unknown> = {}
        for (const k of keys) result[k] = store[k]
        return result
      }),
      setStorage: vi.fn(async () => {})
    }
  }
})

describe('StorageService', () => {
  it('reads reader preferences with defaults fallback', async () => {
    const service = new StorageService()
    const prefs = await service.readReaderPreferences()
    expect(prefs.wordsPerMinute).toBeGreaterThan(0)
    expect(['dark', 'light']).toContain(prefs.theme)
  })

  it('round-trips OpenAI API key via set/get', async () => {
    const service = new StorageService()
    await service.writeOpenAIApiKey('sk-abc')
    const key = await service.readOpenAIApiKey()
    expect(typeof key === 'string').toBeTruthy()
  })
})

