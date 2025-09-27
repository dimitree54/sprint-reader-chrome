import { preprocessingConfigService } from './config'
import { PreprocessingManager } from './manager'
import { OpenAIProvider } from './providers/openai'
import { PassthroughProvider } from './providers/passthrough'
import type { PreprocessingResult } from './providers/types'
import type { TranslationLanguage } from '../common/translation'
import type { SummarizationLevel } from '../common/summarization'

export class AIPreprocessingService {
  private manager = new PreprocessingManager([
    new OpenAIProvider(),
    new PassthroughProvider()
  ])

  async isAvailable (): Promise<boolean> {
    const cfg = await preprocessingConfigService.getConfig()
    return !!cfg.apiKey
  }

  async translateText (text: string, targetLanguage?: TranslationLanguage): Promise<PreprocessingResult> {
    const cfg = await preprocessingConfigService.getConfig()
    const effective = targetLanguage ? { ...cfg, targetLanguage } : cfg
    return this.manager.process(text, effective)
  }

  async summarizeText (text: string, level?: SummarizationLevel): Promise<PreprocessingResult> {
    const cfg = await preprocessingConfigService.getConfig()
    const effective = level ? { ...cfg, summarizationLevel: level } : cfg
    return this.manager.process(text, effective)
  }

  /**
   * Process text using streaming provider if available, forwarding tokens to callback
   */
  async processWithStreaming (
    text: string,
    onToken: (token: string) => void
  ): Promise<PreprocessingResult> {
    const { OpenAIProvider } = await import('./providers/openai')
    const { preprocessingConfigService } = await import('./config')
    const cfg = await preprocessingConfigService.getConfig()
    if (!cfg.enabled) {
      return this.manager.process(text, cfg)
    }
    const provider = new OpenAIProvider()
    if (!provider.isAvailable(cfg)) {
      // Fallback to non-streaming path through manager
      return this.manager.process(text, cfg)
    }

    // Bridge OpenAI streaming to a simple token callback and collect text
    let collected = ''
    const result = await provider.processWithStreaming(text, cfg, async (token: string) => {
      collected += token
      onToken(token)
    })
    // If provider didn't return text, use collected
    if (!result.text && collected) {
      return { ...result, text: collected }
    }
    return result
  }
}

export const aiPreprocessingService = new AIPreprocessingService()
