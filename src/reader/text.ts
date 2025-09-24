export { decodeHtml } from '../common/html'
import { preprocessText } from './text-processor'
import { preprocessTextForReader } from '../preprocessing/index'
import { initializeStreamingText } from './streaming-text'
import type { StreamingTextProcessorInstance } from './streaming-text'
import { StreamingPreprocessingManager } from '../preprocessing/streaming-manager'
import { createChunks } from './timing-engine'
import { calculateOptimalFontSizeForText } from './visual-effects'
import { getTimingSettings, state, resetStreamingState } from './state'
import type { ReaderToken } from './text-types'

export async function rebuildWordItems (): Promise<void> {
  const rawText = state.words.map(w => w.text).join(' ')

  const preprocessingResult = await preprocessTextForReader(rawText)
  const preprocessedWords = preprocessText(preprocessingResult.text)

  // Update the state.words with the new preprocessed words (including bold information)
  state.words = preprocessedWords.map(word => ({ text: word.text, isBold: word.isBold }))

  const timingSettings = getTimingSettings()
  state.wordItems = createChunks(preprocessedWords, timingSettings)

  state.optimalFontSize = calculateOptimalFontSizeForText(state.wordItems)
}

/**
 * Rebuild word items with streaming preprocessing
 */
export async function rebuildWordItemsWithStreaming (): Promise<void> {
  const originalRawText = state.words.map(w => w.text).join(' ')

  // Clear any existing streaming state
  resetStreamingState()

  // Initialize streaming
  let streamingProcessor: StreamingTextProcessorInstance | null = null
  try {
    streamingProcessor = await initializeStreamingText(originalRawText)
  } catch (error) {
    console.error('Failed to initialize streaming:', error)
    resetStreamingState()
    streamingProcessor?.cancelStreaming()
    await rebuildWordItems()
    return
  }
  const streamingManager = new StreamingPreprocessingManager()

  const { renderCurrentWord } = await import('./render')
  renderCurrentWord()

  const cleanupAndFallback = async () => {
    resetStreamingState()
    streamingProcessor?.cancelStreaming()
    await rebuildWordItems()
  }

  try {
    // Start streaming preprocessing
    await streamingManager.startStreamingPreprocessing(originalRawText, streamingProcessor, {
      onStreamingStart: () => {
        renderCurrentWord()
      },
      onStreamingComplete: () => {
        renderCurrentWord()
      },
      onError: async (error) => {
        console.error('Streaming preprocessing error:', error)
        // Cleanup and fallback to regular processing
        await cleanupAndFallback()
      }
    })
  } catch (error) {
    console.error('Error during streaming:', error)
    // Cleanup and fallback to regular processing
    await cleanupAndFallback()
  }
}

export async function setWords (words: ReaderToken[]): Promise<void> {
  state.words = words
  await rebuildWordItems()
  state.index = 0
}

/**
 * Set words with streaming processing - processes text chunks as they arrive
 */
export async function setWordsWithStreaming (words: ReaderToken[]): Promise<void> {
  state.words = words
  await rebuildWordItemsWithStreaming()
  state.index = 0
}

export function updateOptimalFontSize (): void {
  if (state.wordItems.length > 0) {
    state.optimalFontSize = calculateOptimalFontSizeForText(state.wordItems)
  }
}

export function recalculateTimingOnly (): void {
  // Only recalculate timing without preprocessing - use existing words
  const preprocessedWords = preprocessText(state.words.map(w => w.text).join(' '))

  // Preserve the isBold information from existing state.words
  const wordsWithBoldInfo = preprocessedWords.map((word, index) => ({
    text: word.text,
    isBold: state.words[index]?.isBold || word.isBold
  }))

  const timingSettings = getTimingSettings()
  state.wordItems = createChunks(wordsWithBoldInfo, timingSettings)

  state.optimalFontSize = calculateOptimalFontSizeForText(state.wordItems)
}
