export { decodeHtml } from '../common/html'
import { preprocessText } from './text-processor'
import { aiPreprocessingService } from '../preprocessing/ai-preprocessing.service'
import { initializeStreamingText } from './streaming-text'
import type { StreamingTextProcessorInstance } from './streaming-text'
import { StreamingPreprocessingManager } from '../preprocessing/streaming-manager'
import { createChunks } from './timing-engine'
import { timingService } from './timing/timing.service'
import { calculateOptimalFontSizeForText } from './visual-effects'
import { getTimingSettings, resetStreamingState } from './state/legacy-state-helpers'
import { useReaderStore } from './state/reader.store'
import type { ReaderToken } from './text-types'

type RenderCallback = () => void

let renderCallback: RenderCallback | null = null

export function registerRenderCallback(callback: RenderCallback): void {
  renderCallback = callback
}

function notifyRender(): void {
  renderCallback?.()
}

export async function rebuildWordItems (): Promise<void> {
  const store = useReaderStore.getState()
  const rawText = store.tokens.map(w => w.text).join(' ')
  const preprocessingResult = await aiPreprocessingService.translateText(rawText)
  // Let the timing service compute the final word items from text
  const wordItems = timingService.calculateWordTimingFromText(preprocessingResult.text, getTimingSettings())
  // Update words (with bold info) to match processed text
  const preprocessedWords = preprocessText(preprocessingResult.text)
  const tokens = preprocessedWords.map(word => ({ text: word.text, isBold: word.isBold }))

  const optimalFontSize = calculateOptimalFontSizeForText(wordItems)
  useReaderStore.setState({
    wordItems,
    tokens,
    optimalFontSize
  })
}

/**
 * Rebuild word items with streaming preprocessing
 */
export async function rebuildWordItemsWithStreaming (): Promise<void> {
  const store = useReaderStore.getState()
  const originalRawText = store.tokens.map(w => w.text).join(' ')

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
    notifyRender()
    return
  }
  const streamingManager = new StreamingPreprocessingManager()

  notifyRender()

  let fallbackTriggered = false

  const cleanupAndFallback = async () => {
    if (fallbackTriggered) return
    fallbackTriggered = true
    resetStreamingState()
    streamingProcessor?.cancelStreaming()
    await rebuildWordItems()
    notifyRender()
  }

  try {
    // Start streaming preprocessing
    await streamingManager.startStreamingPreprocessing(originalRawText, streamingProcessor, {
      onStreamingStart: () => {
        notifyRender()
      },
      onStreamingComplete: () => {
        notifyRender()
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
  useReaderStore.setState({ tokens: words, index: 0 })
  await rebuildWordItems()
  useReaderStore.setState({ index: 0 })
}

/**
 * Set words with streaming processing - processes text chunks as they arrive
 */
export async function setWordsWithStreaming (words: ReaderToken[]): Promise<void> {
  useReaderStore.setState({ tokens: words, index: 0, isPreprocessing: true, isStreaming: true })
  await rebuildWordItemsWithStreaming()
  useReaderStore.setState({ index: 0 })
}

export function updateOptimalFontSize (): void {
  const store = useReaderStore.getState()
  if (store.wordItems.length > 0) {
    const optimalFontSize = calculateOptimalFontSizeForText(store.wordItems)
    store.setOptimalFontSize(optimalFontSize)
  }
}

export function recalculateTimingOnly (): void {
  // Only recalculate timing without preprocessing - use existing words
  const store = useReaderStore.getState()
  const preprocessedWords = preprocessText(store.tokens.map(w => w.text).join(' '))

  // Preserve the isBold information from existing tokens
  const wordsWithBoldInfo = preprocessedWords.map((word, index) => ({
    text: word.text,
    isBold: store.tokens[index]?.isBold || word.isBold
  }))

  const timingSettings = getTimingSettings()
  const wordItems = createChunks(wordsWithBoldInfo, timingSettings)

  const optimalFontSize = calculateOptimalFontSizeForText(wordItems)
  useReaderStore.setState({ wordItems, optimalFontSize })
}
