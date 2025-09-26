import { useReaderStore } from '../state/reader.store'
import { updateControlsState } from '../controls'

export function initStoreBoundControls (): () => void {
  const unsubscribe = useReaderStore.subscribe(() => {
    updateControlsState()
  })
  return unsubscribe
}
