import { useReaderStore } from '../state/reader.store'
import { wrapLettersInSpans, highlightOptimalLetter, setOptimalWordPositioning, applyFlickerEffect } from '../visual-effects'
import { getVisualSettings, getTimingSettings } from '../state/legacy-state-helpers'
import { updateControlsState } from '../controls'
import { getTimeProgress, formatTimeRemaining, formatProgressPercent } from '../time-calculator'

interface RenderElements {
  wordElement: HTMLElement
  statusElement: HTMLElement
  progressElement: HTMLElement
  progressBarElement: HTMLElement
  progressFillElement: HTMLElement
  playButton?: HTMLElement
}

interface ProgressData {
  percent: number
  text: string
  ariaNow: number
}

interface StatusData {
  text: string
}

// Pure helper functions
export function computeProgress(state: ReturnType<typeof useReaderStore.getState>): ProgressData {
  if (state.wordItems.length === 0) {
    return { percent: 0, text: '', ariaNow: 0 }
  }

  if (state.isStreaming) {
    const shown = Math.min(state.index + 1, state.wordItems.length)
    const available = state.wordItems.length

    let progressPercent = 0
    if (state.estimatedTotalChunks && state.estimatedTotalChunks > 0) {
      const processingProgress = (available / state.estimatedTotalChunks) * 100
      const readingProgress = (shown / available) * processingProgress
      progressPercent = Math.min(readingProgress, 100)
    } else {
      progressPercent = (shown / available) * 100
    }

    const processedInfo = state.estimatedTotalChunks
      ? ` (${Math.round((available / state.estimatedTotalChunks) * 100)}% processed)`
      : ' (processing...)'

    return {
      percent: progressPercent,
      text: `${shown} / ${available}${processedInfo}`,
      ariaNow: Math.round(progressPercent)
    }
  } else {
    const timingSettings = getTimingSettings()
    const timeProgress = getTimeProgress(state.wordItems, state.index, timingSettings)
    const percentDisplay = formatProgressPercent(timeProgress.progressPercent)
    const timeDisplay = formatTimeRemaining(timeProgress.remainingMs)

    return {
      percent: timeProgress.progressPercent,
      text: `${percentDisplay} • ${timeDisplay}`,
      ariaNow: Math.round(timeProgress.progressPercent)
    }
  }
}

export function computeStatus(state: ReturnType<typeof useReaderStore.getState>): StatusData {
  if (state.isPreprocessing) {
    return { text: 'Preprocessing...' }
  }

  if (state.isStreaming && state.wordItems.length === 0) {
    return { text: 'Loading...' }
  }

  if (state.isStreaming && state.status === 'playing') {
    return { text: 'Playing (streaming)' }
  }

  if (state.isStreaming) {
    return { text: 'Loading...' }
  }

  return { text: state.status === 'playing' ? 'Playing' : 'Paused' }
}

function getRequiredElements(): RenderElements | null {
  const wordElement = document.getElementById('word')
  const statusElement = document.getElementById('labelStatus')
  const progressElement = document.getElementById('labelProgress')
  const progressBarElement = document.querySelector('.reader__progress-bar') as HTMLElement
  const progressFillElement = document.getElementById('progressBarFill')
  const playButton = document.getElementById('btnPlay')

  if (!wordElement || !statusElement || !progressElement || !progressBarElement || !progressFillElement) {
    return null
  }

  return {
    wordElement,
    statusElement,
    progressElement,
    progressBarElement,
    progressFillElement,
    playButton: playButton || undefined
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
    wordElement.style.fontSize = state.optimalFontSize
    const wrappedText = wrapLettersInSpans(currentWordItem.text)
    wordElement.innerHTML = wrappedText

    const visualSettings = getVisualSettings()
    highlightOptimalLetter(wordElement, currentWordItem, visualSettings)
    setOptimalWordPositioning(wordElement, currentWordItem)

    if (state.status === 'playing') {
      applyFlickerEffect(wordElement, currentWordItem, visualSettings)
    }
  } else {
    wordElement.textContent = ''
  }
}

function updateDOM(elements: RenderElements, state: ReturnType<typeof useReaderStore.getState>): void {
  // Update word content
  renderWordContent(elements.wordElement, state)

  // Update status
  const statusData = computeStatus(state)
  elements.statusElement.textContent = statusData.text

  // Update progress
  if (state.isPreprocessing) {
    elements.progressElement.textContent = 'Please wait'
    elements.progressFillElement.style.width = '0%'
    elements.progressBarElement.setAttribute('aria-valuenow', '0')
  } else {
    const progressData = computeProgress(state)
    elements.progressElement.textContent = progressData.text
    elements.progressFillElement.style.width = `${progressData.percent}%`
    elements.progressBarElement.setAttribute('aria-valuenow', String(progressData.ariaNow))
  }

  // Update play button
  if (elements.playButton) {
    elements.playButton.textContent = state.status === 'playing' ? 'Pause' : 'Play'
  }

  // Update controls state
  updateControlsState()
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
    optimalFontSize: ''
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
      optimalFontSize: state.optimalFontSize
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
      next.optimalFontSize !== last.optimalFontSize

    if (hasRelevantChanges) {
      updateDOM(elements, state)
      last = next
    }
  })

  return unsubscribe
}
