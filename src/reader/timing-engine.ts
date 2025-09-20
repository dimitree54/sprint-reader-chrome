export type { WordItem, TimingSettings } from './timing/types'
export {
  getWordFrequency,
  calculateShannonEntropy,
  detectPunctuation,
  assignOptimalLetterPosition
} from './timing/word-analysis'
export {
  calculateWordTiming,
  calculatePunctuationTiming,
  createWordItem,
  createChunks
} from './timing/chunking'
