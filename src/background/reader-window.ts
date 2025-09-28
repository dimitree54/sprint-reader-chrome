import { browserApi } from '../core/browser-api.service'
import type { ReaderMessage } from '../common/messages'
import {
  createSelection
} from './selection'
import {
  getReaderWindowId,
  setReaderWindowId,
  type SelectionState
} from './state'
import { DEFAULTS } from '../config/defaults'

async function focusExistingWindow (): Promise<boolean> {
  const windowId = getReaderWindowId()
  if (typeof windowId !== 'number') {
    return false
  }

  try {
    await browserApi.updateWindow(windowId, { focused: true })
    await browserApi.sendMessage({ target: 'reader', type: 'refreshReader' } satisfies ReaderMessage)
    return true
  } catch (error) {
    console.warn('[Speed Reader] Failed to focus reader window, opening a new one.', error)
    setReaderWindowId(undefined)
    return false
  }
}

async function createReaderWindow (): Promise<void> {
  const url = browserApi.runtime.getURL('pages/reader.html')
  const created = await browserApi.createWindow({
    url,
    type: 'popup',
    width: DEFAULTS.UI.windowDimensions.width,
    height: DEFAULTS.UI.windowDimensions.height,
    focused: true
  })

  setReaderWindowId(created?.id ?? undefined)
}

export async function openReaderWindow (): Promise<void> {
  const focused = await focusExistingWindow()
  if (!focused) {
    await createReaderWindow()
  }
}

export async function openReaderWindowSetup (
  text: string,
  hasSelection: boolean,
  isRTL: boolean
): Promise<SelectionState> {
  const selection = createSelection(text, hasSelection, isRTL)
  await openReaderWindow()
  return selection
}
