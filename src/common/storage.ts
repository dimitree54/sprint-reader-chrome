import { getBrowser } from '../platform/browser';

export type StoredSelection = {
  text: string;
  hasSelection: boolean;
  isRTL: boolean;
  timestamp: number;
};

export type ReaderPreferences = {
  wordsPerMinute: number;
  persistSelection: boolean;
};

const browser = getBrowser();

function promisify<T>(fn: (callback: (value: T) => void, reject: (error: unknown) => void) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    fn(resolve, reject);
  });
}

export async function getFromStorage<T>(keys: string[]): Promise<Partial<Record<string, T>>> {
  if ('storage' in browser && 'local' in browser.storage && 'get' in browser.storage.local) {
    return promisify((resolve, reject) => {
      browser.storage.local.get(keys, (items: Record<string, T>) => {
        const error = (browser.runtime as typeof browser.runtime & { lastError?: Error }).lastError;
        if (error) {
          reject(error);
        } else {
          resolve(items);
        }
      });
    });
  }
  return {};
}

export async function setInStorage(items: Record<string, unknown>): Promise<void> {
  if ('storage' in browser && 'local' in browser.storage && 'set' in browser.storage.local) {
    await promisify<void>((resolve, reject) => {
      browser.storage.local.set(items, () => {
        const error = (browser.runtime as typeof browser.runtime & { lastError?: Error }).lastError;
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
}

export const STORAGE_KEYS = {
  selection: 'sprintReader.selection',
  selectionHistory: 'sprintReader.selectionHistory',
  readerPrefs: 'sprintReader.readerPrefs',
} as const;

export async function readSelection(): Promise<StoredSelection | undefined> {
  const result = await getFromStorage<StoredSelection>([STORAGE_KEYS.selection]);
  return result[STORAGE_KEYS.selection];
}

export async function writeSelection(selection: StoredSelection): Promise<void> {
  const history = await readSelectionHistory();
  const nextHistory = [selection, ...history.filter((item) => item.text !== selection.text)].slice(0, 5);
  await setInStorage({
    [STORAGE_KEYS.selection]: selection,
    [STORAGE_KEYS.selectionHistory]: nextHistory,
  });
}

export async function readSelectionHistory(): Promise<StoredSelection[]> {
  const result = await getFromStorage<StoredSelection[]>([STORAGE_KEYS.selectionHistory]);
  return result[STORAGE_KEYS.selectionHistory] ?? [];
}

export async function readReaderPreferences(): Promise<ReaderPreferences> {
  const result = await getFromStorage<ReaderPreferences>([STORAGE_KEYS.readerPrefs]);
  return {
    wordsPerMinute: result[STORAGE_KEYS.readerPrefs]?.wordsPerMinute ?? 400,
    persistSelection: result[STORAGE_KEYS.readerPrefs]?.persistSelection ?? true,
  };
}

export async function writeReaderPreferences(prefs: ReaderPreferences): Promise<void> {
  await setInStorage({
    [STORAGE_KEYS.readerPrefs]: prefs,
  });
}
