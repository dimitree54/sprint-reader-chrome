export { decodeHtml } from '../common/html'
import { preprocessText } from './text-processor'
import { aiPreprocessingService } from '../preprocessing/ai-preprocessing.service'
import { initializeStreamingText } from './streaming-text'
import type { StreamingTextProcessorInstance } from './streaming-text'
import { StreamingPreprocessingManager } from '../preprocessing/streaming-manager'
import { createChunks } from './timing-engine'
import { timingService } from './timing/timing.service'
import { calculateOptimalFontSizeForText } from './visual-effects'
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
  const prefs = useReaderStore.getState()
  const wordItems = timingService.calculateWordTimingFromText(preprocessingResult.text, {
    wordsPerMinute: prefs.wordsPerMinute,
    pauseAfterComma: prefs.pauseAfterComma,
    pauseAfterPeriod: prefs.pauseAfterPeriod,
    pauseAfterParagraph: prefs.pauseAfterParagraph,
    chunkSize: prefs.chunkSize
  })
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
  await rebuildWordItemsWithStreamingFromRawText(originalRawText)
}

async function rebuildWordItemsWithStreamingFromRawText (originalRawText: string): Promise<void> {
  // Clear any existing streaming state
  useReaderStore.setState({
    isStreaming: false,
    streamingComplete: false,
    processedChunkCount: 0,
    estimatedTotalChunks: undefined
  })

  // Initialize streaming
  let streamingProcessor: StreamingTextProcessorInstance | null = null
  try {
    // Initialize without seeding text to avoid duplicate processing
    streamingProcessor = await initializeStreamingText('')
  } catch (error) {
    console.error('Failed to initialize streaming:', error)
    useReaderStore.setState({
      isStreaming: false,
      streamingComplete: false,
      processedChunkCount: 0,
      estimatedTotalChunks: undefined
    })
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
    useReaderStore.setState({
      isStreaming: false,
      streamingComplete: false,
      processedChunkCount: 0,
      estimatedTotalChunks: undefined
    })
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

/**
 * Start streaming based on provided tokens. This is the canonical path.
 * Passing full text as tokens is treated as a special case of streaming.
 */
export async function startStreamingFromTokens (words: ReaderToken[]): Promise<void> {
  const rawText = words.map(w => w.text).join(' ')
  // Seed immediate UI state so the reader shows content before streaming finishes
  const store = useReaderStore.getState()
  const preprocessedWords = preprocessText(rawText)
  const wordsWithBoldInfo = preprocessedWords.map((word, index) => ({
    text: word.text,
    isBold: words[index]?.isBold || word.isBold
  }))
  const timingSettings = {
    wordsPerMinute: store.wordsPerMinute,
    pauseAfterComma: store.pauseAfterComma,
    pauseAfterPeriod: store.pauseAfterPeriod,
    pauseAfterParagraph: store.pauseAfterParagraph,
    chunkSize: store.chunkSize
  }
  const wordItems = createChunks(wordsWithBoldInfo, timingSettings)
  const optimalFontSize = calculateOptimalFontSizeForText(wordItems)
  useReaderStore.setState({
    tokens: words,
    wordItems,
    optimalFontSize,
    index: 0,
    isPreprocessing: true,
    isStreaming: true
  })
  await rebuildWordItemsWithStreamingFromRawText(rawText)
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

  const timingSettings = {
    wordsPerMinute: store.wordsPerMinute,
    pauseAfterComma: store.pauseAfterComma,
    pauseAfterPeriod: store.pauseAfterPeriod,
    pauseAfterParagraph: store.pauseAfterParagraph,
    chunkSize: store.chunkSize
  }
  const wordItems = createChunks(wordsWithBoldInfo, timingSettings)

  const optimalFontSize = calculateOptimalFontSizeForText(wordItems)
  useReaderStore.setState({ wordItems, optimalFontSize })
}
