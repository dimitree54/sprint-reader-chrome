/**
 * Extensible text preprocessing system with swappable providers
 */

import { readOpenAIApiKey, readTranslationLanguage, readSummarizationLevel } from '../common/storage'
import { buildTranslationPromptPayload } from './openai-prompt'

export interface PreprocessingResult {
  text: string
  metadata?: {
    originalLength: number
    processedLength: number
    wasModified: boolean
    provider: string
    processingTime?: number
  }
  error?: {
    type: 'missing_api_key' | 'api_error' | 'network_error' | 'timeout_error' | 'unknown_error'
    message: string
    details?: Record<string, unknown>
  }
}

export interface PreprocessingProvider {
  name: string
  process(text: string): Promise<PreprocessingResult>
  isAvailable(): Promise<boolean>
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
    const targetLanguage = await readTranslationLanguage()
    const summarizationLevel = await readSummarizationLevel()

    // If no translation and no summarization, return original text
    if (targetLanguage === 'none' && summarizationLevel === 'none') {
      return {
        text,
        metadata: {
          originalLength: text.length,
          processedLength: text.length,
          wasModified: false,
          provider: 'none',
          processingTime: Date.now() - startTime
        }
      }
    }

    const storedApiKey = await readOpenAIApiKey()
    const apiKey = storedApiKey || process.env.OPENAI_API_KEY

    if (!apiKey) {
      return {
        text,
        error: {
          type: 'missing_api_key',
          message: 'OpenAI API key not configured',
          details: {
            suggestion: 'Please configure your OpenAI API key in the extension settings'
          }
        }
      }
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const payload = buildTranslationPromptPayload(text, targetLanguage, summarizationLevel)

      // eslint-disable-next-line n/no-unsupported-features/node-builtins
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        return this.handleApiError(response, text)
      }

      const data = await response.json()
      // Find the message output (not reasoning) - it should have type 'message'
      const messageOutput = data.output?.find((item: { type: string }) => item.type === 'message')
      const translatedText = messageOutput?.content?.[0]?.text || text

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
      return this.handleProcessingError(error, text)
    }
  }

  private handleApiError(response: { status: number; statusText: string; url: string }, originalText: string): PreprocessingResult {
    const errorDetails = {
      status: response.status,
      statusText: response.statusText,
      url: response.url
    }

    let errorType: 'api_error' | 'network_error' = 'api_error'
    let errorMessage = `OpenAI API error: ${response.status} ${response.statusText}`

    if (response.status === 0) {
      errorType = 'network_error'
      errorMessage = 'Network error: Unable to connect to OpenAI API'
    } else if (response.status === 401) {
      errorMessage = 'Authentication error: Invalid API key'
    } else if (response.status === 429) {
      errorMessage = 'Rate limit exceeded: Too many requests to OpenAI API'
    } else if (response.status >= 500) {
      errorMessage = 'OpenAI server error: Please try again later'
    }

    return {
      text: originalText,
      error: {
        type: errorType,
        message: errorMessage,
        details: errorDetails
      }
    }
  }

  private handleProcessingError(error: unknown, originalText: string): PreprocessingResult {
    let errorType: 'timeout_error' | 'network_error' | 'unknown_error' = 'unknown_error'
    let errorMessage = 'Unknown error occurred during preprocessing'
    const errorDetails: Record<string, unknown> = { originalError: error instanceof Error ? error.message : String(error) }

    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        errorType = 'timeout_error'
        errorMessage = 'Request timeout: OpenAI API took too long to respond'
      } else if (error.message.includes('fetch') || error.message.includes('network')) {
        errorType = 'network_error'
        errorMessage = 'Network error: Unable to reach OpenAI API'
      } else {
        errorMessage = `Processing error: ${error.message}`
      }
    }

    return {
      text: originalText,
      error: {
        type: errorType,
        message: errorMessage,
        details: errorDetails
      }
    }
  }
}

/**
 * Preprocessing manager that handles OpenAI processing
 */
class PreprocessingManager {
  private provider: PreprocessingProvider = new OpenAIProvider()

  async process(text: string): Promise<PreprocessingResult> {
    return await this.provider.process(text)
  }
}

const preprocessingManager = new PreprocessingManager()

/**
 * Main preprocessing function that automatically selects the best available provider
 */
export async function preprocessTextForReader(text: string): Promise<PreprocessingResult> {
  return preprocessingManager.process(text)
}
