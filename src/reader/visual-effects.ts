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
  return text
    .split('')
    .map((char, index) => `<span class="char${index + 1}">${char}</span>`)
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

export function calculateOptimalLetterCenterPosition(wordItem: WordItem): number {
  const wordElement = document.getElementById('word');
  if (!wordElement) return 0;

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

export function setOptimalWordPositioning(wordElement: HTMLElement, wordItem: WordItem) {
  // Reset any previous transforms (keep the translateY(-50%) from CSS)
  wordElement.style.transform = 'translateY(-50%)';

  // Get the current position of the optimal letter center
  const currentLetterCenterX = calculateOptimalLetterCenterPosition(wordItem);

  // Calculate how much to move to center the optimal letter
  const viewportCenterX = window.innerWidth / 2;
  const translateX = viewportCenterX - currentLetterCenterX;

  // Apply the transform to center the optimal letter (combine with vertical centering)
  wordElement.style.transform = `translateY(-50%) translateX(${translateX}px)`;
}