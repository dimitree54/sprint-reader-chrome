import { useReaderStore } from '../state/reader.store'
import { renderCurrentWord } from '../render'

export function initRenderer (): () => void {
  // Subscribe to all changes; render efficiently in callback
  const unsubscribe = useReaderStore.subscribe(() => {
    renderCurrentWord()
  })
  return unsubscribe
}
