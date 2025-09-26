import { browserApi } from '../core/browser-api.service'
import { getDefaultReaderPreferences, DEFAULTS } from '../config/defaults'
import {
  DEFAULT_TRANSLATION_LANGUAGE,
  isTranslationLanguage,
  type TranslationLanguage
} from './translation'
import {
  DEFAULT_SUMMARIZATION_LEVEL,
  isSummarizationLevel,
  type SummarizationLevel
} from './summarization'
import { readStorageValue } from './storage-helpers'


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



export async function getFromStorage<T> (keys: string[]): Promise<Partial<Record<string, T>>> {
  return browserApi.getStorage<T>(keys)
}

export async function setInStorage (items: Record<string, unknown>): Promise<void> {
  await browserApi.setStorage(items)
}

export const STORAGE_KEYS = {
  readerPrefs: 'sprintReader.readerPrefs',
  openaiApiKey: 'sprintReader.openaiApiKey',
  translationLanguage: 'sprintReader.translationLanguage',
  summarizationLevel: 'sprintReader.summarizationLevel',
  preprocessingEnabled: 'sprintReader.preprocessingEnabled'
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

export async function readOpenAIApiKey (): Promise<string | null> {
  const result = await getFromStorage<string>([STORAGE_KEYS.openaiApiKey])
  return result[STORAGE_KEYS.openaiApiKey] || null
}

export async function writeOpenAIApiKey (apiKey: string): Promise<void> {
  await setInStorage({
    [STORAGE_KEYS.openaiApiKey]: apiKey
  })
}

export async function readTranslationLanguage (): Promise<TranslationLanguage> {
  const validator = (value: unknown): value is TranslationLanguage =>
    typeof value === 'string' && isTranslationLanguage(value)
  return readStorageValue(STORAGE_KEYS.translationLanguage, validator, DEFAULT_TRANSLATION_LANGUAGE)
}

export async function writeTranslationLanguage (language: TranslationLanguage): Promise<void> {
  await setInStorage({
    [STORAGE_KEYS.translationLanguage]: language
  })
}

export async function readSummarizationLevel (): Promise<SummarizationLevel> {
  const validator = (value: unknown): value is SummarizationLevel =>
    typeof value === 'string' && isSummarizationLevel(value)
  return readStorageValue(STORAGE_KEYS.summarizationLevel, validator, DEFAULT_SUMMARIZATION_LEVEL)
}

export async function writeSummarizationLevel (level: SummarizationLevel): Promise<void> {
  await setInStorage({
    [STORAGE_KEYS.summarizationLevel]: level
  })
}

export async function readPreprocessingEnabled (): Promise<boolean> {
  const validator = (value: unknown): value is boolean =>
    typeof value === 'boolean'
  return readStorageValue(STORAGE_KEYS.preprocessingEnabled, validator, DEFAULTS.PREPROCESSING.enabled)
}

export async function writePreprocessingEnabled (enabled: boolean): Promise<void> {
  await setInStorage({
    [STORAGE_KEYS.preprocessingEnabled]: enabled
  })
}
