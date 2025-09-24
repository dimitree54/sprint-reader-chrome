/**
 * Streaming Preprocessing Manager
 *
 * Coordinates streaming preprocessing with the OpenAI provider and text processor
 */

import { preprocessingConfigService } from './config'
import { OpenAIProvider, type StreamingTokenCallback } from './providers/openai'
import { PassthroughProvider } from './providers/passthrough'
import type { StreamingTextProcessorInstance } from '../reader/streaming-text'

export interface StreamingPreprocessingOptions {
  onStreamingStart?: () => void
  onStreamingComplete?: () => void
  onError?: (error: Error) => void
}

export class StreamingPreprocessingManager {
  private isStreaming = false
  private currentProcessor: StreamingTextProcessorInstance | null = null

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

      // Get preprocessing configuration
      const config = await preprocessingConfigService.getConfig()

      // Create provider instances
      const openAiProvider = new OpenAIProvider()
      const passthroughProvider = new PassthroughProvider()

      // Check if we should use streaming preprocessing
      if (openAiProvider.isAvailable(config) && config.apiKey) {
        await this.processWithStreamingProvider(rawText, openAiProvider, config, streamingProcessor)
      } else {
        // Fall back to non-streaming preprocessing
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
    config: any, // eslint-disable-line @typescript-eslint/no-explicit-any
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
        console.warn('Preprocessing error (using original text):', result.error.message)
      }
    } catch (error) {
      // Cancel streaming on error
      this.currentProcessor?.cancelStreaming()
      throw error
    }
  }

  /**
   * Process with non-streaming provider (fallback)
   */
  private async processWithNonStreamingProvider(
    rawText: string,
    provider: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    config: any, // eslint-disable-line @typescript-eslint/no-explicit-any
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
        console.warn('Preprocessing error (using original text):', result.error.message)
      }
    } catch (error) {
      // Cancel streaming on error
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