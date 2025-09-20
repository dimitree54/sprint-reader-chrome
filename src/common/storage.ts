import { getBrowser } from '../platform/browser'

export type StoredSelection = {
  text: string;
  hasSelection: boolean;
  isRTL: boolean;
  timestamp: number;
};

export type ReaderTheme = 'dark' | 'light';

export type ReaderPreferences = {
  wordsPerMinute: number;
  pauseAfterComma: boolean;
  pauseAfterPeriod: boolean;
  pauseAfterParagraph: boolean;
  chunkSize: number;
  wordFlicker: boolean;
  wordFlickerPercent: number;
  theme: ReaderTheme;
};

const browser = getBrowser()

function promisify<T> (fn: (callback: (value: T) => void, reject: (error: unknown) => void) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    fn(resolve, reject)
  })
}

export async function getFromStorage<T> (keys: string[]): Promise<Partial<Record<string, T>>> {
  if ('storage' in browser && 'local' in browser.storage && 'get' in browser.storage.local) {
    return promisify((resolve, reject) => {
      browser.storage.local.get(keys, (items: Record<string, T>) => {
        const error = (browser.runtime as typeof browser.runtime & { lastError?: { message?: string } }).lastError
        if (error) {
          reject(new Error(error.message ?? 'Unknown runtime error'))
        } else {
          resolve(items)
        }
      })
    })
  }
  return {}
}

export async function setInStorage (items: Record<string, unknown>): Promise<void> {
  if ('storage' in browser && 'local' in browser.storage && 'set' in browser.storage.local) {
    await promisify<void>((resolve, reject) => {
      browser.storage.local.set(items, () => {
        const error = (browser.runtime as typeof browser.runtime & { lastError?: { message?: string } }).lastError
        if (error) {
          reject(new Error(error.message ?? 'Unknown runtime error'))
        } else {
          resolve()
        }
      })
    })
  }
}

export const STORAGE_KEYS = {
  selection: 'sprintReader.selection',
  readerPrefs: 'sprintReader.readerPrefs'
} as const

export async function readSelection (): Promise<StoredSelection | undefined> {
  const result = await getFromStorage<StoredSelection>([STORAGE_KEYS.selection])
  return result[STORAGE_KEYS.selection]
}

export async function writeSelection (selection: StoredSelection): Promise<void> {
  await setInStorage({
    [STORAGE_KEYS.selection]: selection
  })
}

export async function readReaderPreferences (): Promise<ReaderPreferences> {
  const result = await getFromStorage<ReaderPreferences>([STORAGE_KEYS.readerPrefs])
  return {
    wordsPerMinute: result[STORAGE_KEYS.readerPrefs]?.wordsPerMinute ?? 400,
    pauseAfterComma: result[STORAGE_KEYS.readerPrefs]?.pauseAfterComma ?? true,
    pauseAfterPeriod: result[STORAGE_KEYS.readerPrefs]?.pauseAfterPeriod ?? true,
    pauseAfterParagraph: result[STORAGE_KEYS.readerPrefs]?.pauseAfterParagraph ?? true,
    chunkSize: result[STORAGE_KEYS.readerPrefs]?.chunkSize ?? 3,
    wordFlicker: result[STORAGE_KEYS.readerPrefs]?.wordFlicker ?? true,
    wordFlickerPercent: result[STORAGE_KEYS.readerPrefs]?.wordFlickerPercent ?? 10,
    theme: result[STORAGE_KEYS.readerPrefs]?.theme ?? 'dark'
  }
}

export async function writeReaderPreferences (prefs: ReaderPreferences): Promise<void> {
  await setInStorage({
    [STORAGE_KEYS.readerPrefs]: prefs
  })
}
