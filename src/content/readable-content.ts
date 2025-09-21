const MIN_PARAGRAPH_LENGTH = 60
const MIN_TEXT_LENGTH = 600
const MIN_WORD_COUNT = 120
const FALLBACK_MIN_WORD_COUNT = 90
const MAX_PARAGRAPHS = 30
const BLOCKED_SELECTORS = 'header, footer, nav, aside, form, [role="banner"], [role="navigation"], [role="search"], [role="complementary"], [role="contentinfo"]'
const CANDIDATE_SELECTORS = [
  'article',
  'main',
  '[role="main"]',
  'div[itemprop="articleBody"]',
  '.article',
  '.post',
  '.entry-content',
  '.blog-post',
  '#content',
  '#main'
]

export type ReadableContent = {
  text: string;
  wordCount: number;
  isRTL: boolean;
}

type CandidateScore = {
  text: string;
  score: number;
  wordCount: number;
}

function normaliseParagraphs (rawText: string): string[] {
  const lines = rawText.split(/\n+/)
  const paragraphs: string[] = []
  let buffer: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.length === 0) {
      if (buffer.length > 0) {
        paragraphs.push(buffer.join(' '))
        buffer = []
      }
      continue
    }

    buffer.push(trimmed.replace(/\s+/g, ' '))
  }

  if (buffer.length > 0) {
    paragraphs.push(buffer.join(' '))
  }

  return paragraphs
}

function isElementVisible (element: Element): boolean {
  if (!(element instanceof HTMLElement)) {
    return false
  }

  if (element.hidden || element.getAttribute('aria-hidden') === 'true') {
    return false
  }

  const style = window.getComputedStyle(element)
  if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
    return false
  }

  const rect = element.getBoundingClientRect()
  return rect.width > 1 && rect.height > 1
}

function isBlocked (element: Element | null): boolean {
  if (!element || !(element instanceof HTMLElement)) {
    return false
  }

  return element.matches(BLOCKED_SELECTORS)
}

function addCandidate (candidates: Set<HTMLElement>, element: HTMLElement | null): void {
  if (!element || isBlocked(element) || !isElementVisible(element)) {
    return
  }

  candidates.add(element)
}

function collectFromSelectors (candidates: Set<HTMLElement>): void {
  for (const selector of CANDIDATE_SELECTORS) {
    for (const element of document.querySelectorAll<HTMLElement>(selector)) {
      addCandidate(candidates, element)
    }
  }
}

function collectFromParagraphs (candidates: Set<HTMLElement>): void {
  const paragraphs = Array.from(document.querySelectorAll<HTMLElement>('p'))
    .filter((paragraph) => paragraph.innerText.trim().length >= MIN_PARAGRAPH_LENGTH)
    .slice(0, MAX_PARAGRAPHS * 3)

  for (const paragraph of paragraphs) {
    let current: HTMLElement | null = paragraph
    for (let depth = 0; current && depth < 3; depth += 1) {
      addCandidate(candidates, current)
      current = current.parentElement
    }
  }
}

function gatherCandidateElements (): HTMLElement[] {
  const candidates = new Set<HTMLElement>()

  collectFromSelectors(candidates)
  collectFromParagraphs(candidates)

  if (document.body) {
    addCandidate(candidates, document.body)
  }

  return Array.from(candidates)
}

function calculateScore (element: HTMLElement): CandidateScore | null {
  const rawText = element.innerText
  const paragraphs = normaliseParagraphs(rawText).filter((paragraph) => paragraph.length >= MIN_PARAGRAPH_LENGTH)
  if (paragraphs.length === 0) {
    return null
  }

  const combinedText = paragraphs.join('\n\n')
  if (combinedText.length < MIN_TEXT_LENGTH) {
    return null
  }

  const wordCount = combinedText.split(/\s+/).filter(Boolean).length
  if (wordCount < MIN_WORD_COUNT) {
    return null
  }

  const linkTextLength = Array.from(element.querySelectorAll('a'))
    .map((anchor) => anchor.innerText.trim().length)
    .reduce((acc, length) => acc + length, 0)

  const linkDensity = linkTextLength / Math.max(combinedText.length, 1)
  if (linkDensity > 0.4) {
    return null
  }

  const headingCount = element.querySelectorAll('h1, h2, h3').length
  const paragraphScore = paragraphs.length * 150
  const headingBoost = headingCount * 60
  const score = (combinedText.length + paragraphScore + headingBoost) * (1 - linkDensity * 0.5)

  return {
    text: combinedText,
    score,
    wordCount
  }
}

function detectDirection (text: string): boolean {
  const rtlChar = /[\u0590-\u08FF\uFB1D-\uFDFD\uFE70-\uFEFC]/u
  return rtlChar.test(text)
}

function fallbackContent (): ReadableContent | null {
  if (!document.body) {
    return null
  }

  const paragraphs = normaliseParagraphs(document.body.innerText)
    .filter((paragraph) => paragraph.length >= MIN_PARAGRAPH_LENGTH)
    .slice(0, MAX_PARAGRAPHS)

  if (paragraphs.length === 0) {
    return null
  }

  const combined = paragraphs.join('\n\n')
  const wordCount = combined.split(/\s+/).filter(Boolean).length

  if (wordCount < FALLBACK_MIN_WORD_COUNT) {
    return null
  }

  return {
    text: combined,
    wordCount,
    isRTL: detectDirection(combined)
  }
}

export function collectReadableContent (): ReadableContent | null {
  const candidates = gatherCandidateElements()
  let best: CandidateScore | null = null

  for (const element of candidates) {
    const evaluated = calculateScore(element)
    if (!evaluated) {
      continue
    }

    if (!best || evaluated.score > best.score) {
      best = evaluated
    }
  }

  if (best) {
    return {
      text: best.text,
      wordCount: best.wordCount,
      isRTL: detectDirection(best.text)
    }
  }

  return fallbackContent()
}

