import { wrapLettersInSpans, highlightOptimalLetter, setOptimalWordPositioning, applyFlickerEffect } from './visual-effects'
import { getVisualSettings, state, getTimingSettings } from './state'
import { updateControlsState } from './controls'
import { getTimeProgress, formatTimeRemaining, formatProgressPercent } from './time-calculator'

const PROGRESS_ZERO = '0%'
const ARIA_VALUE_ZERO = '0'
const EMPTY_STRING = ''
const ARIA_VALUE_NOW = 'aria-valuenow'

export function renderCurrentWord (): void {
  const wordElement = document.getElementById('word')
  const statusElement = document.getElementById('labelStatus')
  const progressElement = document.getElementById('labelProgress')
  const progressBarElement = document.querySelector('.reader__progress-bar') as HTMLElement
  const progressFillElement = document.getElementById('progressBarFill')

  if (!wordElement || !statusElement || !progressElement || !progressBarElement || !progressFillElement) {
    return
  }

  // Handle preprocessing state
  if (state.isPreprocessing) {
    wordElement.innerHTML = '<span style="opacity: 0.6;">Processing text...</span>'
    statusElement.textContent = 'Preprocessing...'
    progressElement.textContent = 'Please wait'
    progressFillElement.style.width = PROGRESS_ZERO
    progressBarElement.setAttribute(ARIA_VALUE_NOW, ARIA_VALUE_ZERO)
    updateControlsState()
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

    if (state.playing) {
      applyFlickerEffect(wordElement, currentWordItem, visualSettings)
    }
  } else {
    wordElement.textContent = EMPTY_STRING
  }

  statusElement.textContent = state.playing ? 'Playing' : 'Paused'

  // Update progress bar and time display
  if (state.wordItems.length > 0) {
    const timingSettings = getTimingSettings()
    const timeProgress = getTimeProgress(state.wordItems, state.index, timingSettings)

    // Update progress bar
    progressFillElement.style.width = `${timeProgress.progressPercent}%`
    progressBarElement.setAttribute(ARIA_VALUE_NOW, String(Math.round(timeProgress.progressPercent)))

    // Update time display
    const percentDisplay = formatProgressPercent(timeProgress.progressPercent)
    const timeDisplay = formatTimeRemaining(timeProgress.remainingMs)
    progressElement.textContent = `${percentDisplay} • ${timeDisplay}`
  } else {
    progressFillElement.style.width = PROGRESS_ZERO
    progressBarElement.setAttribute(ARIA_VALUE_NOW, ARIA_VALUE_ZERO)
    progressElement.textContent = EMPTY_STRING
  }

  const playButton = document.getElementById('btnPlay')
  if (playButton) {
    playButton.textContent = state.playing ? 'Pause' : 'Play'
  }

  // Update controls state
  updateControlsState()
}
