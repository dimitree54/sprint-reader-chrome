// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { bindControls } from './controls'
import { playbackService } from '../playback/playback.service'
import { useReaderStore } from '../state/reader.store'

// Polyfill PointerEvent for jsdom environments that lack it
if (typeof PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number
    pointerType: string

    constructor (type: string, init?: MouseEventInit & { pointerId?: number; pointerType?: string }) {
      super(type, init)
      this.pointerId = init?.pointerId ?? 0
      this.pointerType = init?.pointerType ?? 'mouse'
    }
  }

  // @ts-expect-error assigning to global for test environment
  global.PointerEvent = PointerEventPolyfill as typeof PointerEvent
}

describe('UI Controls bindings', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="btnPlay"></button>
      <input id="sliderWpm" type="range" />
      <input id="toggleTheme" type="checkbox" />
      <button id="openReaderSettings"></button>
      <div id="readerTimeline" tabindex="0">
        <div id="readerTimelineProgress"></div>
        <div id="readerTimelineHandle"></div>
        <span id="labelProgress"></span>
      </div>
    `
    useReaderStore.setState({
      status: 'paused',
      isPreprocessing: false,
      wordsPerMinute: 300,
      wordItems: []
    })
    vi.resetAllMocks()
  })

  it('binds play/pause to PlaybackService', () => {
    const playSpy = vi.spyOn(playbackService, 'play')
    const pauseSpy = vi.spyOn(playbackService, 'pause')
    useReaderStore.setState({ wordItems: [{ text: 'word1' }], index: 0 })

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

  it('allows seeking with timeline keyboard controls', () => {
    const timeline = document.getElementById('readerTimeline') as HTMLElement
    const items = Array.from({ length: 20 }, (_, i) => ({ text: `word${i}` }))
    useReaderStore.setState({ wordItems: items, index: 0 })

    bindControls()

    timeline.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(useReaderStore.getState().index).toBeGreaterThan(0)

    timeline.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    expect(useReaderStore.getState().index).toBeGreaterThanOrEqual(0)
  })

  it('seeks when timeline is clicked', () => {
    const timeline = document.getElementById('readerTimeline') as HTMLElement
    Object.defineProperty(timeline, 'getBoundingClientRect', {
      value: () => ({ left: 0, width: 200 }),
      configurable: true
    })

    const items = Array.from({ length: 10 }, (_, i) => ({ text: `word${i}` }))
    useReaderStore.setState({ wordItems: items, index: 0 })

    bindControls()

    timeline.dispatchEvent(new PointerEvent('pointerdown', { clientX: 150, pointerId: 1, button: 0 }))
    timeline.dispatchEvent(new PointerEvent('pointerup', { clientX: 150, pointerId: 1, button: 0 }))

    expect(useReaderStore.getState().index).toBeGreaterThan(0)
  })
})

