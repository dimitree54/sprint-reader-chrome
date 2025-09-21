export { decodeHtml } from '../common/html'
import { preprocessText } from './text-processor'
import { preprocessTextForReader } from './text-preprocessor'
import { createChunks } from './timing-engine'
import { calculateOptimalFontSizeForText } from './visual-effects'
import { getTimingSettings, state } from './state'

export async function rebuildWordItems (): Promise<void> {
  const rawText = state.words.join(' ')
  const preprocessingResult = await preprocessTextForReader(rawText)
  const preprocessedWords = preprocessText(preprocessingResult.text)
  const timingSettings = getTimingSettings()
  state.wordItems = createChunks(preprocessedWords, timingSettings)
  state.optimalFontSize = calculateOptimalFontSizeForText(state.wordItems)
}

export async function setWords (words: string[]): Promise<void> {
  state.words = words
  await rebuildWordItems()
  state.index = 0
}

export function updateOptimalFontSize (): void {
  if (state.wordItems.length > 0) {
    state.optimalFontSize = calculateOptimalFontSizeForText(state.wordItems)
  }
}
