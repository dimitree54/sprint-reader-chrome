import { wrapLettersInSpans, highlightOptimalLetter, setOptimalWordPositioning, applyFlickerEffect } from './visual-effects'
import { getVisualSettings, state, getTimingSettings } from './state'
import { updateControlsState } from './controls'
import { getTimeProgress, formatTimeRemaining, formatProgressPercent } from './time-calculator'

const PROGRESS_ZERO = '0%'
const ARIA_VALUE_ZERO = '0'
const EMPTY_STRING = ''
const ARIA_VALUE_NOW = 'aria-valuenow'

interface RenderElements {
  wordElement: HTMLElement
  statusElement: HTMLElement
  progressElement: HTMLElement
  progressBarElement: HTMLElement
  progressFillElement: HTMLElement
}

function getRequiredElements(): RenderElements | null {
  const wordElement = document.getElementById('word')
  const statusElement = document.getElementById('labelStatus')
  const progressElement = document.getElementById('labelProgress')
  const progressBarElement = document.querySelector('.reader__progress-bar') as HTMLElement
  const progressFillElement = document.getElementById('progressBarFill')

  if (!wordElement || !statusElement || !progressElement || !progressBarElement || !progressFillElement) {
    return null
  }

  return { wordElement, statusElement, progressElement, progressBarElement, progressFillElement }
}

function handlePreprocessingState(elements: RenderElements): boolean {
  if (!state.isPreprocessing) return false

  elements.wordElement.textContent = 'Processing text...'
  elements.statusElement.textContent = 'Preprocessing...'
  elements.progressElement.textContent = 'Please wait'
  elements.progressFillElement.style.width = PROGRESS_ZERO
  elements.progressBarElement.setAttribute(ARIA_VALUE_NOW, ARIA_VALUE_ZERO)
  updateControlsState()
  return true
}

function handleStreamingState(elements: RenderElements): boolean {
  if (!state.isStreaming) return false

  if (state.wordItems.length === 0) {
    elements.wordElement.textContent = 'Preparing content...'
    elements.statusElement.textContent = 'Loading...'
    elements.progressElement.textContent = 'Please wait'
    elements.progressFillElement.style.width = PROGRESS_ZERO
    elements.progressBarElement.setAttribute(ARIA_VALUE_NOW, ARIA_VALUE_ZERO)
    updateControlsState()
    return true
  }

  elements.statusElement.textContent = state.playing ? 'Playing (streaming)' : 'Loading...'
  return false
}

function renderWordContent(wordElement: HTMLElement): void {
  const currentWordItem = state.wordItems[state.index]

  if (currentWordItem) {
    wordElement.style.fontSize = state.optimalFontSize
    const wrappedText = wrapLettersInSpans(currentWordItem.text)
    wordElement.innerHTML = wrappedText

    const visualSettings = getVisualSettings()
    highlightOptimalLetter(wordElement, currentWordItem, visualSettings)
    setOptimalWordPositioning(wordElement, currentWordItem)

    if (state.playing) {
      applyFlickerEffect(wordElement, currentWordItem, visualSettings)
    }
  } else {
    wordElement.textContent = EMPTY_STRING
  }
}

function updateStreamingProgress(elements: RenderElements): void {
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

  elements.progressFillElement.style.width = `${progressPercent}%`
  elements.progressBarElement.setAttribute(ARIA_VALUE_NOW, String(Math.round(progressPercent)))

  const processedInfo = state.estimatedTotalChunks
    ? ` (${Math.round((available / state.estimatedTotalChunks) * 100)}% processed)`
    : ' (processing...)'
  elements.progressElement.textContent = `${shown} / ${available}${processedInfo}`
}

function updateRegularProgress(elements: RenderElements): void {
  const timingSettings = getTimingSettings()
  const timeProgress = getTimeProgress(state.wordItems, state.index, timingSettings)

  elements.progressFillElement.style.width = `${timeProgress.progressPercent}%`
  elements.progressBarElement.setAttribute(ARIA_VALUE_NOW, String(Math.round(timeProgress.progressPercent)))

  const percentDisplay = formatProgressPercent(timeProgress.progressPercent)
  const timeDisplay = formatTimeRemaining(timeProgress.remainingMs)
  elements.progressElement.textContent = `${percentDisplay} • ${timeDisplay}`
}

function updateProgress(elements: RenderElements): void {
  if (state.wordItems.length > 0) {
    if (state.isStreaming) {
      updateStreamingProgress(elements)
    } else {
      updateRegularProgress(elements)
    }
  } else {
    elements.progressFillElement.style.width = PROGRESS_ZERO
    elements.progressBarElement.setAttribute(ARIA_VALUE_NOW, ARIA_VALUE_ZERO)
    elements.progressElement.textContent = EMPTY_STRING
  }
}

export function renderCurrentWord (): void {
  const elements = getRequiredElements()
  if (!elements) return

  if (handlePreprocessingState(elements)) return
  if (handleStreamingState(elements)) return

  renderWordContent(elements.wordElement)

  if (!state.isStreaming) {
    elements.statusElement.textContent = state.playing ? 'Playing' : 'Paused'
  }

  updateProgress(elements)

  const playButton = document.getElementById('btnPlay')
  if (playButton) {
    playButton.textContent = state.playing ? 'Pause' : 'Play'
  }

  updateControlsState()
}
