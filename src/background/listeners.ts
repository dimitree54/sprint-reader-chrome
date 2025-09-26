import type { RuntimeMessage } from '../common/messages'
import { setInStorage } from '../common/storage'
import { CONTEXT_MENU_ID, CONTEXT_MENU_TITLE } from './constants'
import { handleBackgroundMessage } from './message-handler'
import { openReaderWindowSetup } from './reader-window'
import { browserApi } from '../core/browser-api.service'
import {
  getReaderWindowId,
  setReaderWindowId,
  getSelectionState
} from './state'

async function handleInstall (details: chrome.runtime.InstalledDetails): Promise<void> {
  const version = browserApi.runtime.getManifest().version
  await setInStorage({ version })

  if (details.reason === 'install') {
    await browserApi.createTab({ url: browserApi.runtime.getURL('pages/welcome.html') })
  } else if (details.reason === 'update') {
    await browserApi.createTab({ url: browserApi.runtime.getURL('pages/updated.html') })
  }
}

async function createContextMenus (): Promise<void> {
  try {
    await browserApi.contextMenusRemoveAll()
  } catch {
    // Ignore remove errors when menus don't exist yet.
  }

  try {
    browserApi.contextMenusCreate({
      id: CONTEXT_MENU_ID,
      title: CONTEXT_MENU_TITLE,
      contexts: ['selection']
    })
  } catch (error) {
    console.warn('[Speed Reader] Failed to create context menu entry', CONTEXT_MENU_ID, error)
  }
}

function registerContextMenuListener (): void {
  browserApi.onContextMenuClicked.addListener(async (info: chrome.contextMenus.OnClickData) => {
    if (info.menuItemId === CONTEXT_MENU_ID && info.selectionText) {
      await openReaderWindowSetup(info.selectionText, true, false)
    }
  })
}

function registerWindowListener (): void {
  browserApi.onWindowRemoved.addListener((windowId: number) => {
    const trackedWindowId = getReaderWindowId()
    if (trackedWindowId && windowId === trackedWindowId) {
      setReaderWindowId(undefined)
    }
  })
}

function registerCommandListener (): void {
  browserApi.commands.onCommand.addListener(async (command: string) => {
    if (command !== 'speed_read_shortcut') {
      return
    }

    const latestSelection = getSelectionState()
    if (latestSelection.text.length > 0) {
      await openReaderWindowSetup(latestSelection.text, latestSelection.hasSelection, latestSelection.isRTL)
    }
  })
}

function registerInstallListener (): void {
  browserApi.runtime.onInstalled.addListener((details: chrome.runtime.InstalledDetails) => {
    handleInstall(details).catch((error) => console.error('Failed to handle install event', error))
    createContextMenus().catch((error) => console.error('Failed to create context menus', error))
  })
}

function registerMessageListener (): void {
  browserApi.runtime.onMessage.addListener((message: unknown, sender: chrome.runtime.MessageSender, sendResponse: (response?: unknown) => void) => {
    // Fire-and-forget: handle message asynchronously without keeping channel open
    handleBackgroundMessage(message as RuntimeMessage, sender, sendResponse).catch(console.error)
    return false
  })
}

export function registerBackgroundListeners (): void {
  registerContextMenuListener()
  registerWindowListener()
  registerCommandListener()
  registerInstallListener()
  registerMessageListener()
}
