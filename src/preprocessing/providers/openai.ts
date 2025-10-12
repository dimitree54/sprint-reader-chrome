import { buildChatCompletionPayload } from '../../reader/openai-prompt'
import type { PreprocessingProvider, PreprocessingResult } from './types'
import { preprocessingConfigService, type PreprocessingConfig } from '../config'
import { authService } from '../../auth'
import { getAuthState } from '../../auth/state/auth.store'

// OpenAI Streaming interfaces
import {
  type StreamingTokenCallback,
  processStreamLinesWithCallback
} from './openai-streaming'

export type { StreamingTokenCallback } from './openai-streaming'
import { handleApiError, handleProcessingError } from './openai-errors'

const KINDE_GATED_WORKER_URL = 'https://kinde-gated-openai-responses-api.path2dream.workers.dev';

// OpenAI Responses API interfaces
interface OpenAIChatCompletionsResponse {
  choices: Array<{ message?: { content?: string }; delta?: { content?: string } }>
}

async function readResponseTextSafe(response: Response): Promise<string | undefined> {
  try {
    return await response.text()
  } catch (error) {
    console.warn('[OpenAIProvider] Failed to read error response body:', error)
    return undefined
  }
}

export class OpenAIProvider implements PreprocessingProvider {
  name = 'openai'

  isAvailable(config: PreprocessingConfig): boolean {
    if (preprocessingConfigService.shouldSkipProcessing(config)) {
      return false
    }

    // Check for test mode override
    if ((globalThis as any).TEST_MODE) {
      return !!(globalThis as any).TEST_AUTH_TOKEN
    }

    const authState = getAuthState()
    if (!authState.isAuthenticated) {
      return false
    }

    const user = authState.user
    if (!user) {
      return false
    }

    return user.subscriptionStatus === 'pro'
  }

  /**
   * Get detailed availability information with reasons for non-availability
   */
  async getAvailabilityInfo(): Promise<{ isAvailable: boolean; reason?: string }> {
    // Check for test mode override
    if ((globalThis as any).TEST_MODE) {
      const hasTestToken = !!(globalThis as any).TEST_AUTH_TOKEN
      return {
        isAvailable: hasTestToken,
        reason: hasTestToken ? undefined : 'No test auth token provided'
      }
    }

    const authState = getAuthState()

    if (!authState.isAuthenticated) {
      if (!authState.user) {
        return {
          isAvailable: false,
          reason: 'User not signed in'
        }
      } else {
        // Check if we can get a token
        try {
          const token = await authService.getToken()
          if (!token) {
            return {
              isAvailable: false,
              reason: 'User signed in but no valid token available'
            }
          }
        } catch (error) {
          return {
            isAvailable: false,
            reason: 'Error retrieving authentication token'
          }
        }

        return {
          isAvailable: false,
          reason: 'Authentication state invalid'
        }
      }
    }

    const user = authState.user
    if (!user) {
      return {
        isAvailable: false,
        reason: 'Authenticated state without user data'
      }
    }

    if (user.subscriptionStatus !== 'pro') {
      return {
        isAvailable: false,
        reason: user.subscriptionStatus
          ? `User subscription is ${user.subscriptionStatus}, pro subscription required`
          : 'User subscription status unknown, pro subscription required'
      }
    }

    // Double-check that we can actually get a token
    try {
      const token = await authService.getToken()
      if (!token) {
        return {
          isAvailable: false,
          reason: 'Authenticated but token is missing or expired'
        }
      }
    } catch (error) {
      return {
        isAvailable: false,
        reason: 'Error retrieving authentication token'
      }
    }

    // Check if we're online (basic check)
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return {
        isAvailable: false,
        reason: 'No internet connection'
      }
    }

    return { isAvailable: true }
  }

  async process(text: string, config: PreprocessingConfig): Promise<PreprocessingResult> {
    const startTime = Date.now()
    const token = await authService.getToken()

    if (!token) {
      return {
        text,
        error: {
          type: 'missing_api_key',
          message: 'User is not authenticated',
          details: {
            suggestion: 'Please sign in to use this feature'
          }
        }
      }
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined
    const controller = new AbortController()
    try {
      timeoutId = setTimeout(() => controller.abort(), 30000)

      const payload = buildChatCompletionPayload(text, config.targetLanguage, config.summarizationLevel, config.enabled)

      const response = await fetch(KINDE_GATED_WORKER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      })

      if (timeoutId) clearTimeout(timeoutId)

      if (!response.ok) {
        const errorPayload = await readResponseTextSafe(response)
        return handleApiError(response, text, errorPayload)
      }

      const data = await response.json() as OpenAIChatCompletionsResponse
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
      return handleProcessingError(error, text)
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }

  async processWithStreaming(
    text: string,
    config: PreprocessingConfig,
    onToken: StreamingTokenCallback
  ): Promise<PreprocessingResult> {
    const startTime = Date.now()
    const token = await authService.getToken()

    if (!token) {
      return {
        text,
        error: {
          type: 'missing_api_key',
          message: 'User is not authenticated',
          details: {
            suggestion: 'Please sign in to use this feature'
          }
        }
      }
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined
    const controller = new AbortController()
    try {
      timeoutId = setTimeout(() => controller.abort(), 30000)

      const payload = buildChatCompletionPayload(text, config.targetLanguage, config.summarizationLevel, config.enabled)
      const streamingPayload = { ...payload, stream: true }

      const response = await fetch(KINDE_GATED_WORKER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(streamingPayload),
        signal: controller.signal
      })

      if (timeoutId) clearTimeout(timeoutId)

      if (!response.ok) {
        const errorPayload = await readResponseTextSafe(response)
        return handleApiError(response, text, errorPayload)
      }

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
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }

  private async processStreamingResponseWithCallback(
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
          const err = new Error('Request aborted')
          ;(err as Error & { name: string }).name = 'AbortError'
          throw err
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
        const err = new Error('Streaming request was cancelled')
        ;(err as Error & { name: string }).name = 'AbortError'
        throw err
      }

      if (error instanceof TypeError && /network|failed to fetch/i.test(error.message)) {
        throw new Error('Network error during streaming')
      }

      throw error
    } finally {
      reader.releaseLock()
    }

    return collectedText || 'No text received from stream'
  }
}
