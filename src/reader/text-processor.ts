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
  // Step 1: Preserve paragraph breaks, then normalize other whitespace
  const PARA = '¶¶'
  const preserved = text.replace(/(?:\r?\n){2,}/g, ` ${PARA} `)
  const normalized = preserved.replace(/\s+/g, ' ').trim()
  const words = normalized.length > 0 ? normalized.split(' ') : []

  // Step 2: Process words to handle bolding and create WordInfo tokens
  const tokens: WordInfo[] = []
  let isBoldSection = false
  for (let word of words) {
    if (word.length === 0) continue

    let isBold = isBoldSection

    // Detach leading punctuation (anything not a letter, number, or asterisk)
    let leadingPunct = ''
    const leadingMatch = word.match(/^[^'p{L}\p{N}*]+/u)
    if (leadingMatch) {
        leadingPunct = leadingMatch[0]
        word = word.slice(leadingPunct.length)
    }

    // Detach trailing punctuation
    let trailingPunct = ''
    const trailingMatch = word.match(/[^'p{L}\p{N}*]+$/u)
    if (trailingMatch) {
        trailingPunct = trailingMatch[0]
        word = word.slice(0, -trailingPunct.length)
    }

    const startsWithBold = word.startsWith('**')
    const endsWithBold = word.endsWith('**')

    if (startsWithBold && endsWithBold && word.length > 4) {
      word = word.substring(2, word.length - 2)
      isBold = true
      isBoldSection = false
    } else if (startsWithBold) {
      word = word.substring(2)
      isBold = true
      isBoldSection = true
    } else if (endsWithBold) {
      word = word.substring(0, word.length - 2)
      isBold = true
      isBoldSection = false
    }

    if (word) {
      tokens.push({ text: leadingPunct + word + trailingPunct, isBold: isBold })
    } else if (leadingPunct || trailingPunct) {
      tokens.push({ text: leadingPunct + trailingPunct, isBold: false })
    }
  }

  // Step 3: Restore paragraph markers
  const tokensWithParagraphs = tokens.map(t => (t.text === PARA ? { text: '\n\n', isBold: false } : t)).filter(t => t.text);

  // Step 4 & 5: Consolidate acronyms and numbers, then split long words
  let finalTokens = consolidateAcronymsTokens(tokensWithParagraphs)
  finalTokens = preserveNumbersDecimalsTokens(finalTokens)

  const finalWords: WordInfo[] = []
  finalTokens.forEach(token => {
    const splitWords = splitLongWords(token.text)
    splitWords.forEach(splitWord => {
      finalWords.push({ text: splitWord, isBold: token.isBold })
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
