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
import type { ReaderToken } from './text-types'

export interface StreamingTextProcessorOptions {
  onChunksReady: (chunks: WordItem[]) => void
  onWordsReady: (words: ReaderToken[]) => void
  onProgressUpdate: (progress: { processedChunks: number; estimatedTotal?: number }) => void
  onProcessingComplete: () => void
  onProcessingError?: (error: Error, meta: { chunkLength: number; processedChunks: number }) => void
  fontSizeKey?: string
}

const FONT_SIZE_UPDATE_THROTTLE = 100
type FontSizeCache = { lastUpdate: number; lastSize: string }
const fontSizeCache = new Map<string, FontSizeCache>()

function getFontSizeCache(key: string): FontSizeCache {
  let cache = fontSizeCache.get(key)
  if (!cache) {
    cache = { lastUpdate: 0, lastSize: state.optimalFontSize }
    fontSizeCache.set(key, cache)
  }
  return cache
}

export class StreamingTextProcessor {
  private readonly onChunksReady: (chunks: WordItem[]) => void
  private readonly onWordsReady: (words: ReaderToken[]) => void
  private readonly onProgressUpdate: (progress: { processedChunks: number; estimatedTotal?: number }) => void
  private readonly onProcessingComplete: () => void
  private readonly onProcessingError?: (error: Error, meta: { chunkLength: number; processedChunks: number }) => void
  private readonly fontSizeKey: string

  private processedChunkCount = 0
  private isProcessingComplete = false

  constructor(options: StreamingTextProcessorOptions) {
    this.onChunksReady = options.onChunksReady
    this.onWordsReady = options.onWordsReady
    this.onProgressUpdate = options.onProgressUpdate
    this.onProcessingComplete = options.onProcessingComplete
    this.onProcessingError = options.onProcessingError
    this.fontSizeKey = options.fontSizeKey || `processor-${Date.now()}-${Math.random()}`
  }

  /**
   * Process a text chunk into RSVP chunks and notify when ready
   */
  processTextChunk(textChunk: string): void {
    if (this.isProcessingComplete) {
      return
    }

    try {
      // Preprocess the text chunk
      const preprocessedWords = preprocessText(textChunk)

      if (preprocessedWords.length === 0) {
        return
      }

      // Emit words via callback instead of mutating global state
      const readerTokens = preprocessedWords.map(word => ({
        text: word.text,
        isBold: word.isBold
      }))
      this.onWordsReady(readerTokens)

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
          processedChunks: this.processedChunkCount,
          estimatedTotal: state.estimatedTotalChunks
        })
      }
    } catch (error) {
      const normalisedError = error instanceof Error ? error : new Error(String(error))
      console.error(`[StreamingTextProcessor] Error processing chunk (${textChunk.length} chars):`, normalisedError, {
        chunkLength: textChunk.length,
        processedChunks: this.processedChunkCount
      })
      this.onProcessingError?.(normalisedError, {
        chunkLength: textChunk.length,
        processedChunks: this.processedChunkCount
      })
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
    // Clear font-size cache for this processor instance only
    fontSizeCache.delete(this.fontSizeKey)
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

  /**
   * Update optimal font size for the current processor session.
   * Uses instance-scoped caching to prevent cross-session bleed.
   *
   * @param words - Array of word-like objects with text property for font size calculation
   * @returns Computed font size as CSS string (e.g., "24px")
   */
  updateOptimalFontSize(words: { text: string }[]): string {
    const cache = getFontSizeCache(this.fontSizeKey)
    const now = (typeof performance !== 'undefined' && typeof performance.now === 'function')
      ? performance.now()
      : Date.now()

    if (now - cache.lastUpdate < FONT_SIZE_UPDATE_THROTTLE) {
      return cache.lastSize
    }

    cache.lastUpdate = now

    if (words.length > 0) {
      cache.lastSize = calculateOptimalFontSizeForText(words)
      return cache.lastSize
    }
    return cache.lastSize
  }
}
