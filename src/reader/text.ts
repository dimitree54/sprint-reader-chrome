export { decodeHtml } from '../common/html'
import { preprocessText } from './text-processor'
import { createChunks } from './timing-engine'
import { calculateOptimalFontSizeForText } from './visual-effects'
import { getTimingSettings, state } from './state'

export function rebuildWordItems (): void {
  const rawText = state.words.join(' ')
  const preprocessedWords = preprocessText(rawText)
  const timingSettings = getTimingSettings()
  state.wordItems = createChunks(preprocessedWords, timingSettings)
  state.optimalFontSize = calculateOptimalFontSizeForText(state.wordItems)
}

export function setWords (words: string[]): void {
  state.words = words
  rebuildWordItems()
  state.index = 0
}

export function updateOptimalFontSize (): void {
  if (state.wordItems.length > 0) {
    state.optimalFontSize = calculateOptimalFontSizeForText(state.wordItems)
  }
}
