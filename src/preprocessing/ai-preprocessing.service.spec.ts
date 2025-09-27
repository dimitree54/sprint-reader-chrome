import { describe, it, expect, vi } from 'vitest'
import { aiPreprocessingService } from './ai-preprocessing.service'

vi.mock('./config', () => ({
  preprocessingConfigService: {
    getConfig: vi.fn(async () => ({ apiKey: 'sk-test', targetLanguage: 'en', summarizationLevel: 'none' })),
    shouldSkipProcessing: vi.fn(() => false)
  }
}))

vi.mock('./providers/openai', async (orig) => {
  const actual: any = await orig()
  class MockOpenAIProvider {
    name = 'openai'
    isAvailable () { return true }
    async process (text: string, cfg: any) {
      void cfg
      return { text: text.toUpperCase(), metadata: { originalLength: text.length, processedLength: text.length, wasModified: true, provider: 'openai' } }
    }
  }
  return { ...actual, OpenAIProvider: MockOpenAIProvider }
})

describe('AIPreprocessingService', () => {
  it('reports availability when API key exists', async () => {
    await expect(aiPreprocessingService.isAvailable()).resolves.toBe(true)
  })

  it('translates/summarizes text via manager', async () => {
    const res1 = await aiPreprocessingService.translateText('hello')
    expect(res1.text).toBe('HELLO')
    const res2 = await aiPreprocessingService.summarizeText('world')
    expect(res2.text).toBe('WORLD')
  })
})
