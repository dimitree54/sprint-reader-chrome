import { getBrowser } from '../platform/browser';
import type { BackgroundMessage, RuntimeMessage } from '../common/messages';
import {
  readReaderPreferences,
  readSelection,
  setInStorage,
  writeReaderPreferences,
  writeSelection,
  type ReaderPreferences,
  type StoredSelection,
} from '../common/storage';

const browser = getBrowser();

type SelectionState = {
  text: string;
  hasSelection: boolean;
  isRTL: boolean;
  timestamp: number;
};

let latestSelection: SelectionState = {
  text: '',
  hasSelection: false,
  isRTL: false,
  timestamp: Date.now(),
};
let readerWindowId: number | undefined;
let cachedPrefs: ReaderPreferences | undefined;

const CONTEXT_MENU_TITLE = 'Speed read selected text';

function htmlEncode(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case "'":
        return '&#39;';
      case '"':
        return '&quot;';
      default:
        return char;
    }
  });
}

function htmlDecode(value: string): string {
  return value.replace(/&(#?(x?))(\w+);/g, (_match, prefix, isHex, code) => {
    if (!prefix) {
      switch (code) {
        case 'lt':
          return '<';
        case 'gt':
          return '>';
        case 'amp':
          return '&';
        case 'quot':
          return '"';
        case '#39':
        case 'apos':
          return "'";
        default:
          return code;
      }
    }

    const base = isHex ? 16 : 10;
    const charCode = Number.parseInt(code, base);
    if (Number.isNaN(charCode)) {
      return code;
    }
    return String.fromCodePoint(charCode);
  });
}

function toStoredSelection(selection: SelectionState): StoredSelection {
  return {
    text: htmlEncode(selection.text),
    hasSelection: selection.hasSelection,
    isRTL: selection.isRTL,
    timestamp: selection.timestamp,
  };
}

function fromStoredSelection(selection: StoredSelection): SelectionState {
  return {
    text: htmlDecode(selection.text),
    hasSelection: selection.hasSelection,
    isRTL: selection.isRTL,
    timestamp: selection.timestamp,
  };
}

async function ensureSelection() {
  const stored = await readSelection();
  if (stored) {
    latestSelection = fromStoredSelection(stored);
  }
}

async function ensurePreferences() {
  if (!cachedPrefs) {
    cachedPrefs = await readReaderPreferences();
  }
  return cachedPrefs;
}

async function persistPreferences(prefs: ReaderPreferences) {
  cachedPrefs = prefs;
  await writeReaderPreferences(prefs);
}

async function persistSelection(selection: SelectionState) {
  const storedSelection = toStoredSelection(selection);
  await writeSelection(storedSelection);
}

async function openReaderWindow(): Promise<void> {
  const url = browser.runtime.getURL('pages/reader.html');

  if (typeof readerWindowId === 'number') {
    try {
      await browser.windows.update(readerWindowId, { focused: true });
      await browser.runtime.sendMessage({ target: 'reader', type: 'refreshReader' });
      return;
    } catch (error) {
      console.warn('[Speed Reader] Failed to focus reader window, opening a new one.', error);
      readerWindowId = undefined;
    }
  }

  const created = await browser.windows.create({
    url,
    type: 'popup',
    width: 960,
    height: 640,
    focused: true,
  });

  readerWindowId = created?.id ?? undefined;
}

async function openReaderWindowSetup(
  _saveToLocal: boolean,
  text: string,
  haveSelection: boolean,
  directionRTL: boolean,
): Promise<void> {
  latestSelection = {
    text,
    hasSelection: haveSelection,
    isRTL: directionRTL,
    timestamp: Date.now(),
  };

  await persistSelection(latestSelection);

  await openReaderWindow();
}

function updateSelectionFromMessage(message: BackgroundMessage) {
  latestSelection = {
    text: message.selectedText,
    hasSelection: message.haveSelection,
    isRTL: message.dirRTL,
    timestamp: Date.now(),
  };
}

