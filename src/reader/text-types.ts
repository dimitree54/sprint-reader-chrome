export type ReaderToken = {
  text: string;
  isBold: boolean;
}

/**
 * Utility function to convert ReaderToken[] to string[] for legacy functions
 */
export function tokensToWords(tokens: ReaderToken[]): string[] {
  return tokens.map(token => token.text)
}

/**
 * Utility function to convert string[] to ReaderToken[] (no bold information)
 */
export function wordsToTokens(words: string[]): ReaderToken[] {
  return words.map(word => ({ text: word, isBold: false }))
}
