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
  appendWordItems: (items: WordItem[]) => void
  setProgress: (processed: number, estimated?: number) => void
  setStatus: (status: ReaderStatus) => void
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

  isPreprocessing: false,
  isStreaming: false,
  streamingComplete: false,
  processedChunkCount: 0,
  estimatedTotalChunks: undefined,

  togglePlay: () => set((s) => ({ status: s.status === 'playing' ? 'paused' : 'playing' })),
  setPlaybackIndex: (index) => set({ index }),
  setWPM: (wpm) => set({ wordsPerMinute: Math.max(1, Math.floor(wpm)) }),
  setTheme: (theme) => set({ theme }),
  setTokens: (tokens) => set({ tokens }),
  appendWordItems: (items) => set((s) => ({
    wordItems: s.wordItems.concat(items),
    processedChunkCount: s.processedChunkCount + items.length
  })),
  setProgress: (processed, estimated) => set({ processedChunkCount: processed, estimatedTotalChunks: estimated }),
  setStatus: (status) => set({ status }),
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
    isPreprocessing: false,
    isStreaming: false,
    streamingComplete: false,
    processedChunkCount: 0,
    estimatedTotalChunks: undefined
  }))
}))

