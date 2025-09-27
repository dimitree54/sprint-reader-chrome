/**
 * Streaming Text Module
 *
 * Main orchestrator for the streaming RSVP pipeline that processes text chunks
 * as they arrive from OpenAI and immediately converts them to RSVP chunks.
 */

import { preprocessTextForReader } from '../preprocessing/index'
import { StreamingTextBuffer } from './streaming-text-buffer'
import { StreamingTextProcessor } from './streaming-text-processor'
// legacy-state-helpers removed; use store directly
import { useReaderStore } from './state/reader.store'
import type { WordItem } from './timing-engine'

export interface StreamingTextProcessorInstance {
  startStreamingText: (rawText: string) => Promise<void>
  addStreamingToken: (token: string) => Promise<void>
  completeStreamingText: () => Promise<void>
  cancelStreaming: () => void
}

class StreamingTextOrchestrator {
  private textBuffer: StreamingTextBuffer
  private textProcessor: StreamingTextProcessor
  private isProcessing = false
  private pendingTokens: string[] = []
  private processingTokens = false
  private currentProcessingPromise: Promise<void> | null = null

  constructor() {
    this.textBuffer = new StreamingTextBuffer({
      minBufferSize: 50,
      sentenceDelimiters: '.!?'
    })

    this.textProcessor = new StreamingTextProcessor({
      onChunksReady: this.handleChunksReady.bind(this),
      onWordsReady: this.handleWordsReady.bind(this),
      onProgressUpdate: this.handleProgressUpdate.bind(this),
      onProcessingComplete: this.handleProcessingComplete.bind(this),
      onProcessingError: this.handleProcessingError.bind(this)
    })
  }

  private handleChunksReady(chunks: WordItem[]): void {
    // Add new chunks to state
    useReaderStore.getState().appendWordItems(chunks)

    // Update optimal font size based on all words so far
    const store = useReaderStore.getState()
    const optimalFontSize = this.textProcessor.updateOptimalFontSize(store.tokens)
    store.setOptimalFontSize(optimalFontSize)

    // If not playing yet and we have enough chunks, allow user to start
    // Renderer will react to wordItems.length change automatically
    // Once we have any chunks, preprocessing is no longer blocking UI
    if (store.isPreprocessing && store.wordItems.length > 0) {
      store.setIsPreprocessing(false)
    }
  }

  private handleWordsReady(words: { text: string; isBold: boolean }[]): void {
    // Add words to store tokens using functional setState to prevent races
    useReaderStore.setState(s => ({ tokens: s.tokens.concat(words) }))
  }

  private handleProgressUpdate(progress: { processedChunks: number; estimatedTotal?: number }): void {
    useReaderStore.setState({
      processedChunkCount: progress.processedChunks,
      estimatedTotalChunks: progress.estimatedTotal
    })
    // Renderer will react to store changes automatically
  }

  private handleProcessingComplete(): void {
    useReaderStore.setState({ isStreaming: false, streamingComplete: true })
    // Ensure preprocessing flag is cleared
    const store = useReaderStore.getState()
    if (store.isPreprocessing) {
      store.setIsPreprocessing(false)
    }
    // Renderer will react to store changes automatically
  }

  private handleProcessingError(error: Error, meta: { chunkLength: number; processedChunks: number }): void {
    console.error('Streaming text processor error:', error, meta)
  }

  async startStreamingText(rawText: string): Promise<void> {
    // Reset text processor
    this.textProcessor.reset()

    // Reset and start streaming mode in a single setState to avoid flicker
    useReaderStore.setState({
      isStreaming: true,
      streamingComplete: false,
      processedChunkCount: 0,
      estimatedTotalChunks: undefined,
      tokens: [],
      wordItems: [],
      index: 0
    })

    // Do initial preprocessing if we have text
    if (rawText.trim()) {
      try {
        const preprocessingResult = await preprocessTextForReader(rawText)

        // Process the initial text immediately
        await this.textProcessor.processTextChunk(preprocessingResult.text)
      } catch (error) {
        console.error('Error in initial preprocessing:', error)
      }
    }

    this.isProcessing = true
  }

