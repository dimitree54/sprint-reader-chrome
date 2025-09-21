import type { PreprocessingProvider, PreprocessingResult } from './providers/types'
import type { PreprocessingConfig } from './config'

export class PreprocessingManager {
  constructor(private providers: PreprocessingProvider[]) {
    if (providers.length === 0) {
      throw new Error('PreprocessingManager requires at least one provider')
    }
  }

  async process(text: string, config: PreprocessingConfig): Promise<PreprocessingResult> {
    for (const provider of this.providers) {
      if (provider.isAvailable(config)) {
        return provider.process(text, config)
      }
    }

    // This should never happen if PassthroughProvider is included, but fallback just in case
    return {
      text,
      error: {
        type: 'unknown_error',
        message: 'No available preprocessing providers',
        details: { availableProviders: this.providers.map(p => p.name) }
      }
    }
  }

  /**
   * Get the name of the provider that would be used for the given config
   */
  getSelectedProviderName(config: PreprocessingConfig): string {
    for (const provider of this.providers) {
      if (provider.isAvailable(config)) {
        return provider.name
      }
    }
    return 'none'
  }
}