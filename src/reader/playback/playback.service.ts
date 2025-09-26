import { useReaderStore } from '../state/reader.store'
import { startPlayback as legacyStart, stopPlayback as legacyStop } from '../playback'
import { renderCurrentWord } from '../render'

export class PlaybackService {
  play (): void {
    if (useReaderStore.getState().status !== 'playing') {
      useReaderStore.setState({ status: 'playing' })
      legacyStart()
    }
  }

  pause (): void {
    if (useReaderStore.getState().status === 'playing') {
      useReaderStore.setState({ status: 'paused' })
      legacyStop()
    }
  }

  restart (): void {
    // Reset index to zero and re-render via legacy path
    useReaderStore.setState({ index: 0, status: 'paused' })
    legacyStop()
    renderCurrentWord()
  }
}

export const playbackService = new PlaybackService()

