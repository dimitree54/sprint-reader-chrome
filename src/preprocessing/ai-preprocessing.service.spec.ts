import { describe, it, expect, vi } from 'vitest'
import { aiPreprocessingService } from './ai-preprocessing.service'

const mockConfig = {
  enabled: true,
  apiKey: 'sk-test',
  targetLanguage: 'en',
  summarizationLevel: 'none'
}

vi.mock('./config', () => ({
  preprocessingConfigService: {
    getConfig: vi.fn(async () => ({ ...mockConfig })),
    shouldSkipProcessing: vi.fn(() => !mockConfig.enabled)
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
    async processWithStreaming (text: string, cfg: any, onToken: (t: string) => Promise<void> | void) {
      void cfg
      const tokens = ['Hello', ' ', 'World']
      for (const t of tokens) {
        await onToken(t)
      }
      return { text: tokens.join(''), metadata: { originalLength: text.length, processedLength: tokens.join('').length, wasModified: true, provider: 'openai' } }
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

  it('processWithStreaming uses streaming path when enabled', async () => {
    mockConfig.enabled = true
    const tokens: string[] = []
    const result = await aiPreprocessingService.processWithStreaming('ignored', async (t) => { tokens.push(t) })
    expect(tokens.join('')).toBe('Hello World')
    expect(result.text).toBe('Hello World')
  })

  it('processWithStreaming falls back to non-streaming when disabled', async () => {
    mockConfig.enabled = false
    const onToken = vi.fn()
    const result = await aiPreprocessingService.processWithStreaming('abc', onToken)
    expect(onToken).not.toHaveBeenCalled()
    // When disabled, manager.process is used; our OpenAIProvider mock uppercases in non-streaming path
    expect(result.text).toBe('abc')
    mockConfig.enabled = true
  })
})
