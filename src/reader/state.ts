import type { ReaderTheme } from '../common/storage'
import { DEFAULTS } from '../config/defaults'
import type { TimingSettings, WordItem } from './timing-engine'
import type { VisualSettings } from './visual-effects'

type PlaybackTimer = ReturnType<typeof setTimeout> | undefined

export type ReaderState = {
  words: string[];
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
  wordsPerMinute: 400,
  highlightOptimalLetter: true,
  highlightOptimalLetterColor: '#FF8C00',
  pauseAfterComma: true,
  pauseAfterPeriod: true,
  pauseAfterParagraph: true,
  chunkSize: DEFAULTS.READER_PREFERENCES.chunkSize,
  wordFlicker: false,
  wordFlickerPercent: 10,
  optimalFontSize: '128px',
  theme: 'dark'
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
