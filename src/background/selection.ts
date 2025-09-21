import type { BackgroundMessage } from '../common/messages'
import {
  getSelectionState,
  setSelectionState,
  updateSelectionState,
  type SelectionState
} from './state'


export function selectionFromMessage (message: BackgroundMessage): SelectionState {
  const text = 'selectionText' in message && typeof message.selectionText === 'string'
    ? message.selectionText
    : 'selectedText' in message
      ? message.selectedText
      : ''
  const hasSelection = 'haveSelection' in message ? message.haveSelection : text.length > 0
  const isRTL = 'dirRTL' in message ? message.dirRTL : false

  return updateSelectionState({
    text,
    hasSelection,
    isRTL
  })
}

export function getCurrentSelection (): SelectionState {
  return getSelectionState()
}

export function setCurrentSelection (selection: SelectionState): void {
  setSelectionState(selection)
}

export function createSelection (
  text: string,
  hasSelection: boolean,
  isRTL: boolean
): SelectionState {
  const selection: SelectionState = {
    text,
    hasSelection,
    isRTL,
    timestamp: Date.now()
  }
  setSelectionState(selection)
  return selection
}
