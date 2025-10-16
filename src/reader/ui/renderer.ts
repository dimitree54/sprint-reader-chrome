import { useReaderStore } from '../state/reader.store'
import { wrapLettersInSpans, highlightOptimalLetter, setOptimalWordPositioning, applyFlickerEffect } from '../visual-effects'
import { computeProgress } from './renderer-helpers'

// Re-export helper functions for external use
export { computeProgress } from './renderer-helpers'

interface RenderElements {
  wordElement: HTMLElement
  timelineElement: HTMLElement
  timelineProgressElement: HTMLElement
  timelineHandleElement: HTMLElement
  etaElement: HTMLElement
  playButton: HTMLButtonElement | null
  errorBubbleElement: HTMLElement
}


function getRequiredElements(): RenderElements | null {
  const wordElement = document.getElementById('word')
  const timelineElement = document.getElementById('readerTimeline') as HTMLElement | null
  const timelineProgressElement = document.getElementById('readerTimelineProgress') as HTMLElement | null
  const timelineHandleElement = document.getElementById('readerTimelineHandle') as HTMLElement | null
  const etaElement = document.getElementById('labelProgress')
  const playButton = document.getElementById('btnPlay') as HTMLButtonElement | null
  const errorBubbleElement = document.getElementById('error-bubble')

  if (!wordElement || !timelineElement || !timelineProgressElement || !timelineHandleElement || !etaElement || !errorBubbleElement) {
    return null
  }

  return {
    wordElement,
    timelineElement,
    timelineProgressElement,
    timelineHandleElement,
    etaElement,
    playButton,
    errorBubbleElement
  }
}

function renderWordContent(wordElement: HTMLElement, state: ReturnType<typeof useReaderStore.getState>): void {
  if (state.isPreprocessing) {
    wordElement.textContent = 'Processing text...'
    return
  }

  if (state.isStreaming && state.wordItems.length === 0) {
    wordElement.textContent = 'Preparing content...'
    return
  }

  const currentWordItem = state.wordItems[state.index]
  if (currentWordItem) {
    wordElement.style.fontWeight = currentWordItem.isBold ? '800' : '600'
    wordElement.style.fontSize = state.optimalFontSize
    const wrappedText = wrapLettersInSpans(currentWordItem.text)
    wordElement.innerHTML = wrappedText

    const visualSettings = {
      highlightOptimalLetter: state.highlightOptimalLetter,
      highlightOptimalLetterColor: state.highlightOptimalLetterColor,
      wordFlicker: state.wordFlicker,
      wordFlickerPercent: state.wordFlickerPercent
    }
    highlightOptimalLetter(wordElement, currentWordItem, visualSettings)
    setOptimalWordPositioning(wordElement, currentWordItem)

    if (state.status === 'playing') {
      applyFlickerEffect(wordElement, currentWordItem, visualSettings)
    }
  } else {
    wordElement.textContent = ''
  }
}

let errorTimeout: number | undefined

function updateDOM(elements: RenderElements, state: ReturnType<typeof useReaderStore.getState>): void {
  // Update word content
  renderWordContent(elements.wordElement, state)

  // Update progress
  const progressData = computeProgress(state)
  const percentString = `${progressData.percent}%`
  elements.timelineProgressElement.style.width = percentString
  elements.timelineHandleElement.style.left = percentString
  elements.timelineElement.setAttribute('aria-valuenow', String(progressData.ariaNow))
  elements.timelineElement.setAttribute('aria-valuetext', progressData.eta)
  elements.etaElement.textContent = progressData.eta
  const disableTimeline = state.isPreprocessing || state.wordItems.length === 0
  elements.timelineElement.classList.toggle('reader__timeline--disabled', disableTimeline)
  elements.timelineElement.setAttribute('aria-disabled', disableTimeline ? 'true' : 'false')

  // Update play button
  if (elements.playButton) {
    elements.playButton.textContent = state.status === 'playing' ? 'Pause' : 'Play'
  }

  // Update error bubble
  if (state.preprocessingError) {
    elements.errorBubbleElement.textContent = state.preprocessingError
    elements.errorBubbleElement.hidden = false

    if (errorTimeout) {
      clearTimeout(errorTimeout)
    }

    errorTimeout = window.setTimeout(() => {
      elements.errorBubbleElement.hidden = true
    }, 5000)
  } else {
    elements.errorBubbleElement.hidden = true
    if (errorTimeout) {
      clearTimeout(errorTimeout)
    }
  }

  // Update control disabled states and WPM value display
  const isDisabled = state.isPreprocessing
  const wpmSlider = document.getElementById('sliderWpm') as HTMLInputElement | null
  const themeToggle = document.getElementById('toggleTheme') as HTMLInputElement | null
  const settingsButton = document.getElementById('openReaderSettings') as HTMLButtonElement | null
  if (elements.playButton) elements.playButton.disabled = isDisabled
  if (wpmSlider) wpmSlider.disabled = isDisabled
  if (themeToggle) themeToggle.disabled = isDisabled
  if (settingsButton) settingsButton.disabled = isDisabled

  const wpmValue = document.getElementById('wpmValue')
  if (wpmValue) wpmValue.textContent = String(state.wordsPerMinute)
}

