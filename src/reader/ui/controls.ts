import { playbackService } from '../playback/playback.service'
import { persistPreferences, syncThemeToggle } from '../preferences'
import { useReaderStore } from '../state/reader.store'
import { updateOptimalFontSize, recalculateTimingOnly } from '../text'
import { DEFAULTS } from '../../config/defaults'
import { browserApi } from '../../core/browser-api.service'

function bindPlaybackButtons(): void {
  const playButton = document.getElementById('btnPlay')
  playButton?.addEventListener('click', () => {
    const state = useReaderStore.getState()
    // Allow play/pause during streaming as soon as initial tokens are available
    if (state.wordItems.length === 0) return
    if (state.status === 'playing') playbackService.pause()
    else playbackService.play()
  })

  const restartButton = document.getElementById('btnRestart')
  restartButton?.addEventListener('click', () => {
    const state = useReaderStore.getState()
    if (state.isPreprocessing) return
    playbackService.restart()
  })
}

function bindKeyboardShortcuts(): void {
  document.addEventListener('keydown', (event) => {
    const isSpaceKey = event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar'
    if (!isSpaceKey) return
    const target = event.target
    if (target instanceof Element && target.closest('input, button, textarea, select, [contenteditable]')) return
    const state = useReaderStore.getState()
    event.preventDefault()
    // Allow toggling during streaming if at least one item is available
    if (state.wordItems.length === 0) return
    if (state.status === 'playing') playbackService.pause()
    else playbackService.play()
  })
}

function bindSpeedSlider(): void {
  const slider = document.getElementById('sliderWpm') as HTMLInputElement | null
  slider?.addEventListener('input', (event) => {
    const state = useReaderStore.getState()
    if (state.isPreprocessing) return
    const target = event.currentTarget as HTMLInputElement
    const value = Number.parseInt(target.value, 10) || DEFAULTS.READER_PREFERENCES.wordsPerMinute
    state.setWPM(value)
    recalculateTimingOnly()
    persistPreferences()
  })
}

function bindThemeToggle(): void {
  const themeToggle = document.getElementById('toggleTheme') as HTMLInputElement | null
  themeToggle?.addEventListener('change', (event) => {
    const target = event.currentTarget as HTMLInputElement
    syncThemeToggle(Boolean(target.checked))
    persistPreferences()
  })
}

function bindResize(): void {
  let resizeTimeout: ReturnType<typeof setTimeout> | undefined
  window.addEventListener('resize', () => {
    if (resizeTimeout) clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(() => {
      updateOptimalFontSize()
    }, DEFAULTS.UI.resizeDebounceMs)
  })
}

function bindSettingsButton(): void {
  const button = document.getElementById('openReaderSettings') as HTMLButtonElement | null
  button?.addEventListener('click', async () => {
    const url = browserApi.runtime.getURL('pages/settings.html')
    await browserApi.createTab({ url })
    window.close()
  })
}

export function bindControls(): void {
  bindPlaybackButtons()
  bindSpeedSlider()
  bindThemeToggle()
  bindResize()
  bindKeyboardShortcuts()
  bindSettingsButton()
}