async function handleMessage(rawMessage: RuntimeMessage, _sender: unknown, sendResponse: (value?: unknown) => void) {
  if (rawMessage.target !== 'background') {
    return undefined;
  }

  const message = rawMessage as BackgroundMessage;

  switch (message.type) {
    case 'getSelection':
      updateSelectionFromMessage(message);
      sendResponse({ ok: true });
      return true;
    case 'openReaderFromContent':
      updateSelectionFromMessage(message);
      await openReaderWindowSetup(true, message.selectionText, message.haveSelection, message.dirRTL);
      return true;
    case 'openReaderFromContextMenu':
      await openReaderWindowSetup(true, message.selectionText, message.selectionText.length > 0, false);
      return true;
    case 'openReaderFromPopup':
      {
        const prefs = await ensurePreferences();
        const updatedPrefs: ReaderPreferences = {
          ...prefs,
          wordsPerMinute: message.wordsPerMinute,
        };
        await persistPreferences(updatedPrefs);

        const providedText = message.selectionText?.trim() ?? '';
        if (providedText.length === 0) {
          return true;
        }

        await openReaderWindowSetup(true, providedText, true, false);
        return true;
      }
    case 'getMenuEntryText':
      sendResponse({ menuEntryText: CONTEXT_MENU_TITLE });
      return true;
    default:
      return undefined;
  }
}

async function handleInstall(details: typeof browser.runtime.OnInstalledDetailsType) {
  await ensureSelection();

  const version = browser.runtime.getManifest().version;
  await setInStorage({ version });

  if (details.reason === 'install') {
    await browser.tabs.create({ url: browser.runtime.getURL('pages/welcome.html') });
  } else if (details.reason === 'update') {
    await browser.tabs.create({ url: browser.runtime.getURL('pages/updated.html') });
  }
}

async function createContextMenus() {
  try {
    browser.contextMenus.removeAll();
  } catch (error) {
    // Ignore remove errors when menus don't exist yet.
  }

  try {
    browser.contextMenus.create({
      id: 'read-selection',
      title: CONTEXT_MENU_TITLE,
      contexts: ['selection'],
    });
  } catch (error) {
    console.warn('[Speed Reader] Failed to create context menu entry', 'read-selection', error);
  }
}

browser.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === 'read-selection' && info.selectionText) {
    await openReaderWindowSetup(true, info.selectionText, true, false);
    return;
  }
});

browser.windows.onRemoved.addListener((windowId) => {
  if (readerWindowId && windowId === readerWindowId) {
    readerWindowId = undefined;
  }
});

browser.commands.onCommand.addListener(async (command) => {
  if (command !== 'speed_read_shortcut') {
    return;
  }

  if (latestSelection.text.length > 0) {
    await openReaderWindowSetup(true, latestSelection.text, latestSelection.hasSelection, latestSelection.isRTL);
    return;
  }

  browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    if (!tabId) return;

    browser.tabs.sendMessage(
      tabId,
      { target: 'content', type: 'getMouseCoordinates' },
      async (response) => {
        const coords = response ?? { x: 0, y: 0 };
        browser.tabs.sendMessage(tabId, { target: 'content', type: 'showSelectionHint', x: coords.x, y: coords.y });
      },
    );
  });
});

browser.runtime.onInstalled.addListener((details) => {
  handleInstall(details).catch((error) => console.error('Failed to handle install event', error));
  createContextMenus().catch((error) => console.error('Failed to create context menus', error));
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const maybePromise = handleMessage(message as RuntimeMessage, sender, sendResponse);
  return maybePromise instanceof Promise ? true : maybePromise;
});

(globalThis as typeof globalThis & {
  openReaderWindowSetup?: typeof openReaderWindowSetup;
  receiveMessage?: typeof handleMessage;
}).openReaderWindowSetup = openReaderWindowSetup;

(globalThis as typeof globalThis & {
  openReaderWindowSetup?: typeof openReaderWindowSetup;
  receiveMessage?: typeof handleMessage;
}).receiveMessage = ((message: RuntimeMessage, sender?: unknown, sendResponse?: (value?: unknown) => void) => {
  void handleMessage(message, sender, sendResponse ?? (() => undefined));
  return true;
}) as typeof handleMessage;

void ensureSelection();
void ensurePreferences();
