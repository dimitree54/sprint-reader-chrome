/**
 * Advanced text preprocessing for optimal RSVP reading
 * Handles acronyms, numbers, and long word splitting
 */

import type { ReaderToken } from './text-types'

/**
 * Unicode-aware helper to clean words for matching purposes
 * Normalizes (NFKC) and removes punctuation while preserving Unicode letters/numbers/marks
 */
function cleanForMatch(word: string): string {
  // Normalize and keep only letters, numbers, combining marks (Unicode-aware)
  return word.normalize('NFKC').replace(/[^\p{L}\p{N}\p{M}]+/gu, '')
}

export function consolidateAcronyms (words: string[]): string[] {
  const result: string[] = []
  let i = 0

  while (i < words.length) {
    const word = words[i]

    // Check if this looks like an acronym (2-4 uppercase letters)
    if (/^\p{Lu}{2,4}$/u.test(word) && i + 1 < words.length) {
      // Check if next words are also part of acronym
      let acronym = word
      let j = i + 1

      while (j < words.length && j < i + 3 && /^\p{Lu}{1,2}$/u.test(words[j])) {
        acronym += words[j]
        j++
      }

      if (j > i + 1) {
        result.push(acronym)
        i = j
        continue
      }
    }

    result.push(word)
    i++
  }

  return result
}

function mergeNumberParts(words: string[], startIndex: number): { text: string; endIndex: number } {
  let text = words[startIndex]
  let j = startIndex + 1
  let sawDecimal = false

  while (j + 1 < words.length) {
    const sep = words[j]
    const next = words[j + 1]
    if ((sep === ',' || (!sawDecimal && sep === '.')) && /^\d+$/.test(next)) {
      text += sep + next
      if (sep === '.') sawDecimal = true
      j += 2
      continue
    }
    break
  }

  return { text, endIndex: j }
}

export function preserveNumbersDecimals (words: string[]): string[] {
  const result: string[] = []
  let i = 0

  while (i < words.length) {
    const word = words[i]

    if (/^\d+$/.test(word)) {
      const { text, endIndex } = mergeNumberParts(words, i)
      if (endIndex > i + 1) {
        result.push(text)
        i = endIndex
        continue
      }
    }

    result.push(word)
    i++
  }

  return result
}

export function splitLongWords (text: string): string[] {
  // Split words longer than 17 characters for better readability
  if (text.length <= 17) return [text]

  const parts: string[] = []
  let remaining = text

  while (remaining.length > 17) {
    // Try to find a good break point (vowel or consonant cluster)
    let breakPoint = 12
    for (let i = 10; i <= 15 && i < remaining.length; i++) {
      if (/[aeiou]/.test(remaining[i])) {
        breakPoint = i + 1
        break
      }
    }

    parts.push(remaining.substring(0, breakPoint))
    remaining = remaining.substring(breakPoint)
  }

  if (remaining.length > 0) {
    parts.push(remaining)
  }

  return parts
}

export type WordInfo = ReaderToken

export function extractBoldWords(text: string): { processedText: string; boldWords: Set<string> } {
  const boldWords = new Set<string>()
  const boldRegex = /\*\*(.+?)\*\*/gs
  const processedText = text.replace(boldRegex, (_m, phrase: string) => {
    for (const w of phrase.trim().split(/\s+/)) {
      const clean = cleanForMatch(w)
      if (clean) boldWords.add(clean.toLowerCase())
    }
    return phrase
  })
  return { processedText, boldWords }
}

export function preprocessText (text: string): WordInfo[] {
  // Step 0: Extract bold words and clean the text
  const { processedText, boldWords } = extractBoldWords(text)

  // Step 1: Preserve paragraph breaks, then normalize other whitespace
  const PARA = '¶¶'
  const preserved = processedText.replace(/(?:\r?\n){2,}/g, ` ${PARA} `)
  const normalized = preserved.replace(/\s+/g, ' ').trim()
  let words = normalized.length > 0 ? normalized.split(' ') : []
  // Restore paragraph markers as actual double newlines so downstream can detect
  words = words.map(w => (w === PARA ? '\n\n' : w))

  // Step 2: Consolidate acronyms
  words = consolidateAcronyms(words)

  // Step 3: Preserve numbers with decimals/commas
  words = preserveNumbersDecimals(words)

  // Step 4: Split very long words
  const finalWords: WordInfo[] = []
  words.forEach(word => {
    const splitWords = splitLongWords(word)
    // Determine boldness at original word level; propagate to splits
    const baseClean = cleanForMatch(word)
    const baseIsBold = !!baseClean && boldWords.has(baseClean.toLowerCase())
    splitWords.forEach(splitWord => {
      const partClean = cleanForMatch(splitWord)
      const isBold = baseIsBold || (!!partClean && boldWords.has(partClean.toLowerCase()))
      finalWords.push({ text: splitWord, isBold })
    })
  })

  return finalWords
}

/**
 * Token-aware wrapper for consolidateAcronyms function
 * Preserves bold metadata during acronym consolidation
 */
export function consolidateAcronymsTokens(tokens: ReaderToken[]): ReaderToken[] {
  const result: ReaderToken[] = []
  let i = 0

  while (i < tokens.length) {
    const token = tokens[i]

    // Check if this looks like an acronym (2-4 uppercase letters)
    if (/^\p{Lu}{2,4}$/u.test(token.text) && i + 1 < tokens.length) {
      // Check if next tokens are also part of acronym
      let acronym = token.text
      let j = i + 1
      let hasAnyBold = token.isBold

      while (j < tokens.length && j < i + 3 && /^\p{Lu}{1,2}$/u.test(tokens[j].text)) {
        acronym += tokens[j].text
        hasAnyBold = hasAnyBold || tokens[j].isBold
        j++
      }

      if (j > i + 1) {
        result.push({ text: acronym, isBold: hasAnyBold })
        i = j
        continue
      }
    }

    result.push(token)
    i++
  }

  return result
}

/**
 * Token-aware wrapper for preserveNumbersDecimals function
 * Preserves bold metadata during number consolidation
 */
function mergeNumberTokens(tokens: ReaderToken[], startIndex: number): { token: ReaderToken; endIndex: number } {
  let text = tokens[startIndex].text
  let isBold = tokens[startIndex].isBold
  let j = startIndex + 1
  let sawDecimal = false

  while (j + 1 < tokens.length) {
    const sep = tokens[j].text
    const next = tokens[j + 1]
    if ((sep === ',' || (!sawDecimal && sep === '.')) && next && /^\d+$/.test(next.text)) {
      text += sep + next.text
      isBold = isBold || tokens[j].isBold || next.isBold
      if (sep === '.') sawDecimal = true
      j += 2
      continue
    }
    break
  }

  return { token: { text, isBold }, endIndex: j }
}

export function preserveNumbersDecimalsTokens(tokens: ReaderToken[]): ReaderToken[] {
  const result: ReaderToken[] = []
  let i = 0

  while (i < tokens.length) {
    const token = tokens[i]

    if (/^\d+$/.test(token.text)) {
      const { token: mergedToken, endIndex } = mergeNumberTokens(tokens, i)
      if (endIndex > i + 1) {
        result.push(mergedToken)
        i = endIndex
        continue
      }
    }

    result.push(token)
    i++
  }

  return result
}
