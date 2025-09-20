/**
 * Visual effects for RSVP reading
 * Handles letter highlighting, word positioning, and flicker effects
 */

import type { WordItem } from './timing-engine';

export type VisualSettings = {
  highlightOptimalLetter: boolean;
  highlightOptimalLetterColor: string;
  wordFlicker: boolean;
  wordFlickerPercent: number;
};

export function wrapLettersInSpans(text: string): string {
  const escape = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  return [...text]
    .map((char, index) => `<span class="char${index + 1}">${escape(char)}</span>`)
    .join('');
}

export function highlightOptimalLetter(wordElement: HTMLElement, wordItem: WordItem, settings: VisualSettings) {
  if (!settings.highlightOptimalLetter) return;

  const letterPosition = wordItem.optimalLetterPosition;
  const charElement = wordElement.querySelector(`.char${letterPosition}`) as HTMLElement;
  if (charElement) {
    charElement.style.color = settings.highlightOptimalLetterColor;
  }
}

export function calculateOptimalLetterCenterPosition(wordElement: HTMLElement, wordItem: WordItem): number {
  // Get the optimal letter position (1-based index)
  const optimalPosition = wordItem.optimalLetterPosition;

  // Find the span element for the optimal letter
  const optimalLetterSpan = wordElement.querySelector(`.char${optimalPosition}`) as HTMLElement;
  if (!optimalLetterSpan) return 0;

  // Get the current center position of the optimal letter relative to the viewport
  const letterRect = optimalLetterSpan.getBoundingClientRect();
  const letterCenterX = letterRect.left + letterRect.width / 2;

  return letterCenterX;
}

export function applyFlickerEffect(wordElement: HTMLElement, wordItem: WordItem, settings: VisualSettings) {
  if (!settings.wordFlicker) return;

  const flickerDuration = (wordItem.duration * settings.wordFlickerPercent) / 100;
  const flickerDelay = Math.max(50, flickerDuration);

  // Apply flicker effect after a short delay
  setTimeout(() => {
    const originalOpacity = wordElement.style.opacity || '1';

    // Quick fade to 30% opacity
    wordElement.style.transition = 'opacity 50ms ease-in-out';
    wordElement.style.opacity = '0.3';

    // Restore opacity after flicker duration
    setTimeout(() => {
      wordElement.style.opacity = originalOpacity;
    }, flickerDelay);
  }, wordItem.duration * 0.3); // Flicker at 30% through the word display
}

/**
 * Calculate the optimal font size for all words in the text
 * Based on the longest word that will be displayed
 */
export function calculateOptimalFontSizeForText(wordItems: WordItem[]): string {
  // Prefer the content container width to avoid overestimating space
  const container = document.querySelector('.reader__main') as HTMLElement | null;
  const containerWidth = container?.clientWidth ?? window.innerWidth;
  let availableWidth = containerWidth;
  if (container) {
    const cs = getComputedStyle(container);
    const paddingX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    availableWidth = Math.max(0, containerWidth - paddingX);
  }

  // Find the longest word in the actual text
  const longestWordLength = Math.max(...wordItems.map(item => item.text.length));

  // Maximum theoretical word length based on algorithm (before splitting at 17 chars)
  const maxTheoreticalLength = 16;

  // Use the longer of actual longest word or theoretical maximum
  const effectiveLength = Math.max(longestWordLength, maxTheoreticalLength);

  // Reserve 15% margin on each side for safety (30% total)
  availableWidth *= 0.7;
  // More accurate character width estimation
  // For font-weight: 600 with letter-spacing: 0.04em, characters are roughly 0.65 of font size
  const charWidthRatio = 0.65;
  const letterSpacing = 0.04; // From CSS letter-spacing: 0.04em

  // Calculate max font size that fits the longest word
  const estimatedCharWidth = charWidthRatio * (1 + letterSpacing);
  const maxFontSizeForLength = availableWidth / (effectiveLength * estimatedCharWidth);

  // Get the CSS maximum values (from original clamp)
  const cssMaxFontSize = 128;
  const cssMinFontSize = 48;

  // Use the smaller of calculated max or CSS max
  const dynamicFontSize = Math.min(maxFontSizeForLength, cssMaxFontSize);

  // Ensure minimum readable size
  const finalFontSize = Math.max(dynamicFontSize, cssMinFontSize);

  return `${finalFontSize}px`;
}

export function setOptimalWordPositioning(wordElement: HTMLElement, wordItem: WordItem) {
  // Reset any previous transforms (keep the translateY(-50%) from CSS)
  wordElement.style.transform = 'translateY(-50%)';

  // Get the current position of the optimal letter center
  const currentLetterCenterX = calculateOptimalLetterCenterPosition(wordElement, wordItem);

  // Calculate how much to move to center the optimal letter
  const viewportCenterX = window.innerWidth / 2;
  const translateX = viewportCenterX - currentLetterCenterX;

  // Apply the transform to center the optimal letter (combine with vertical centering)
  wordElement.style.transform = `translateY(-50%) translateX(${translateX}px)`;
}