import { wrapLettersInSpans, highlightOptimalLetter } from '../reader/visual-effects'
import type { WordItem } from '../reader/timing-engine'

export const INACTIVE_CLASS = 'speed-reader-inline__chunk--inactive'
export const ACTIVE_CLASS = 'speed-reader-inline__chunk--active'

export function createInlineDom (
  wordItems: WordItem[],
  isRTL: boolean,
  highlightColor: string
): { container: HTMLElement; chunkElements: HTMLElement[] } | null {
  if (wordItems.length === 0) {
    return null
  }

  const container = document.createElement('span')
  container.className = 'speed-reader-inline__container'
  container.setAttribute('data-speed-reader-inline', 'true')
  container.style.display = 'inline'
  container.style.whiteSpace = 'pre-wrap'
  container.style.direction = isRTL ? 'rtl' : 'ltr'

  const track = document.createElement('span')
  track.className = 'speed-reader-inline__track'
  track.style.direction = isRTL ? 'rtl' : 'ltr'
  container.appendChild(track)

  const chunkElements: HTMLElement[] = []
  const total = wordItems.length
  const visualSettings = {
    highlightOptimalLetter: true,
    highlightOptimalLetterColor: highlightColor,
    wordFlicker: false,
    wordFlickerPercent: 0
  }

  wordItems.forEach((item, index) => {
    const chunkElement = document.createElement('span')
    chunkElement.className = `speed-reader-inline__chunk ${INACTIVE_CLASS}`
    chunkElement.dataset.index = String(index)

    if (item.text.includes('\n')) {
      chunkElement.classList.add('speed-reader-inline__chunk--break')
      const breakWrapper = document.createElement('span')
      breakWrapper.className = 'speed-reader-inline__break'
      const breakCount = item.text.split('\n').length - 1
      for (let i = 0; i < breakCount; i++) {
        breakWrapper.appendChild(document.createElement('br'))
      }
      chunkElement.appendChild(breakWrapper)
    } else {
      const wordElement = document.createElement('span')
      wordElement.className = 'speed-reader-inline__word'
      wordElement.innerHTML = wrapLettersInSpans(item.text)
      chunkElement.appendChild(wordElement)

      highlightOptimalLetter(wordElement, item, visualSettings)

      const shouldAddSpace = index < total - 1 && !/\n$/.test(item.text)
      if (shouldAddSpace) {
        const spaceElement = document.createElement('span')
        spaceElement.className = 'speed-reader-inline__space'
        spaceElement.textContent = ' '
        chunkElement.appendChild(spaceElement)
      }
    }

    chunkElements.push(chunkElement)
    track.appendChild(chunkElement)
  })

  return { container, chunkElements }
}
