/**
 * Legacy state compatibility helpers
 * These functions provide the same interface as the old state.ts exports
 * but use the Zustand store internally
 */

import type { TimingSettings, WordItem } from '../timing-engine'
import type { VisualSettings } from '../visual-effects'
import { useReaderStore } from './reader.store'

// Timer management (no longer stored in store - managed externally)
let timerId: ReturnType<typeof setTimeout> | undefined

export function setTimer(timer: ReturnType<typeof setTimeout> | undefined): void {
  if (timerId) {
    clearTimeout(timerId)
  }
  timerId = timer
}

export function stopTimer(): void {
  if (timerId) {
    clearTimeout(timerId)
    timerId = undefined
  }
}

export function getTimingSettings(): TimingSettings {
  const state = useReaderStore.getState()
  return {
    wordsPerMinute: state.wordsPerMinute,
    pauseAfterComma: state.pauseAfterComma,
    pauseAfterPeriod: state.pauseAfterPeriod,
    pauseAfterParagraph: state.pauseAfterParagraph,
    chunkSize: state.chunkSize
  }
}

export function getVisualSettings(): VisualSettings {
  const state = useReaderStore.getState()
  return {
    highlightOptimalLetter: state.highlightOptimalLetter,
    highlightOptimalLetterColor: state.highlightOptimalLetterColor,
    wordFlicker: state.wordFlicker,
    wordFlickerPercent: state.wordFlickerPercent
  }
}

// Streaming state management functions
export function startStreaming(): void {
  useReaderStore.setState({
    isStreaming: true,
    streamingComplete: false,
    processedChunkCount: 0,
    estimatedTotalChunks: undefined
  })
}

export function completeStreaming(): void {
  useReaderStore.setState({
    isStreaming: false,
    streamingComplete: true
  })
}

export function appendWordItems(newWordItems: WordItem[]): void {
  useReaderStore.getState().appendWordItems(newWordItems)
}

export function updateStreamingProgress(processedChunks: number, estimatedTotal?: number): void {
  useReaderStore.setState({
    processedChunkCount: processedChunks,
    estimatedTotalChunks: estimatedTotal
  })
}

export function resetStreamingState(): void {
  useReaderStore.setState({
    isStreaming: false,
    streamingComplete: false,
    processedChunkCount: 0,
    estimatedTotalChunks: undefined
  })
}