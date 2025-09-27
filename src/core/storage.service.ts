import { browserApi, BrowserApiService } from './browser-api.service'
import { getDefaultReaderPreferences, DEFAULTS } from '../config/defaults'
import type { ReaderPreferences } from '../common/storage'
import {
  DEFAULT_TRANSLATION_LANGUAGE,
  isTranslationLanguage,
  type TranslationLanguage
} from '../common/translation'
import {
  DEFAULT_SUMMARIZATION_LEVEL,
  isSummarizationLevel,
  type SummarizationLevel
} from '../common/summarization'

export const STORAGE_KEYS = {
  readerPrefs: 'sprintReader.readerPrefs',
  openaiApiKey: 'sprintReader.openaiApiKey',
  translationLanguage: 'sprintReader.translationLanguage',
  summarizationLevel: 'sprintReader.summarizationLevel',
  preprocessingEnabled: 'sprintReader.preprocessingEnabled'
} as const

export class StorageService {
  constructor (private readonly api: BrowserApiService = browserApi) {}

  async get<T>(keys: string[]): Promise<Partial<Record<string, T>>> {
    return this.api.getStorage<T>(keys)
  }

  async set (items: Record<string, unknown>): Promise<void> {
    await this.api.setStorage(items)
  }

  // Preferences ------------------------------------------------------------
  async readReaderPreferences (): Promise<ReaderPreferences> {
    const result = await this.get<ReaderPreferences>([STORAGE_KEYS.readerPrefs])
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

  async writeReaderPreferences (prefs: ReaderPreferences): Promise<void> {
    await this.set({ [STORAGE_KEYS.readerPrefs]: prefs })
  }

  // API key & config -------------------------------------------------------
  async readOpenAIApiKey (): Promise<string | null> {
    const result = await this.get<string>([STORAGE_KEYS.openaiApiKey])
    return result[STORAGE_KEYS.openaiApiKey] || null
  }

  async writeOpenAIApiKey (apiKey: string): Promise<void> {
    await this.set({ [STORAGE_KEYS.openaiApiKey]: apiKey })
  }

  // Translation language ---------------------------------------------------
  async readTranslationLanguage (): Promise<TranslationLanguage> {
    const validator = (value: unknown): value is TranslationLanguage =>
      typeof value === 'string' && isTranslationLanguage(value)
    return this.readValue(STORAGE_KEYS.translationLanguage, validator, DEFAULT_TRANSLATION_LANGUAGE)
  }

  async writeTranslationLanguage (language: TranslationLanguage): Promise<void> {
    await this.set({ [STORAGE_KEYS.translationLanguage]: language })
  }

  // Summarization level ----------------------------------------------------
  async readSummarizationLevel (): Promise<SummarizationLevel> {
    const validator = (value: unknown): value is SummarizationLevel =>
      typeof value === 'string' && isSummarizationLevel(value)
    return this.readValue(STORAGE_KEYS.summarizationLevel, validator, DEFAULT_SUMMARIZATION_LEVEL)
  }

  async writeSummarizationLevel (level: SummarizationLevel): Promise<void> {
    await this.set({ [STORAGE_KEYS.summarizationLevel]: level })
  }

  // Feature toggles --------------------------------------------------------
  async readPreprocessingEnabled (): Promise<boolean> {
    const validator = (value: unknown): value is boolean => typeof value === 'boolean'
    return this.readValue(STORAGE_KEYS.preprocessingEnabled, validator, DEFAULTS.PREPROCESSING.enabled)
  }

  async writePreprocessingEnabled (enabled: boolean): Promise<void> {
    await this.set({ [STORAGE_KEYS.preprocessingEnabled]: enabled })
  }

  // Internal typed read helper to avoid circular dependency on common/storage-helpers
  private async readValue<T>(key: string, validator: (value: unknown) => value is T, defaultValue: T): Promise<T> {
    const result = await this.get<T>([key])
    const value = result[key]
    return validator(value) ? value : defaultValue
  }
}

export const storageService = new StorageService()
