import type { ReaderPreferences, ReaderTheme, UsageStats } from '../common/storage'

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
    chunkSize: 2,
    wordFlicker: false,
    wordFlickerPercent: 10,
    theme: 'dark' as ReaderTheme
  } satisfies ReaderPreferences,

  // Word processing defaults
  WORD_PROCESSING: {
    maxWordLengthForGrouping: 4
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
    wpmModifier: 200 / 147,
    selectionCaptureDelayMs: 120,
    MULTIPLIERS: {
      bold: 1.4,
      commaPause: 0.5,
      periodPause: 1.0,
      paragraphPause: 1.0,
      groupedChunk: 1.2,
      nonLetterChunk: 1.4
    }
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
    model: 'gpt-4.1-mini',
    service_tier: 'priority', // from 'flex', 'auto', 'priority'
    // reasoning_effort: 'minimal' // from 'minimal', 'low', 'medium', 'high'
  },

  // Preprocessing defaults
  PREPROCESSING: {
    enabled: false
  },

  // Usage analytics defaults
  USAGE_STATS: {
    firstUsedAt: (): number => Date.now(),
    totalWordsRead: 0,
    totalOriginalReadingTimeMs: 0,
    totalExtensionReadingTimeMs: 0
  },

  // Baseline reading speeds (words per minute)
  READING_SPEED: {
    standardWordsPerMinute: 240,
    translationWordsPerMinute: 200
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

export function getDefaultUsageStats(): UsageStats {
  return {
    firstUsedAt: DEFAULTS.USAGE_STATS.firstUsedAt(),
    totalWordsRead: DEFAULTS.USAGE_STATS.totalWordsRead,
    totalOriginalReadingTimeMs: DEFAULTS.USAGE_STATS.totalOriginalReadingTimeMs,
    totalExtensionReadingTimeMs: DEFAULTS.USAGE_STATS.totalExtensionReadingTimeMs
  }
}
