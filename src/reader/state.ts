import type { ReaderTheme } from '../common/storage'
import { DEFAULTS } from '../config/defaults'
import type { TimingSettings, WordItem } from './timing-engine'
import type { ReaderToken } from './text-types'
import type { VisualSettings } from './visual-effects'

type PlaybackTimer = ReturnType<typeof setTimeout> | undefined

export type ReaderState = {
  words: ReaderToken[];
  wordItems: WordItem[];
  index: number;
  playing: boolean;
  timerId: PlaybackTimer;
  wordsPerMinute: number;
  highlightOptimalLetter: boolean;
  highlightOptimalLetterColor: string;
  pauseAfterComma: boolean;
  pauseAfterPeriod: boolean;
  pauseAfterParagraph: boolean;
  chunkSize: number;
  wordFlicker: boolean;
  wordFlickerPercent: number;
  optimalFontSize: string;
  theme: ReaderTheme;
}

export const state: ReaderState = {
  words: [],
  wordItems: [],
  index: 0,
  playing: false,
  timerId: undefined,
  wordsPerMinute: DEFAULTS.READER_PREFERENCES.wordsPerMinute,
  highlightOptimalLetter: true,
  highlightOptimalLetterColor: DEFAULTS.UI.highlightOptimalLetterColor,
  pauseAfterComma: DEFAULTS.READER_PREFERENCES.pauseAfterComma,
  pauseAfterPeriod: DEFAULTS.READER_PREFERENCES.pauseAfterPeriod,
  pauseAfterParagraph: DEFAULTS.READER_PREFERENCES.pauseAfterParagraph,
  chunkSize: DEFAULTS.READER_PREFERENCES.chunkSize,
  wordFlicker: DEFAULTS.READER_PREFERENCES.wordFlicker,
  wordFlickerPercent: DEFAULTS.READER_PREFERENCES.wordFlickerPercent,
  optimalFontSize: DEFAULTS.UI.optimalFontSize,
  theme: DEFAULTS.READER_PREFERENCES.theme
}

export function setTimer (timer: PlaybackTimer): void {
  if (state.timerId) {
    clearTimeout(state.timerId)
  }
  state.timerId = timer
}

export function stopTimer (): void {
  if (state.timerId) {
    clearTimeout(state.timerId)
    state.timerId = undefined
  }
}

export function getTimingSettings (): TimingSettings {
  return {
    wordsPerMinute: state.wordsPerMinute,
    pauseAfterComma: state.pauseAfterComma,
    pauseAfterPeriod: state.pauseAfterPeriod,
    pauseAfterParagraph: state.pauseAfterParagraph,
    chunkSize: state.chunkSize
  }
}

export function getVisualSettings (): VisualSettings {
  return {
    highlightOptimalLetter: state.highlightOptimalLetter,
    highlightOptimalLetterColor: state.highlightOptimalLetterColor,
    wordFlicker: state.wordFlicker,
    wordFlickerPercent: state.wordFlickerPercent
  }
}
