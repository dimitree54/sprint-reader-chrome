import { useReaderStore } from '../state/reader.store'
import { renderCurrentWord } from '../render'

export function initRenderer (): () => void {
  // Subscribe to all changes; render efficiently in callback
  let last = { index: -1, count: -1, processed: -1, estimated: -1 as number | -1 }
  const unsubscribe = useReaderStore.subscribe((s) => {
    const next = {
      index: s.index,
      count: s.wordItems.length,
      processed: s.processedChunkCount,
      estimated: s.estimatedTotalChunks ?? -1
    }
    // Re-render word when index or word count changes
    if (next.index !== last.index || next.count !== last.count) {
      renderCurrentWord()
    }
    // Update progress text reactively
    if (next.processed !== last.processed || next.estimated !== last.estimated) {
      const progressEl = document.getElementById('progress')
      if (progressEl) {
        if (next.estimated > 0) {
          const pct = Math.min((next.processed / next.estimated) * 100, 100)
          progressEl.textContent = `Processing... ${Math.round(pct)}%`
        } else if (next.processed >= 0) {
          progressEl.textContent = `Processing... ${next.processed} chunks ready`
        }
      }
    }
    last = next
  })
  return unsubscribe
}
