/**
 * Streaming Text Module
 *
 * Main orchestrator for the streaming RSVP pipeline that processes text chunks
 * as they arrive from OpenAI and immediately converts them to RSVP chunks.
 */

import { preprocessTextForReader } from '../preprocessing/index'
import { StreamingTextBuffer } from './streaming-text-buffer'
import { StreamingTextProcessor } from './streaming-text-processor'
import {
  startStreaming,
  completeStreaming,
  appendWordItems,
  updateStreamingProgress,
  resetStreamingState
} from './state/legacy-state-helpers'
import { useReaderStore } from './state/reader.store'
import { renderCurrentWord } from './render'
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
    appendWordItems(chunks)

    // Update optimal font size based on all words so far
    const store = useReaderStore.getState()
    const optimalFontSize = this.textProcessor.updateOptimalFontSize(store.tokens)
    store.setOptimalFontSize(optimalFontSize)

    // If not playing yet and we have enough chunks, allow user to start
    if (store.status !== 'playing' && store.wordItems.length >= 3) {
      renderCurrentWord() // Update the display
    }
  }

  private handleWordsReady(words: { text: string; isBold: boolean }[]): void {
    // Add words to store tokens - this is now handled via callback instead of direct mutation
    const store = useReaderStore.getState()
    store.setTokens([...store.tokens, ...words])
  }

  private handleProgressUpdate(progress: { processedChunks: number; estimatedTotal?: number }): void {
    updateStreamingProgress(progress.processedChunks, progress.estimatedTotal)

    // Update progress UI if available
    const progressElement = document.getElementById('progress')
    const store = useReaderStore.getState()
    if (progressElement && store.isStreaming) {
      const percentage = store.estimatedTotalChunks
        ? Math.min((progress.processedChunks / store.estimatedTotalChunks) * 100, 100)
        : undefined

      if (percentage !== undefined) {
        progressElement.textContent = `Processing... ${Math.round(percentage)}%`
      } else {
        progressElement.textContent = `Processing... ${progress.processedChunks} chunks ready`
      }
    }
  }

  private handleProcessingComplete(): void {
    completeStreaming()

    // Update progress UI
    const progressElement = document.getElementById('progress')
    if (progressElement) {
      const store = useReaderStore.getState()
      progressElement.textContent = `Ready: ${store.wordItems.length} chunks`
    }

    // Final render update
    renderCurrentWord()
  }

  private handleProcessingError(error: Error, meta: { chunkLength: number; processedChunks: number }): void {
    console.error('Streaming text processor error:', error, meta)
  }

  async startStreamingText(rawText: string): Promise<void> {
    // Reset state
    resetStreamingState()
    useReaderStore.setState({
      tokens: [],
      wordItems: [],
      index: 0
    })

    // Reset text processor
    this.textProcessor.reset()

    // Start streaming mode
    startStreaming()

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
          setImmediate(() => {
            this.processTokenQueue().catch(error => {
              console.error('Error in recursive token processing:', error)
            })
          })
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
    resetStreamingState()
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
