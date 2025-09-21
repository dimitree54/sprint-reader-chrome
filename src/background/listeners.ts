import type { RuntimeMessage } from '../common/messages'
import { setInStorage } from '../common/storage'
import { CONTEXT_MENU_ID, CONTEXT_MENU_TITLE } from './constants'
import { handleBackgroundMessage } from './message-handler'
import { openReaderWindowSetup } from './reader-window'
import { browser } from '../platform/browser'
import {
  getReaderWindowId,
  setReaderWindowId,
  getSelectionState
} from './state'

async function handleInstall (details: chrome.runtime.InstalledDetails): Promise<void> {
  const version = browser.runtime.getManifest().version
  await setInStorage({ version })

  if (details.reason === 'install') {
    await browser.tabs.create({ url: browser.runtime.getURL('pages/welcome.html') })
  } else if (details.reason === 'update') {
    await browser.tabs.create({ url: browser.runtime.getURL('pages/updated.html') })
  }
}

async function createContextMenus (): Promise<void> {
  try {
    await browser.contextMenus.removeAll()
  } catch {
    // Ignore remove errors when menus don't exist yet.
  }

  try {
    browser.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: CONTEXT_MENU_TITLE,
      contexts: ['selection']
    })
  } catch (error) {
    console.warn('[Speed Reader] Failed to create context menu entry', CONTEXT_MENU_ID, error)
  }
}

function registerContextMenuListener (): void {
  browser.contextMenus.onClicked.addListener(async (info: chrome.contextMenus.OnClickData) => {
    if (info.menuItemId === CONTEXT_MENU_ID && info.selectionText) {
      await openReaderWindowSetup(info.selectionText, true, false)
    }
  })
}

function registerWindowListener (): void {
  browser.windows.onRemoved.addListener((windowId: number) => {
    const trackedWindowId = getReaderWindowId()
    if (trackedWindowId && windowId === trackedWindowId) {
      setReaderWindowId(undefined)
    }
  })
}

function registerCommandListener (): void {
  browser.commands.onCommand.addListener(async (command: string) => {
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
  browser.runtime.onInstalled.addListener((details: chrome.runtime.InstalledDetails) => {
    handleInstall(details).catch((error) => console.error('Failed to handle install event', error))
    createContextMenus().catch((error) => console.error('Failed to create context menus', error))
  })
}

function registerMessageListener (): void {
  browser.runtime.onMessage.addListener((message: unknown, sender: chrome.runtime.MessageSender, sendResponse: (response?: unknown) => void) => {
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
