import { readOpenAIApiKey, readTranslationLanguage, readSummarizationLevel } from '../common/storage'
import type { TranslationLanguage } from '../common/translation'
import type { SummarizationLevel } from '../common/summarization'

export interface PreprocessingConfig {
  apiKey: string | null
  targetLanguage: TranslationLanguage
  summarizationLevel: SummarizationLevel
}

export class PreprocessingConfigService {
  async getConfig(): Promise<PreprocessingConfig> {
    const [apiKey, targetLanguage, summarizationLevel] = await Promise.all([
      readOpenAIApiKey(),
      readTranslationLanguage(),
      readSummarizationLevel()
    ])

    return {
      apiKey,
      targetLanguage,
      summarizationLevel
    }
  }

  /**
   * Check if preprocessing should be skipped entirely
   */
  shouldSkipProcessing(config: PreprocessingConfig): boolean {
    return config.targetLanguage === 'none' && config.summarizationLevel === 'none'
  }
}

export const preprocessingConfigService = new PreprocessingConfigService()