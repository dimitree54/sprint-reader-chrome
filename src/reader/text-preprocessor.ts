/**
 * Extensible text preprocessing system with swappable providers
 */

import { readOpenAIApiKey } from '../common/storage'

export interface PreprocessingResult {
  text: string
  metadata?: {
    originalLength: number
    processedLength: number
    wasModified: boolean
    provider: string
    processingTime?: number
  }
}

export interface PreprocessingProvider {
  name: string
  process(text: string): Promise<PreprocessingResult>
  isAvailable(): Promise<boolean>
}

/**
 * Pass-through provider that returns text unchanged
 */
class PassthroughProvider implements PreprocessingProvider {
  name = 'passthrough'

  async isAvailable(): Promise<boolean> {
    return true
  }

  async process(text: string): Promise<PreprocessingResult> {
    return {
      text,
      metadata: {
        originalLength: text.length,
        processedLength: text.length,
        wasModified: false,
        provider: this.name,
        processingTime: 0
      }
    }
  }
}

/**
 * OpenAI provider for Russian translation
 */
class OpenAIProvider implements PreprocessingProvider {
  name = 'openai'

  async isAvailable(): Promise<boolean> {
    const storedApiKey = await readOpenAIApiKey()
    const apiKey = storedApiKey || process.env.OPENAI_API_KEY
    return !!apiKey
  }

  async process(text: string): Promise<PreprocessingResult> {
    const startTime = Date.now()
    const storedApiKey = await readOpenAIApiKey()
    const apiKey = storedApiKey || process.env.OPENAI_API_KEY

    if (!apiKey) {
      throw new Error('OpenAI API key not available')
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      // eslint-disable-next-line n/no-unsupported-features/node-builtins
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Translate the following text to Russian. Preserve the meaning and structure. Return only the translated text without any additional explanations.'
            },
            {
              role: 'user',
              content: text
            }
          ],
          max_tokens: Math.min(1000, text.length * 2),
          temperature: 0.3
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const translatedText = data.choices?.[0]?.message?.content || text

      return {
        text: translatedText.trim(),
        metadata: {
          originalLength: text.length,
          processedLength: translatedText.length,
          wasModified: translatedText.trim() !== text.trim(),
          provider: this.name,
          processingTime: Date.now() - startTime
        }
      }
    } catch (error) {
      throw new Error(`OpenAI preprocessing failed: ${error instanceof Error ? error.message : 'unknown'}`)
    }
  }
}

/**
 * Preprocessing manager that selects the best available provider
 */
class PreprocessingManager {
  private providers: PreprocessingProvider[] = [
    new OpenAIProvider(),
    new PassthroughProvider() // Always available as fallback
  ]

  async process(text: string): Promise<PreprocessingResult> {
    for (const provider of this.providers) {
      if (await provider.isAvailable()) {
        try {
          return await provider.process(text)
        } catch (error) {
          console.warn(`Provider ${provider.name} failed, trying next:`, error)
          continue
        }
      }
    }

    // This should never happen since PassthroughProvider is always available
    throw new Error('No preprocessing providers available')
  }
}

const preprocessingManager = new PreprocessingManager()

/**
 * Main preprocessing function that automatically selects the best available provider
 */
export async function preprocessTextForReader(text: string): Promise<PreprocessingResult> {
  return preprocessingManager.process(text)
}