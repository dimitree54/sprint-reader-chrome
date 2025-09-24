/**
 * Streaming Text Processor
 *
 * Processes text chunks into RSVP chunks as they arrive from the streaming buffer.
 * Based on the Python StreamingRSVPPipeline implementation.
 */

import { preprocessText } from './text-processor'
import { createChunks } from './timing-engine'
import { calculateOptimalFontSizeForText } from './visual-effects'
import { getTimingSettings, state } from './state'
import type { WordItem } from './timing-engine'

export interface StreamingTextProcessorOptions {
  onChunksReady: (chunks: WordItem[]) => void
  onProgressUpdate: (progress: { processedChunks: number; estimatedTotal?: number }) => void
  onProcessingComplete: () => void
  onProcessingError?: (error: Error, textChunk: string) => void
}

let lastFontSizeUpdate = 0
const FONT_SIZE_UPDATE_THROTTLE = 100

export class StreamingTextProcessor {
  private readonly onChunksReady: (chunks: WordItem[]) => void
  private readonly onProgressUpdate: (progress: { processedChunks: number; estimatedTotal?: number }) => void
  private readonly onProcessingComplete: () => void
  private readonly onProcessingError?: (error: Error, textChunk: string) => void

  private processedChunkCount = 0
  private isProcessingComplete = false

  constructor(options: StreamingTextProcessorOptions) {
    this.onChunksReady = options.onChunksReady
    this.onProgressUpdate = options.onProgressUpdate
    this.onProcessingComplete = options.onProcessingComplete
    this.onProcessingError = options.onProcessingError
  }

  /**
   * Process a text chunk into RSVP chunks and notify when ready
   */
  async processTextChunk(textChunk: string): Promise<void> {
    if (this.isProcessingComplete) {
      return
    }

    try {
      // Preprocess the text chunk
      const preprocessedWords = preprocessText(textChunk)

      if (preprocessedWords.length === 0) {
        return
      }

      // Update state.words with new words (preserving bold information)
      const readerTokens = preprocessedWords.map(word => ({
        text: word.text,
        isBold: word.isBold
      }))
      state.words.push(...readerTokens)

      // Create RSVP chunks with current timing settings
      const timingSettings = getTimingSettings()
      const chunks = createChunks(preprocessedWords, timingSettings)

      if (chunks.length > 0) {
        // Update processed chunk count
        this.processedChunkCount += chunks.length

        // Notify that chunks are ready
        this.onChunksReady(chunks)

        // Update progress
        this.onProgressUpdate({
          processedChunks: this.processedChunkCount
        })
      }
    } catch (error) {
      const normalisedError = error instanceof Error ? error : new Error(String(error))
      console.error('Error processing text chunk:', normalisedError)
      this.onProcessingError?.(normalisedError, textChunk)
    }
  }

  /**
   * Signal that no more text chunks will be processed
   */
  complete(): void {
    if (!this.isProcessingComplete) {
      this.isProcessingComplete = true
      this.onProcessingComplete()
    }
  }

  /**
   * Reset the processor for a new session
   */
  reset(): void {
    this.processedChunkCount = 0
    this.isProcessingComplete = false
    // Clear words array for new streaming session
    state.words = []
  }

  /**
   * Get current processing statistics
   */
  getStats(): { processedChunks: number; isComplete: boolean } {
    return {
      processedChunks: this.processedChunkCount,
      isComplete: this.isProcessingComplete
    }
  }
}

/**
 * Update optimal font size based on all processed chunks
 * This should be called periodically as new chunks are added
 */
export function updateOptimalFontSizeForStreamedChunks(allChunks: WordItem[]): string {
  const now = Date.now()

  if (now - lastFontSizeUpdate < FONT_SIZE_UPDATE_THROTTLE) {
    return state.optimalFontSize
  }

  lastFontSizeUpdate = now

  if (allChunks.length > 0) {
    return calculateOptimalFontSizeForText(allChunks)
  }
  return state.optimalFontSize
}
