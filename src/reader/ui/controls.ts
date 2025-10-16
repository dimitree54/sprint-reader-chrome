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
}

function bindTimelineSeek(): void {
  const timeline = document.getElementById('readerTimeline') as HTMLElement | null
  if (!timeline) return

  const progressRect = () => timeline.getBoundingClientRect()

  const seekFromClientX = (clientX: number): void => {
    const state = useReaderStore.getState()
    if (state.isPreprocessing || state.wordItems.length === 0) return
    const rect = progressRect()
    if (rect.width <= 0) return
    const relativeX = Math.min(Math.max(clientX - rect.left, 0), rect.width)
    const ratio = relativeX / rect.width
    const available = state.wordItems.length
    const targetIndex = Math.min(available - 1, Math.max(0, Math.round(ratio * (available - 1))))
    if (state.index === targetIndex) return
    state.setPlaybackIndex(targetIndex)
  }

  let isDragging = false

  timeline.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 && event.pointerType !== 'touch' && event.pointerType !== 'pen') return
    const state = useReaderStore.getState()
    if (state.isPreprocessing || state.wordItems.length === 0) return
    isDragging = true
    timeline.setPointerCapture?.(event.pointerId)
    seekFromClientX(event.clientX)
  })

  timeline.addEventListener('pointermove', (event) => {
    if (!isDragging) return
    event.preventDefault()
    seekFromClientX(event.clientX)
  })

  const endInteraction = (event: PointerEvent): void => {
    if (!isDragging) return
    isDragging = false
    timeline.releasePointerCapture?.(event.pointerId)
    seekFromClientX(event.clientX)
  }

  timeline.addEventListener('pointerup', endInteraction)
  timeline.addEventListener('pointercancel', () => {
    isDragging = false
  })
  timeline.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse') {
      endInteraction(event)
    }
  })

  timeline.addEventListener('keydown', (event) => {
    const state = useReaderStore.getState()
    if (state.isPreprocessing || state.wordItems.length === 0) return
    const available = state.wordItems.length
    const step = Math.max(1, Math.floor(available * 0.01))
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      state.setPlaybackIndex(Math.max(0, state.index - step))
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      state.setPlaybackIndex(Math.min(available - 1, state.index + step))
    }
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
  bindTimelineSeek()
}
