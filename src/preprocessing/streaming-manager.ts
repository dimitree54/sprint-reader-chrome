/**
 * Streaming Preprocessing Manager
 *
 * Coordinates streaming preprocessing with the OpenAI provider and text processor
 */

import { preprocessingConfigService, type PreprocessingConfig } from './config'
import { OpenAIProvider, type StreamingTokenCallback } from './providers/openai'
import { PassthroughProvider } from './providers/passthrough'
import type { PreprocessingResult } from './providers/types'
import type { StreamingTextProcessorInstance } from '../reader/streaming-text'

export interface StreamingPreprocessingOptions {
  onStreamingStart?: () => void
  onStreamingComplete?: () => void
  onError?: (error: Error) => void
}

export class StreamingPreprocessingManager {
  private isStreaming = false
  private currentProcessor: StreamingTextProcessorInstance | null = null

  private logPreprocessingError(source: string, error: NonNullable<PreprocessingResult['error']>): void {
    const details = (error.details ?? {}) as Record<string, unknown>
    const summaryParts: string[] = []

    const status = details['status']
    if (typeof status === 'number') summaryParts.push(`status=${status}`)

    const statusText = details['statusText']
    if (typeof statusText === 'string' && statusText.length) summaryParts.push(`statusText="${statusText}"`)

    const serverMessage = details['serverMessage']
    if (typeof serverMessage === 'string' && serverMessage.length) summaryParts.push(`serverMessage="${serverMessage}"`)

    const suggestion = details['suggestion']
    if (typeof suggestion === 'string' && suggestion.length) summaryParts.push(`suggestion="${suggestion}"`)

    const timeoutMs = details['timeoutMs']
    if (typeof timeoutMs === 'number') summaryParts.push(`timeoutMs=${timeoutMs}`)

    const summary = summaryParts.length > 0 ? ` (${summaryParts.join(', ')})` : ''

    const baseMessage = `[StreamingPreprocessingManager] ${source} error (${error.type}): ${error.message}${summary}`

    if (Object.keys(details).length > 0) {
      console.warn(baseMessage, details)
    } else {
      console.warn(baseMessage)
    }
  }

  /**
   * Start streaming preprocessing for the given text
   */
  async startStreamingPreprocessing(
    rawText: string,
    streamingProcessor: StreamingTextProcessorInstance,
    options: StreamingPreprocessingOptions = {}
  ): Promise<void> {
    if (this.isStreaming) {
      throw new Error('Streaming preprocessing already in progress')
    }

    this.isStreaming = true
    this.currentProcessor = streamingProcessor

    try {
      options.onStreamingStart?.()

      // Ensure the streaming processor is started with clean UI state.
      // Start without seeding text to avoid duplicate processing when using streaming providers.
      await streamingProcessor.startStreamingText('')

      // Get preprocessing configuration
      const config = await preprocessingConfigService.getConfig()

      // Create provider instances
      const openAiProvider = new OpenAIProvider()
      const passthroughProvider = new PassthroughProvider()

      // Check if we should use streaming preprocessing (only when enabled and provider is available)
      if (config.enabled && openAiProvider.isAvailable(config)) {
        console.log('[StreamingPreprocessingManager] Using OpenAI streaming provider')
        await this.processWithStreamingProvider(rawText, openAiProvider, config, streamingProcessor)
      } else {
        // Fall back to non-streaming preprocessing (simulate streaming)
        let reason: string
        if (!config.enabled) {
          reason = 'preprocessing disabled in config'
        } else {
          const availabilityInfo = await openAiProvider.getAvailabilityInfo()
          reason = `OpenAI provider not available: ${availabilityInfo.reason || 'unknown reason'}`
        }
        console.log(`[StreamingPreprocessingManager] Falling back to passthrough provider: ${reason}`)
        await this.processWithNonStreamingProvider(rawText, passthroughProvider, config, streamingProcessor)
      }

      options.onStreamingComplete?.()
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      options.onError?.(err)
      throw err
    } finally {
      this.isStreaming = false
      this.currentProcessor = null
    }
  }

  /**
   * Process with streaming OpenAI provider
   */
  private async processWithStreamingProvider(
    rawText: string,
    provider: OpenAIProvider,
    config: PreprocessingConfig,
    streamingProcessor: StreamingTextProcessorInstance
  ): Promise<void> {
    // Create token callback that feeds to streaming processor
    const onToken: StreamingTokenCallback = async (token: string) => {
      if (this.currentProcessor) {
        await this.currentProcessor.addStreamingToken(token)
      }
    }

    // Streaming processor should already be initialized by caller
    // No need to call startStreamingText again as it would reset state and repeat preprocessing

    try {
      // Process with streaming OpenAI
      const result = await provider.processWithStreaming(rawText, config, onToken)

      // Complete the streaming
      await streamingProcessor.completeStreamingText()

      // Handle any errors from preprocessing
      if (result.error) {
        this.logPreprocessingError('OpenAI streaming', result.error)
      }
    } catch (error) {
      // Cancel streaming on error
      console.error('[StreamingPreprocessingManager] Streaming provider threw error:', error)
      this.currentProcessor?.cancelStreaming()
      throw error
    }
  }

  /**
   * Process with non-streaming provider (fallback)
   */
  private async processWithNonStreamingProvider(
    rawText: string,
    provider: PassthroughProvider,
    config: PreprocessingConfig,
    streamingProcessor: StreamingTextProcessorInstance
  ): Promise<void> {
    // Streaming processor should already be initialized by caller
    // No need to call startStreamingText again as it would reset state and repeat preprocessing

    try {
      // Process through regular preprocessing
      const result = await provider.process(rawText, config)

      // Feed the entire processed text as one chunk
      const processedText = result.text || rawText

      // Split into smaller chunks to simulate streaming
      const chunkSize = 100 // characters per chunk
      for (let i = 0; i < processedText.length; i += chunkSize) {
        const chunk = processedText.slice(i, i + chunkSize)
        await streamingProcessor.addStreamingToken(chunk)

        // Small delay to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      // Complete the streaming
      await streamingProcessor.completeStreamingText()

      // Handle any errors from preprocessing
      if (result.error) {
        this.logPreprocessingError('Passthrough streaming fallback', result.error)
      }
    } catch (error) {
      // Cancel streaming on error
      console.error('[StreamingPreprocessingManager] Non-streaming provider threw error:', error)
      this.currentProcessor?.cancelStreaming()
      throw error
    }
  }

  /**
   * Cancel current streaming preprocessing
   */
  cancelStreaming(): void {
    if (this.isStreaming && this.currentProcessor) {
      this.currentProcessor.cancelStreaming()
      this.isStreaming = false
      this.currentProcessor = null
    }
  }

  /**
   * Check if currently streaming
   */
  isCurrentlyStreaming(): boolean {
    return this.isStreaming
  }
}
