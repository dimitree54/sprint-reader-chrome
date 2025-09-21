import { getBrowser } from '../platform/browser'
import { getDefaultReaderPreferences } from '../config/defaults'


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
  readerPrefs: 'sprintReader.readerPrefs'
} as const


export async function readReaderPreferences (): Promise<ReaderPreferences> {
  const result = await getFromStorage<ReaderPreferences>([STORAGE_KEYS.readerPrefs])
  const defaults = getDefaultReaderPreferences()
  return {
    wordsPerMinute: result[STORAGE_KEYS.readerPrefs]?.wordsPerMinute ?? defaults.wordsPerMinute,
    pauseAfterComma: result[STORAGE_KEYS.readerPrefs]?.pauseAfterComma ?? defaults.pauseAfterComma,
    pauseAfterPeriod: result[STORAGE_KEYS.readerPrefs]?.pauseAfterPeriod ?? defaults.pauseAfterPeriod,
    pauseAfterParagraph: result[STORAGE_KEYS.readerPrefs]?.pauseAfterParagraph ?? defaults.pauseAfterParagraph,
    chunkSize: result[STORAGE_KEYS.readerPrefs]?.chunkSize ?? defaults.chunkSize,
    wordFlicker: result[STORAGE_KEYS.readerPrefs]?.wordFlicker ?? defaults.wordFlicker,
    wordFlickerPercent: result[STORAGE_KEYS.readerPrefs]?.wordFlickerPercent ?? defaults.wordFlickerPercent,
    theme: result[STORAGE_KEYS.readerPrefs]?.theme ?? defaults.theme
  }
}

export async function writeReaderPreferences (prefs: ReaderPreferences): Promise<void> {
  await setInStorage({
    [STORAGE_KEYS.readerPrefs]: prefs
  })
}
