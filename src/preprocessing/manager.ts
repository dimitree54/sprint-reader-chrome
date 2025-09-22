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
        const startTime = Date.now()
        try {
          return await provider.process(text, config)
        } catch (error) {
          const processingTime = Date.now() - startTime
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

          return {
            text,
            metadata: {
              originalLength: text.length,
              processedLength: text.length,
              wasModified: false,
              provider: provider.name,
              processingTime
            },
            error: {
              type: 'unknown_error',
              message: errorMessage,
              details: {
                providerName: provider.name,
                originalError: error instanceof Error ? error.name : 'UnknownError'
              }
            }
          }
        }
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