export function initRenderer (): () => void {
  const elements = getRequiredElements()
  if (!elements) return () => {}

  // Initial render
  const initialState = useReaderStore.getState()
  updateDOM(elements, initialState)

  // Subscribe to changes and derive minimal diffs
  let last = {
    index: -1,
    count: -1,
    processedChunkCount: -1,
    estimatedTotalChunks: -1 as number | -1,
    isPreprocessing: false,
    isStreaming: false,
    status: '',
    optimalFontSize: '',
    wordsPerMinute: -1,
    pauseAfterComma: false,
    pauseAfterPeriod: false,
    pauseAfterParagraph: false,
    chunkSize: -1,
    highlightOptimalLetter: false,
    highlightOptimalLetterColor: '',
    wordFlicker: false,
    wordFlickerPercent: -1,
    preprocessingError: null as string | null
  }

  const unsubscribe = useReaderStore.subscribe((state) => {
    const next = {
      index: state.index,
      count: state.wordItems.length,
      processedChunkCount: state.processedChunkCount,
      estimatedTotalChunks: state.estimatedTotalChunks ?? -1,
      isPreprocessing: state.isPreprocessing,
      isStreaming: state.isStreaming,
      status: state.status,
      optimalFontSize: state.optimalFontSize,
      wordsPerMinute: state.wordsPerMinute,
      pauseAfterComma: state.pauseAfterComma,
      pauseAfterPeriod: state.pauseAfterPeriod,
      pauseAfterParagraph: state.pauseAfterParagraph,
      chunkSize: state.chunkSize,
      highlightOptimalLetter: state.highlightOptimalLetter,
      highlightOptimalLetterColor: state.highlightOptimalLetterColor,
      wordFlicker: state.wordFlicker,
      wordFlickerPercent: state.wordFlickerPercent,
      preprocessingError: state.preprocessingError
    }

    // Only update if relevant state has changed
    const hasRelevantChanges =
      next.index !== last.index ||
      next.count !== last.count ||
      next.processedChunkCount !== last.processedChunkCount ||
      next.estimatedTotalChunks !== last.estimatedTotalChunks ||
      next.isPreprocessing !== last.isPreprocessing ||
      next.isStreaming !== last.isStreaming ||
      next.status !== last.status ||
      next.optimalFontSize !== last.optimalFontSize ||
      next.wordsPerMinute !== last.wordsPerMinute ||
      next.pauseAfterComma !== last.pauseAfterComma ||
      next.pauseAfterPeriod !== last.pauseAfterPeriod ||
      next.pauseAfterParagraph !== last.pauseAfterParagraph ||
      next.chunkSize !== last.chunkSize ||
      next.highlightOptimalLetter !== last.highlightOptimalLetter ||
      next.highlightOptimalLetterColor !== last.highlightOptimalLetterColor ||
      next.wordFlicker !== last.wordFlicker ||
      next.wordFlickerPercent !== last.wordFlickerPercent ||
      next.preprocessingError !== last.preprocessingError

    if (hasRelevantChanges) {
      updateDOM(elements, state)
      last = next
    }
  })

  return unsubscribe
}
