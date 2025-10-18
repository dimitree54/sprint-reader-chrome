import { browserApi, BrowserApiService } from './browser-api.service'
import { getDefaultReaderPreferences, getDefaultUsageStats, DEFAULTS } from '../config/defaults'
import type { ReaderPreferences, UsageStats } from '../common/storage'
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
import type { User } from '../auth/types/user.types'

export const STORAGE_KEYS = {
  readerPrefs: 'sprintReader.readerPrefs',
  translationLanguage: 'sprintReader.translationLanguage',
  summarizationLevel: 'sprintReader.summarizationLevel',
  preprocessingEnabled: 'sprintReader.preprocessingEnabled',
  usageStats: 'sprintReader.usageStats',
  // Authentication keys
  authUser: 'sprintReader.auth.user',
  authToken: 'sprintReader.auth.token',
  authRefreshToken: 'sprintReader.auth.refreshToken',
  authTokenExpiresAt: 'sprintReader.auth.tokenExpiresAt'
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
    const storedPrefs = result[STORAGE_KEYS.readerPrefs] ?? {}
    const normalized: ReaderPreferences = {
      wordsPerMinute: storedPrefs?.wordsPerMinute ?? defaults.wordsPerMinute,
      pauseAfterComma: storedPrefs?.pauseAfterComma ?? defaults.pauseAfterComma,
      pauseAfterPeriod: storedPrefs?.pauseAfterPeriod ?? defaults.pauseAfterPeriod,
      pauseAfterParagraph: storedPrefs?.pauseAfterParagraph ?? defaults.pauseAfterParagraph,
      chunkSize: defaults.chunkSize,
      wordFlicker: storedPrefs?.wordFlicker ?? defaults.wordFlicker,
      wordFlickerPercent: storedPrefs?.wordFlickerPercent ?? defaults.wordFlickerPercent,
      theme: storedPrefs?.theme ?? defaults.theme
    }

    if (storedPrefs?.chunkSize !== normalized.chunkSize && result[STORAGE_KEYS.readerPrefs] != null) {
      await this.writeReaderPreferences({ ...result[STORAGE_KEYS.readerPrefs], chunkSize: normalized.chunkSize })
    }

    return normalized
  }

  async writeReaderPreferences (prefs: ReaderPreferences): Promise<void> {
    const defaults = getDefaultReaderPreferences()
    const normalized: ReaderPreferences = {
      ...prefs,
      chunkSize: defaults.chunkSize
    }
    await this.set({ [STORAGE_KEYS.readerPrefs]: normalized })
  }

  // API key & config -------------------------------------------------------


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

  // Usage statistics --------------------------------------------------------
  async readUsageStats (): Promise<UsageStats> {
    const result = await this.get<UsageStats>([STORAGE_KEYS.usageStats])
    const stored = result[STORAGE_KEYS.usageStats]
    const defaults = getDefaultUsageStats()

    let needsSync = false

    const firstUsedAt = typeof stored?.firstUsedAt === 'number' && Number.isFinite(stored.firstUsedAt)
      ? stored.firstUsedAt
      : defaults.firstUsedAt
    if (firstUsedAt !== stored?.firstUsedAt) {
      needsSync = true
    }

    const totalWordsRead = typeof stored?.totalWordsRead === 'number' && Number.isFinite(stored.totalWordsRead)
      ? stored.totalWordsRead
      : defaults.totalWordsRead
    if (totalWordsRead !== stored?.totalWordsRead) {
      needsSync = true
    }

    const totalOriginalReadingTimeMs = typeof stored?.totalOriginalReadingTimeMs === 'number' && Number.isFinite(stored.totalOriginalReadingTimeMs)
      ? stored.totalOriginalReadingTimeMs
      : defaults.totalOriginalReadingTimeMs
    if (totalOriginalReadingTimeMs !== stored?.totalOriginalReadingTimeMs) {
      needsSync = true
    }

    const totalExtensionReadingTimeMs = typeof stored?.totalExtensionReadingTimeMs === 'number' && Number.isFinite(stored.totalExtensionReadingTimeMs)
      ? stored.totalExtensionReadingTimeMs
      : defaults.totalExtensionReadingTimeMs
    if (totalExtensionReadingTimeMs !== stored?.totalExtensionReadingTimeMs) {
      needsSync = true
    }

    const stats: UsageStats = {
      firstUsedAt,
      totalWordsRead,
      totalOriginalReadingTimeMs,
      totalExtensionReadingTimeMs
    }

    if (needsSync) {
      await this.writeUsageStats(stats)
    }

    return stats
  }

  async writeUsageStats (stats: UsageStats): Promise<void> {
    await this.set({ [STORAGE_KEYS.usageStats]: stats })
  }

  async updateUsageStats (updater: (current: UsageStats) => UsageStats): Promise<UsageStats> {
    const current = await this.readUsageStats()
    const updated = updater({ ...current })

    const firstUsedAtCandidate = typeof updated.firstUsedAt === 'number' && Number.isFinite(updated.firstUsedAt)
      ? updated.firstUsedAt
      : current.firstUsedAt

    const normalized: UsageStats = {
      firstUsedAt: Math.min(firstUsedAtCandidate, current.firstUsedAt),
      totalWordsRead: Math.max(0, Math.round(updated.totalWordsRead)),
      totalOriginalReadingTimeMs: Math.max(0, Math.round(updated.totalOriginalReadingTimeMs)),
      totalExtensionReadingTimeMs: Math.max(0, Math.round(updated.totalExtensionReadingTimeMs))
    }

    await this.writeUsageStats(normalized)
    return normalized
  }

  // Authentication methods --------------------------------------------------------
  async readAuthUser (): Promise<User | null> {
    const result = await this.get<User>([STORAGE_KEYS.authUser])
    return result[STORAGE_KEYS.authUser] || null
  }

  async writeAuthUser (user: User | null): Promise<void> {
    await this.set({ [STORAGE_KEYS.authUser]: user })
  }

  async readAuthToken (): Promise<string | null> {
    const result = await this.get<string>([STORAGE_KEYS.authToken])
    return result[STORAGE_KEYS.authToken] || null
  }

  async writeAuthToken (token: string | null): Promise<void> {
    await this.set({ [STORAGE_KEYS.authToken]: token })
  }

  async readAuthRefreshToken (): Promise<string | null> {
    const result = await this.get<string>([STORAGE_KEYS.authRefreshToken])
    return result[STORAGE_KEYS.authRefreshToken] || null
  }

  async writeAuthRefreshToken (token: string | null): Promise<void> {
    await this.set({ [STORAGE_KEYS.authRefreshToken]: token })
  }

  async readAuthTokenExpiresAt (): Promise<number | null> {
    const result = await this.get<number>([STORAGE_KEYS.authTokenExpiresAt])
    const expiresAt = result[STORAGE_KEYS.authTokenExpiresAt]
    return typeof expiresAt === 'number' && Number.isFinite(expiresAt) ? expiresAt : null
  }

  async writeAuthTokenExpiresAt (timestamp: number | null): Promise<void> {
    await this.set({ [STORAGE_KEYS.authTokenExpiresAt]: timestamp })
  }

  async clearAuthData (): Promise<void> {
    await this.set({
      [STORAGE_KEYS.authUser]: null,
      [STORAGE_KEYS.authToken]: null,
      [STORAGE_KEYS.authRefreshToken]: null,
      [STORAGE_KEYS.authTokenExpiresAt]: null
    })
  }

  // Internal typed read helper to avoid circular dependency on common/storage-helpers
  private async readValue<T>(key: string, validator: (value: unknown) => value is T, defaultValue: T): Promise<T> {
    const result = await this.get<T>([key])
    const value = result[key]
    return validator(value) ? value : defaultValue
  }
}

export const storageService = new StorageService()
