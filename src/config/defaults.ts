import type { ReaderPreferences, ReaderTheme } from '../common/storage'

/**
 * Centralized configuration for all default values used throughout the extension
 */
export const DEFAULTS = {
  // Reader preferences defaults
  READER_PREFERENCES: {
    wordsPerMinute: 350,
    pauseAfterComma: true,
    pauseAfterPeriod: true,
    pauseAfterParagraph: true,
    chunkSize: 3,
    wordFlicker: false,
    wordFlickerPercent: 10,
    theme: 'dark' as ReaderTheme
  } satisfies ReaderPreferences,

  // Word processing defaults
  WORD_PROCESSING: {
    maxWordLengthForGrouping: 3
  },

  // Selection state defaults
  SELECTION_STATE: {
    text: '',
    hasSelection: false,
    isRTL: false,
    timestamp: () => Date.now()
  },

  // Timing and playback defaults
  TIMING: {
    minimumDelayMs: 20,
    minimumWpmForCalculation: 100,
    selectionCaptureDelayMs: 120
  },

  // UI and positioning defaults
  UI: {
    resizeDebounceMs: 150,
    windowDimensions: {
      width: 960,
      height: 640
    },
    highlightOptimalLetterColor: '#FF8C00',
    optimalFontSize: '128px'
  },

  // Visual effects defaults
  VISUAL: {
    flickerOpacity: 0.3,
    flickerDurationMultiplier: 0.3,
    maxTheoreticalLength: 16,
    maxFontSize: 128,
    minFontSize: 48
  },

  // Theme constants
  THEMES: {
    light: 'light' as ReaderTheme,
    dark: 'dark' as ReaderTheme
  },

  // Error handling defaults
  ERROR_HANDLING: {
    consoleErrorHandler: console.error,
    consoleWarnHandler: console.warn
  },

  // OpenAI API defaults
  OPENAI: {
    model: 'gpt-5-mini',
    service_tier: 'priority',
    reasoning: {
      effort: 'minimal'
    }
  },

  // Preprocessing defaults
  PREPROCESSING: {
    enabled: false
  },

  // Translation and summarization defaults
  TRANSLATION: {
    defaultLanguage: 'en'
  },

  SUMMARIZATION: {
    defaultLevel: 'none'
  }
} as const

/**
 * Helper function to get a deep copy of reader preferences defaults
 */
export function getDefaultReaderPreferences(): ReaderPreferences {
  return { ...DEFAULTS.READER_PREFERENCES }
}

/**
 * Helper function to get default selection state
 */
export function getDefaultSelectionState() {
  return {
    ...DEFAULTS.SELECTION_STATE,
    timestamp: DEFAULTS.SELECTION_STATE.timestamp()
  }
}
