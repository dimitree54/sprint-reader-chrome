import { buildTranslationPromptPayload } from '../../reader/openai-prompt'
import type { PreprocessingProvider, PreprocessingResult } from './types'
import type { PreprocessingConfig } from '../config'

// OpenAI Responses API interfaces
interface OpenAIResponseContent {
  type: string
  text: string
}

interface OpenAIResponseOutput {
  type: 'message' | 'reasoning'
  content: OpenAIResponseContent[]
}

interface OpenAIResponsesApiResponse {
  output: OpenAIResponseOutput[]
}

export class OpenAIProvider implements PreprocessingProvider {
  name = 'openai'

  isAvailable(config: PreprocessingConfig): boolean {
    return !!config.apiKey
  }

  async process(text: string, config: PreprocessingConfig): Promise<PreprocessingResult> {
    const startTime = Date.now()

    if (!config.apiKey) {
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

      const payload = buildTranslationPromptPayload(text, config.targetLanguage, config.summarizationLevel)

      // eslint-disable-next-line n/no-unsupported-features/node-builtins
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        return this.handleApiError(response, text)
      }

      const data = await response.json() as OpenAIResponsesApiResponse
      // Find the message output (not reasoning) - it should have type 'message'
      const messageOutput = data.output?.find((item) => item.type === 'message')
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