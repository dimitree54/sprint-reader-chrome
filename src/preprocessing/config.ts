import { readTranslationLanguage, readSummarizationLevel, readPreprocessingEnabled } from '../common/storage'
import type { TranslationLanguage } from '../common/translation'
import type { SummarizationLevel } from '../common/summarization'

export interface PreprocessingConfig {
  enabled: boolean
  targetLanguage: TranslationLanguage
  summarizationLevel: SummarizationLevel
}

export class PreprocessingConfigService {
  async getConfig(): Promise<PreprocessingConfig> {
    const [enabled, targetLanguage, summarizationLevel] = await Promise.all([
      readPreprocessingEnabled(),
      readTranslationLanguage(),
      readSummarizationLevel()
    ])

    return {
      enabled,
      targetLanguage,
      summarizationLevel
    }
  }

  /**
   * Check if preprocessing should be skipped entirely
   */
  shouldSkipProcessing(config: PreprocessingConfig): boolean {
    return !config.enabled
  }
}

export const preprocessingConfigService = new PreprocessingConfigService()