export { decodeHtml } from '../common/html'
import { preprocessText } from './text-processor'
import { preprocessTextForReader } from './text-preprocessor'
import { createChunks } from './timing-engine'
import { calculateOptimalFontSizeForText } from './visual-effects'
import { getTimingSettings, state } from './state'

export async function rebuildWordItems (): Promise<void> {
  const rawText = state.words.map(w => w.text).join(' ')
  console.log('🔍 DEBUG: rawText before preprocessing:', rawText)

  const preprocessingResult = await preprocessTextForReader(rawText)
  console.log('🔍 DEBUG: preprocessingResult:', preprocessingResult)

  const preprocessedWords = preprocessText(preprocessingResult.text)
  console.log('🔍 DEBUG: preprocessedWords:', preprocessedWords)

  // Update the state.words with the new preprocessed words (including bold information)
  state.words = preprocessedWords.map(word => ({ text: word.text, isBold: word.isBold }))
  console.log('🔍 DEBUG: state.words after update:', state.words)

  const timingSettings = getTimingSettings()
  state.wordItems = createChunks(preprocessedWords, timingSettings)
  console.log('🔍 DEBUG: state.wordItems after createChunks:', state.wordItems)

  state.optimalFontSize = calculateOptimalFontSizeForText(state.wordItems)

  // Import and call renderCurrentWord to update the UI
  const { renderCurrentWord } = await import('./render')
  renderCurrentWord()
}

export async function setWords (words: string[]): Promise<void> {
  // Convert string array to ReaderToken array (no bold information)
  state.words = words.map(word => ({ text: word, isBold: false }))
  await rebuildWordItems()
  state.index = 0
}

export function updateOptimalFontSize (): void {
  if (state.wordItems.length > 0) {
    state.optimalFontSize = calculateOptimalFontSizeForText(state.wordItems)
  }
}
