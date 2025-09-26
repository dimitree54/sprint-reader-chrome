import { startPlayback, stopPlayback } from './playback'
import { persistPreferences, syncThemeToggle } from './preferences'
import { useReaderStore } from './state/reader.store'
import { updateOptimalFontSize, recalculateTimingOnly } from './text'
import { DEFAULTS } from '../config/defaults'
import { browserApi } from '../core/browser-api.service'

function updateWpmDisplay (value: number): void {
  const wpmValue = document.getElementById('wpmValue')
  if (wpmValue) {
    wpmValue.textContent = String(value)
  }
}

function togglePlayback (): void {
  const store = useReaderStore.getState()
  if (store.isPreprocessing) {
    return // Block playback during preprocessing
  }

  if (store.status === 'playing') {
    stopPlayback()
  } else {
    startPlayback()
  }
}

function attachPlaybackControls (): void {
  const playButton = document.getElementById('btnPlay')
  playButton?.addEventListener('click', () => {
    togglePlayback()
  })

  const restartButton = document.getElementById('btnRestart')
  restartButton?.addEventListener('click', () => {
    const store = useReaderStore.getState()
    if (store.isPreprocessing) {
      return // Block restart during preprocessing
    }
    stopPlayback()
    store.setPlaybackIndex(0)
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

    if (useReaderStore.getState().isPreprocessing) {
      event.preventDefault()
      return // Block keyboard controls during preprocessing
    }

    event.preventDefault()
    togglePlayback()
  })
}

function attachSpeedControl (): void {
  const slider = document.getElementById('sliderWpm') as HTMLInputElement | null
  slider?.addEventListener('input', () => {
    const store = useReaderStore.getState()
    if (store.isPreprocessing) {
      return // Block speed control during preprocessing
    }

    const value = Number.parseInt(slider.value, 10) || DEFAULTS.READER_PREFERENCES.wordsPerMinute
    store.setWPM(value)
    updateWpmDisplay(value)

    recalculateTimingOnly()
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
    }, DEFAULTS.UI.resizeDebounceMs)
  })
}

function attachSettingsButton (): void {
  const button = document.getElementById('openReaderSettings') as HTMLButtonElement | null
  button?.addEventListener('click', () => {
    openSettingsPage().catch(console.error)
  })
}

async function openSettingsPage (): Promise<void> {
  const url = browserApi.runtime.getURL('pages/settings.html')
  await browserApi.createTab({ url })
}

export function updateControlsState (): void {
  const playButton = document.getElementById('btnPlay') as HTMLButtonElement | null
  const restartButton = document.getElementById('btnRestart') as HTMLButtonElement | null
  const wpmSlider = document.getElementById('sliderWpm') as HTMLInputElement | null
  const themeToggle = document.getElementById('toggleTheme') as HTMLInputElement | null
  const settingsButton = document.getElementById('openReaderSettings') as HTMLButtonElement | null

  const isDisabled = useReaderStore.getState().isPreprocessing

  if (playButton) playButton.disabled = isDisabled
  if (restartButton) restartButton.disabled = isDisabled
  if (wpmSlider) wpmSlider.disabled = isDisabled
  if (themeToggle) themeToggle.disabled = isDisabled
  if (settingsButton) settingsButton.disabled = isDisabled
}

export function registerControls (): void {
  attachPlaybackControls()
  attachSpeedControl()
  attachThemeToggle()
  attachResizeHandler()
  attachKeyboardControls()
  attachSettingsButton()
}
