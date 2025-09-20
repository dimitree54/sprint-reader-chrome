import type { ReaderPreferences } from '../common/storage'

export type SelectionState = {
  text: string;
  hasSelection: boolean;
  isRTL: boolean;
  timestamp: number;
}

const defaultSelection: SelectionState = {
  text: '',
  hasSelection: false,
  isRTL: false,
  timestamp: Date.now()
}

let latestSelection: SelectionState = { ...defaultSelection }
let readerWindowId: number | undefined
let cachedPreferences: ReaderPreferences | undefined

export function getSelectionState (): SelectionState {
  return latestSelection
}

export function setSelectionState (next: SelectionState): void {
  latestSelection = next
}

export function updateSelectionState (partial: Partial<SelectionState>): SelectionState {
  latestSelection = {
    ...latestSelection,
    ...partial,
    timestamp: partial.timestamp ?? Date.now()
  }
  return latestSelection
}

export function resetSelectionState (): void {
  latestSelection = { ...defaultSelection, timestamp: Date.now() }
}

export function getReaderWindowId (): number | undefined {
  return readerWindowId
}

export function setReaderWindowId (windowId: number | undefined): void {
  readerWindowId = windowId
}

export function getCachedPreferences (): ReaderPreferences | undefined {
  return cachedPreferences
}

export function setCachedPreferences (prefs: ReaderPreferences | undefined): void {
  cachedPreferences = prefs
}
