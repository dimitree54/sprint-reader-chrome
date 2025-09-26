// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { bindControls } from './controls'
import { playbackService } from '../playback/playback.service'
import { useReaderStore } from '../state/reader.store'

describe('UI Controls bindings', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="btnPlay"></button>
      <button id="btnRestart"></button>
      <input id="sliderWpm" type="range" />
      <input id="toggleTheme" type="checkbox" />
      <button id="openReaderSettings"></button>
    `
    useReaderStore.setState({ status: 'paused', isPreprocessing: false, wordsPerMinute: 300 })
    vi.resetAllMocks()
  })

  it('binds play/pause to PlaybackService', () => {
    const playSpy = vi.spyOn(playbackService, 'play')
    const pauseSpy = vi.spyOn(playbackService, 'pause')

    bindControls()

    const btn = document.getElementById('btnPlay') as HTMLButtonElement

    // Initially paused → click should play
    btn.click()
    expect(playSpy).toHaveBeenCalled()

    // Simulate playing state → click should pause
    useReaderStore.setState({ status: 'playing' })
    btn.click()
    expect(pauseSpy).toHaveBeenCalled()
  })
})

