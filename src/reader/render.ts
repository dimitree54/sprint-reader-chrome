import { wrapLettersInSpans, highlightOptimalLetter, setOptimalWordPositioning, applyFlickerEffect } from './visual-effects'
import { getVisualSettings, state } from './state'

export function renderCurrentWord (): void {
  const wordElement = document.getElementById('word')
  const statusElement = document.getElementById('labelStatus')
  const progressElement = document.getElementById('labelProgress')
  if (!wordElement || !statusElement || !progressElement) {
    return
  }

  const currentWordItem = state.wordItems[state.index]
  console.log('🔍 DEBUG: currentWordItem being rendered:', currentWordItem)
  console.log('🔍 DEBUG: state.index:', state.index)
  console.log('🔍 DEBUG: state.wordItems length:', state.wordItems.length)

  if (currentWordItem) {
    wordElement.style.fontSize = state.optimalFontSize

    const wrappedText = wrapLettersInSpans(currentWordItem.text)
    console.log('🔍 DEBUG: wrappedText:', wrappedText)
    wordElement.innerHTML = wrappedText

    const visualSettings = getVisualSettings()
    highlightOptimalLetter(wordElement, currentWordItem, visualSettings)
    setOptimalWordPositioning(wordElement, currentWordItem)

    if (state.playing) {
      applyFlickerEffect(wordElement, currentWordItem, visualSettings)
    }
  } else {
    wordElement.textContent = ''
  }

  statusElement.textContent = state.playing ? 'Playing' : 'Paused'
  if (state.wordItems.length > 0) {
    const shown = Math.min(state.index + 1, state.wordItems.length)
    const total = state.wordItems.length
    const percent = Math.min(100, Math.round((shown / total) * 100))
    progressElement.textContent = `${percent}% • ${shown} / ${total}`
  } else {
    progressElement.textContent = ''
  }

  const playButton = document.getElementById('btnPlay')
  if (playButton) {
    playButton.textContent = state.playing ? 'Pause' : 'Play'
  }
}
