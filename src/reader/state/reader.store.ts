import { create } from 'zustand'
import type { ReaderTheme } from '../../common/storage'
import { DEFAULTS } from '../../config/defaults'
import type { WordItem } from '../timing-engine'
import type { ReaderToken } from '../text-types'

export type ReaderStatus = 'idle' | 'playing' | 'paused' | 'loading'

export type ReaderStoreState = {
  // Status / playback
  status: ReaderStatus
  index: number
  wordsPerMinute: number

  // Data
  tokens: ReaderToken[]
  wordItems: WordItem[]

  // Preferences
  theme: ReaderTheme
  highlightOptimalLetter: boolean
  highlightOptimalLetterColor: string
  wordFlicker: boolean
  wordFlickerPercent: number
  pauseAfterComma: boolean
  pauseAfterPeriod: boolean
  pauseAfterParagraph: boolean
  chunkSize: number
  optimalFontSize: string

  // Streaming / UI
  isPreprocessing: boolean
  isStreaming: boolean
  streamingComplete: boolean
  processedChunkCount: number
  estimatedTotalChunks?: number

  // Actions
  togglePlay: () => void
  setPlaybackIndex: (index: number) => void
  setWPM: (wpm: number) => void
  setTheme: (theme: ReaderTheme) => void
  setTokens: (tokens: ReaderToken[]) => void
  setWordItems: (items: WordItem[]) => void
  appendWordItems: (items: WordItem[]) => void
  setProgress: (processed: number, estimated?: number) => void
  setStatus: (status: ReaderStatus) => void
  setIsPreprocessing: (isPreprocessing: boolean) => void
  setStreamingState: (isStreaming: boolean, streamingComplete?: boolean) => void
  setOptimalFontSize: (fontSize: string) => void
  updatePreferences: (prefs: Partial<Pick<ReaderStoreState, 'highlightOptimalLetter' | 'highlightOptimalLetterColor' | 'wordFlicker' | 'wordFlickerPercent' | 'pauseAfterComma' | 'pauseAfterPeriod' | 'pauseAfterParagraph' | 'chunkSize'>>) => void
  reset: () => void
}

export const useReaderStore = create<ReaderStoreState>()((set) => ({
  status: 'idle',
  index: 0,
  wordsPerMinute: DEFAULTS.READER_PREFERENCES.wordsPerMinute,

  tokens: [],
  wordItems: [],

  theme: DEFAULTS.READER_PREFERENCES.theme,
  highlightOptimalLetter: true,
  highlightOptimalLetterColor: DEFAULTS.UI.highlightOptimalLetterColor,
  wordFlicker: DEFAULTS.READER_PREFERENCES.wordFlicker,
  wordFlickerPercent: DEFAULTS.READER_PREFERENCES.wordFlickerPercent,
  pauseAfterComma: DEFAULTS.READER_PREFERENCES.pauseAfterComma,
  pauseAfterPeriod: DEFAULTS.READER_PREFERENCES.pauseAfterPeriod,
  pauseAfterParagraph: DEFAULTS.READER_PREFERENCES.pauseAfterParagraph,
  chunkSize: DEFAULTS.READER_PREFERENCES.chunkSize,
  optimalFontSize: DEFAULTS.UI.optimalFontSize,

  isPreprocessing: false,
  isStreaming: false,
  streamingComplete: false,
  processedChunkCount: 0,
  estimatedTotalChunks: undefined,

  togglePlay: () => set((s) => (s.isPreprocessing ? {} : { status: s.status === 'playing' ? 'paused' : 'playing' })),
  setPlaybackIndex: (index) => set({ index }),
  setWPM: (wpm) => set((s) => {
    const n = Number(wpm)
    if (!Number.isFinite(n) || s.isPreprocessing) return {}
    return { wordsPerMinute: Math.max(1, Math.floor(n)) }
  }),
  setTheme: (theme) => set({ theme }),
  setTokens: (tokens) => set({ tokens }),
  setWordItems: (items) => set({ wordItems: items }),
  appendWordItems: (items) => set((s) => ({
    wordItems: s.wordItems.concat(items),
    processedChunkCount: s.processedChunkCount + items.length
  })),
  setProgress: (processed, estimated) => set({ processedChunkCount: processed, estimatedTotalChunks: estimated }),
  setStatus: (status) => set({ status }),
  setIsPreprocessing: (isPreprocessing) => set({ isPreprocessing }),
  setStreamingState: (isStreaming, streamingComplete) => set({
    isStreaming,
    streamingComplete: streamingComplete ?? false
  }),
  setOptimalFontSize: (fontSize) => set({ optimalFontSize: fontSize }),
  updatePreferences: (prefs) => set((s) => ({ ...s, ...prefs })),
  reset: () => set(() => ({
    status: 'idle',
    index: 0,
    wordsPerMinute: DEFAULTS.READER_PREFERENCES.wordsPerMinute,
    tokens: [],
    wordItems: [],
    theme: DEFAULTS.READER_PREFERENCES.theme,
    highlightOptimalLetter: true,
    highlightOptimalLetterColor: DEFAULTS.UI.highlightOptimalLetterColor,
    wordFlicker: DEFAULTS.READER_PREFERENCES.wordFlicker,
    wordFlickerPercent: DEFAULTS.READER_PREFERENCES.wordFlickerPercent,
    pauseAfterComma: DEFAULTS.READER_PREFERENCES.pauseAfterComma,
    pauseAfterPeriod: DEFAULTS.READER_PREFERENCES.pauseAfterPeriod,
    pauseAfterParagraph: DEFAULTS.READER_PREFERENCES.pauseAfterParagraph,
    chunkSize: DEFAULTS.READER_PREFERENCES.chunkSize,
    optimalFontSize: DEFAULTS.UI.optimalFontSize,
    isPreprocessing: false,
    isStreaming: false,
    streamingComplete: false,
    processedChunkCount: 0,
    estimatedTotalChunks: undefined
  }))
}))
