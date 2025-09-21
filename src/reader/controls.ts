import { startPlayback, stopPlayback } from './playback'
import { persistPreferences, syncThemeToggle } from './preferences'
import { renderCurrentWord } from './render'
import { state } from './state'
import { rebuildWordItems, updateOptimalFontSize } from './text'
import { DEFAULTS } from '../config/defaults'

function updateWpmDisplay (value: number): void {
  const wpmValue = document.getElementById('wpmValue')
  if (wpmValue) {
    wpmValue.textContent = String(value)
  }
}

function togglePlayback (): void {
  if (state.playing) {
    stopPlayback()
  } else {
    startPlayback()
  }
  renderCurrentWord()
}

function attachPlaybackControls (): void {
  const playButton = document.getElementById('btnPlay')
  playButton?.addEventListener('click', () => {
    togglePlayback()
  })

  const restartButton = document.getElementById('btnRestart')
  restartButton?.addEventListener('click', () => {
    stopPlayback()
    state.index = 0
    renderCurrentWord()
  })
}

function attachKeyboardControls (): void {
  document.addEventListener('keydown', (event) => {
    const isSpaceKey = event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar'
    if (!isSpaceKey) {
      return
    }

    const target = event.target
    if (target instanceof Element &&
        target.closest('input, button, textarea, select, [contenteditable]')) {
      return
    }

    event.preventDefault()
    togglePlayback()
  })
}

function attachSpeedControl (): void {
  const slider = document.getElementById('sliderWpm') as HTMLInputElement | null
  slider?.addEventListener('input', () => {
    const value = Number.parseInt(slider.value, 10) || DEFAULTS.READER_PREFERENCES.wordsPerMinute
    state.wordsPerMinute = value
    updateWpmDisplay(value)

    rebuildWordItems()
    renderCurrentWord()
    persistPreferences()
  })
}

function attachThemeToggle (): void {
  const themeToggle = document.getElementById('toggleTheme') as HTMLInputElement | null
  themeToggle?.addEventListener('change', () => {
    syncThemeToggle(Boolean(themeToggle.checked))
    persistPreferences()
  })
}

function attachResizeHandler (): void {
  let resizeTimeout: ReturnType<typeof setTimeout> | undefined
  window.addEventListener('resize', () => {
    if (resizeTimeout) {
      clearTimeout(resizeTimeout)
    }
    resizeTimeout = setTimeout(() => {
      updateOptimalFontSize()
      renderCurrentWord()
    }, DEFAULTS.UI.resizeDebounceMs)
  })
}

export function registerControls (): void {
  attachPlaybackControls()
  attachSpeedControl()
  attachThemeToggle()
  attachResizeHandler()
  attachKeyboardControls()
}
