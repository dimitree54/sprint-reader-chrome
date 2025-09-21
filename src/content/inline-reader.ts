import type { ReaderPreferences } from '../common/storage'
import { DEFAULTS } from '../config/defaults'
import { preprocessText } from '../reader/text-processor'
import { createChunks, type WordItem, type TimingSettings } from '../reader/timing-engine'
import { createInlineDom, ACTIVE_CLASS, INACTIVE_CLASS } from './inline-reader-dom'

const MINIMUM_DELAY_MS = DEFAULTS.TIMING.minimumDelayMs
const HIGHLIGHT_COLOR = DEFAULTS.UI.highlightOptimalLetterColor

function preferencesToTimingSettings (preferences: ReaderPreferences): TimingSettings {
  return {
    wordsPerMinute: preferences.wordsPerMinute,
    pauseAfterComma: preferences.pauseAfterComma,
    pauseAfterPeriod: preferences.pauseAfterPeriod,
    pauseAfterParagraph: preferences.pauseAfterParagraph,
    chunkSize: preferences.chunkSize
  }
}

type InlineReaderState = {
  active: boolean
  container: HTMLElement | null
  originalFragment: DocumentFragment | null
  wordItems: WordItem[]
  chunkElements: HTMLElement[]
  currentIndex: number
  timerId: ReturnType<typeof setTimeout> | null
  keydownHandler: ((event: KeyboardEvent) => void) | null
}

const inlineState: InlineReaderState = {
  active: false,
  container: null,
  originalFragment: null,
  wordItems: [],
  chunkElements: [],
  currentIndex: -1,
  timerId: null,
  keydownHandler: null
}

function clearTimer (): void {
  if (inlineState.timerId) {
    clearTimeout(inlineState.timerId)
    inlineState.timerId = null
  }
}

function resetState (): void {
  clearTimer()
  if (inlineState.keydownHandler) {
    document.removeEventListener('keydown', inlineState.keydownHandler, true)
    inlineState.keydownHandler = null
  }
  inlineState.active = false
  inlineState.container = null
  inlineState.originalFragment = null
  inlineState.wordItems = []
  inlineState.chunkElements = []
  inlineState.currentIndex = -1
}

function calculateDelay (wordItem: WordItem): number {
  return Math.max((wordItem.duration ?? 0) + (wordItem.postdelay ?? 0), MINIMUM_DELAY_MS)
}

function applyActiveChunk (nextIndex: number): void {
  if (inlineState.currentIndex >= 0) {
    const previousChunk = inlineState.chunkElements[inlineState.currentIndex]
    if (previousChunk) {
      previousChunk.classList.remove(ACTIVE_CLASS)
      previousChunk.classList.add(INACTIVE_CLASS)
    }
  }

  const nextChunk = inlineState.chunkElements[nextIndex]
  if (nextChunk) {
    nextChunk.classList.remove(INACTIVE_CLASS)
    nextChunk.classList.add(ACTIVE_CLASS)
  }

  inlineState.currentIndex = nextIndex
}

function handleAdvance (): void {
  if (!inlineState.active) {
    return
  }

  if (inlineState.currentIndex >= inlineState.wordItems.length - 1) {
    stopInlineReader()
    return
  }

  const nextIndex = inlineState.currentIndex + 1
  applyActiveChunk(nextIndex)

  const nextItem = inlineState.wordItems[nextIndex]
  inlineState.timerId = setTimeout(handleAdvance, calculateDelay(nextItem))
}

export function stopInlineReader (): void {
  if (!inlineState.active) {
    return
  }

  clearTimer()

  if (inlineState.keydownHandler) {
    document.removeEventListener('keydown', inlineState.keydownHandler, true)
    inlineState.keydownHandler = null
  }

  const { container, originalFragment } = inlineState
  if (container) {
    if (originalFragment) {
      container.replaceWith(originalFragment)
    } else {
      container.remove()
    }
  }

  resetState()
}

export function startInlineReader (text: string, preferences: ReaderPreferences, isRTL: boolean): void {
  if (!text || text.trim().length === 0) {
    return
  }

  if (inlineState.active) {
    stopInlineReader()
  }

  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) {
    return
  }

  const range = selection.getRangeAt(0)
  if (range.collapsed) {
    return
  }

  const words = preprocessText(text)
  if (words.length === 0) {
    return
  }

  const timingSettings = preferencesToTimingSettings(preferences)
  const wordItems = createChunks(words, timingSettings)
  if (wordItems.length === 0) {
    return
  }

  const containerInfo = createInlineDom(wordItems, isRTL, HIGHLIGHT_COLOR)
  if (!containerInfo) {
    return
  }

  const { container, chunkElements } = containerInfo

  let originalFragment: DocumentFragment | null = null
  try {
    originalFragment = range.extractContents()
  } catch (error) {
    console.error('[Speed Reader] Failed to extract selection for inline reader', error)
    return
  }

  if (!originalFragment) {
    return
  }

  range.insertNode(container)
  selection.removeAllRanges()

  inlineState.active = true
  inlineState.container = container
  inlineState.originalFragment = originalFragment
  inlineState.wordItems = wordItems
  inlineState.chunkElements = chunkElements
  inlineState.currentIndex = -1

  applyActiveChunk(0)

  const firstItem = wordItems[0]
  inlineState.timerId = setTimeout(handleAdvance, calculateDelay(firstItem))

  inlineState.keydownHandler = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      stopInlineReader()
    }
  }
  document.addEventListener('keydown', inlineState.keydownHandler, true)
}