  async addStreamingToken(token: string): Promise<void> {
    if (!this.isProcessing) {
      return
    }

    // Add to pending tokens
    this.pendingTokens.push(token)

    // Always await the queue drain (returns the in‑flight promise when active)
    await this.processTokenQueue()
  }

  private async processTokenQueue(): Promise<void> {
    if (this.processingTokens) {
      return this.currentProcessingPromise ?? Promise.resolve()
    }

    if (this.pendingTokens.length === 0) {
      return Promise.resolve()
    }

    this.processingTokens = true

    const processingPromise = (async () => {
      try {
        while (this.pendingTokens.length > 0) {
          const token = this.pendingTokens.shift()!

          // Add token to buffer and check for complete sentences
          const completeSentence = this.textBuffer.addToken(token)

          if (completeSentence) {
            // Process the complete sentence through text processor
            await this.textProcessor.processTextChunk(completeSentence)
          }
        }
      } finally {
        this.processingTokens = false
        this.currentProcessingPromise = null

        // If tokens arrived during the drain, immediately continue processing
        if (this.pendingTokens.length > 0) {
          // Recursively process any tokens that arrived during processing
          setTimeout(() => {
            this.processTokenQueue().catch(error => {
              console.error('Error in recursive token processing:', error)
            })
          }, 0)
        }
      }
    })()

    this.currentProcessingPromise = processingPromise

    return processingPromise
  }

  async completeStreamingText(): Promise<void> {
    if (!this.isProcessing) {
      return
    }

    // Process any remaining tokens
    await this.processTokenQueue()

    // Flush any remaining content in buffer
    const remainingText = this.textBuffer.flush()
    if (remainingText) {
      await this.textProcessor.processTextChunk(remainingText)
    }

    // Signal completion to text processor
    this.textProcessor.complete()

    this.isProcessing = false
  }

  cancelStreaming(): void {
    this.isProcessing = false
    this.processingTokens = false
    this.pendingTokens = []
    this.textBuffer.clear()
    this.textProcessor.reset()
    this.currentProcessingPromise = null
    useReaderStore.setState({
      isStreaming: false,
      streamingComplete: false,
      processedChunkCount: 0,
      estimatedTotalChunks: undefined
    })
  }
}

// Global instance
let streamingOrchestrator: StreamingTextOrchestrator | null = null

/**
 * Initialize a new streaming text session
 */
export async function initializeStreamingText(rawText: string): Promise<StreamingTextProcessorInstance> {
  // Ensure any previous session is torn down
  if (streamingOrchestrator) {
    try { streamingOrchestrator.cancelStreaming() } catch { /* ignore errors during cleanup */ }
    streamingOrchestrator = null
  }
  // Create new orchestrator for this session
  streamingOrchestrator = new StreamingTextOrchestrator()

  // Start processing
  await streamingOrchestrator.startStreamingText(rawText)

  return {
    startStreamingText: streamingOrchestrator.startStreamingText.bind(streamingOrchestrator),
    addStreamingToken: streamingOrchestrator.addStreamingToken.bind(streamingOrchestrator),
    completeStreamingText: streamingOrchestrator.completeStreamingText.bind(streamingOrchestrator),
    cancelStreaming: streamingOrchestrator.cancelStreaming.bind(streamingOrchestrator)
  }
}

/**
 * Check if we're currently in streaming mode
 */
export function isCurrentlyStreaming(): boolean {
  return useReaderStore.getState().isStreaming
}

/**
 * Get streaming progress information
 */
export function getStreamingProgress(): {
  processedChunks: number
  estimatedTotal?: number
  isComplete: boolean
} {
  const store = useReaderStore.getState()
  return {
    processedChunks: store.processedChunkCount,
    estimatedTotal: store.estimatedTotalChunks,
    isComplete: store.streamingComplete
  }
}
