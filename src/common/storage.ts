import type { TranslationLanguage } from './translation'
import type { SummarizationLevel } from './summarization'
import { storageService, STORAGE_KEYS as CORE_STORAGE_KEYS } from '../core/storage.service'


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
  return storageService.get<T>(keys)
}

export async function setInStorage (items: Record<string, unknown>): Promise<void> {
  await storageService.set(items)
}

export const STORAGE_KEYS = CORE_STORAGE_KEYS


export async function readReaderPreferences (): Promise<ReaderPreferences> {
  return storageService.readReaderPreferences()
}

export async function writeReaderPreferences (prefs: ReaderPreferences): Promise<void> {
  await storageService.writeReaderPreferences(prefs)
}

export async function readOpenAIApiKey (): Promise<string | null> {
  return storageService.readOpenAIApiKey()
}

export async function writeOpenAIApiKey (apiKey: string): Promise<void> {
  await storageService.writeOpenAIApiKey(apiKey)
}

export async function readTranslationLanguage (): Promise<TranslationLanguage> {
  return storageService.readTranslationLanguage()
}

export async function writeTranslationLanguage (language: TranslationLanguage): Promise<void> {
  await storageService.writeTranslationLanguage(language)
}

export async function readSummarizationLevel (): Promise<SummarizationLevel> {
  return storageService.readSummarizationLevel()
}

export async function writeSummarizationLevel (level: SummarizationLevel): Promise<void> {
  await storageService.writeSummarizationLevel(level)
}

export async function readPreprocessingEnabled (): Promise<boolean> {
  return storageService.readPreprocessingEnabled()
}

export async function writePreprocessingEnabled (enabled: boolean): Promise<void> {
  await storageService.writePreprocessingEnabled(enabled)
}
