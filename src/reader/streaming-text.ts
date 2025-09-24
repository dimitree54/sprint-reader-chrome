/**
 * Streaming Text Module
 *
 * Main orchestrator for the streaming RSVP pipeline that processes text chunks
 * as they arrive from OpenAI and immediately converts them to RSVP chunks.
 */

import { preprocessTextForReader } from '../preprocessing/index'
import { StreamingTextBuffer } from './streaming-text-buffer'
import { StreamingTextProcessor, updateOptimalFontSizeForStreamedChunks } from './streaming-text-processor'
import {
  state,
  startStreaming,
  completeStreaming,
  appendWordItems,
  updateStreamingProgress,
  resetStreamingState
} from './state'
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
      onProgressUpdate: this.handleProgressUpdate.bind(this),
      onProcessingComplete: this.handleProcessingComplete.bind(this),
      onProcessingError: this.handleProcessingError.bind(this)
    })
  }

  private handleChunksReady(chunks: WordItem[]): void {
    // Add new chunks to state
    appendWordItems(chunks)

    // Update optimal font size based on all chunks so far
    state.optimalFontSize = updateOptimalFontSizeForStreamedChunks(state.wordItems)

    // If not playing yet and we have enough chunks, allow user to start
    if (!state.playing && state.wordItems.length >= 3) {
      renderCurrentWord() // Update the display
    }
  }

  private handleProgressUpdate(progress: { processedChunks: number; estimatedTotal?: number }): void {
    updateStreamingProgress(progress.processedChunks, progress.estimatedTotal)

    // Update progress UI if available
    const progressElement = document.getElementById('progress')
    if (progressElement && state.isStreaming) {
      const percentage = state.estimatedTotalChunks
        ? Math.min((progress.processedChunks / state.estimatedTotalChunks) * 100, 100)
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
      progressElement.textContent = `Ready: ${state.wordItems.length} chunks`
    }

    // Final render update
    renderCurrentWord()
  }

  private handleProcessingError(error: Error, textChunk: string): void {
    console.error('Streaming text processor failed on chunk:', error, textChunk)
  }

  async startStreamingText(rawText: string): Promise<void> {
    // Reset state
    resetStreamingState()
    state.wordItems = []
    state.index = 0

    // Reset text processor (this will clear state.words)
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

    // Process tokens if not already processing
    if (!this.processingTokens) {
      await this.processTokenQueue()
    }
  }

  private async processTokenQueue(): Promise<void> {
    if (this.processingTokens) {
      return this.currentProcessingPromise ?? Promise.resolve()
    }

    if (this.pendingTokens.length === 0) {
      return this.currentProcessingPromise ?? Promise.resolve()
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
    resetStreamingState()
  }
}

// Global instance
let streamingOrchestrator: StreamingTextOrchestrator | null = null

/**
 * Initialize a new streaming text session
 */
export async function initializeStreamingText(rawText: string): Promise<StreamingTextProcessorInstance> {
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
  return state.isStreaming
}

/**
 * Get streaming progress information
 */
export function getStreamingProgress(): {
  processedChunks: number
  estimatedTotal?: number
  isComplete: boolean
} {
  return {
    processedChunks: state.processedChunkCount,
    estimatedTotal: state.estimatedTotalChunks,
    isComplete: state.streamingComplete
  }
}
