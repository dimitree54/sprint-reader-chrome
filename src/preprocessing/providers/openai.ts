import { buildTranslationPromptPayload } from '../../reader/openai-prompt'
import type { PreprocessingProvider, PreprocessingResult } from './types'
import type { PreprocessingConfig } from '../config'

// OpenAI Streaming interfaces
import {
  type StreamingTokenCallback,
  processStreamLinesWithCallback
} from './openai-streaming'

export type { StreamingTokenCallback } from './openai-streaming'
import { handleApiError, handleProcessingError } from './openai-errors'

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
        return handleApiError(response, text)
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
      return handleProcessingError(error, text)
    }
  }


  /**
   * Process text with streaming support - tokens are sent to callback as they arrive
   */
  async processWithStreaming(
    text: string,
    config: PreprocessingConfig,
    onToken: StreamingTokenCallback
  ): Promise<PreprocessingResult> {
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
      // Enable streaming
      const streamingPayload = { ...payload, stream: true }

      // eslint-disable-next-line n/no-unsupported-features/node-builtins
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify(streamingPayload),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        return handleApiError(response, text)
      }

      // Process streaming response with token callback
      const translatedText = await this.processStreamingResponseWithCallback(response, controller.signal, onToken)

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
      return handleProcessingError(error, text)
    }
  }

  private async processStreamingResponseWithCallback(
    // eslint-disable-next-line n/no-unsupported-features/node-builtins
    response: Response,
    signal: AbortSignal,
    onToken: StreamingTokenCallback
  ): Promise<string> {
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body reader available')
    }

    const decoder = new TextDecoder()
    let collectedText = ''
    let buffer = ''

    try {
      while (true) {
        if (signal.aborted) {
          throw new Error('Request aborted')
        }

        const { done, value } = await reader.read()
        if (done) break

        if (!value || value.length === 0) {
          continue
        }

        buffer += decoder.decode(value, { stream: true })
        const { updatedBuffer, newText } = await processStreamLinesWithCallback(buffer, onToken)
        buffer = updatedBuffer
        collectedText += newText
      }
    } catch (error) {
      if (signal.aborted) {
        throw new Error('Streaming request was cancelled')
      }

      if (error instanceof TypeError && error.message.toLowerCase().includes('network')) {
        throw new Error('Network error during streaming')
      }

      throw error
    } finally {
      reader.releaseLock()
    }

    return collectedText || 'No text received from stream'
  }
}
