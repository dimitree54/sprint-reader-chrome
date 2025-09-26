import { useReaderStore } from '../state/reader.store'
import { startPlayback as legacyStart, stopPlayback as legacyStop } from '../playback'

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
    // Reset index to zero
    useReaderStore.setState({ index: 0, status: 'paused' })
    legacyStop()
  }
}

export const playbackService = new PlaybackService()

