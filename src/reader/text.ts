export { decodeHtml } from '../common/html'
import { preprocessText } from './text-processor'
import { preprocessTextForReader } from '../preprocessing/index'
import { createChunks } from './timing-engine'
import { calculateOptimalFontSizeForText } from './visual-effects'
import { getTimingSettings, state } from './state'
import type { ReaderToken } from './text-types'

export async function rebuildWordItems (): Promise<void> {
  const rawText = state.words.map(w => w.text).join(' ')

  state.isPreprocessing = true
  const { renderCurrentWord } = await import('./render')
  renderCurrentWord()

  try {
    const preprocessingResult = await preprocessTextForReader(rawText)
    const preprocessedWords = preprocessText(preprocessingResult.text)

    // Update the state.words with the new preprocessed words (including bold information)
    state.words = preprocessedWords.map(word => ({ text: word.text, isBold: word.isBold }))

    const timingSettings = getTimingSettings()
    state.wordItems = createChunks(preprocessedWords, timingSettings)

    state.optimalFontSize = calculateOptimalFontSizeForText(state.wordItems)
  } finally {
    state.isPreprocessing = false
    renderCurrentWord()
  }
}

export async function setWords (words: ReaderToken[]): Promise<void> {
  state.words = words
  await rebuildWordItems()
  state.index = 0
}

export function updateOptimalFontSize (): void {
  if (state.wordItems.length > 0) {
    state.optimalFontSize = calculateOptimalFontSizeForText(state.wordItems)
  }
}

export function recalculateTimingOnly (): void {
  // Only recalculate timing without preprocessing - use existing words
  const preprocessedWords = preprocessText(state.words.map(w => w.text).join(' '))

  // Preserve the isBold information from existing state.words
  const wordsWithBoldInfo = preprocessedWords.map((word, index) => ({
    text: word.text,
    isBold: state.words[index]?.isBold || word.isBold
  }))

  const timingSettings = getTimingSettings()
  state.wordItems = createChunks(wordsWithBoldInfo, timingSettings)

  state.optimalFontSize = calculateOptimalFontSizeForText(state.wordItems)
}
