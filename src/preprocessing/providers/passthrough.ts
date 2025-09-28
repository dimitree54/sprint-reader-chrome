import type { PreprocessingProvider, PreprocessingResult } from './types'
import type { PreprocessingConfig } from '../config'
import { preprocessingConfigService } from '../config'

export class PassthroughProvider implements PreprocessingProvider {
  name = 'passthrough'

  isAvailable(config: PreprocessingConfig): boolean {
    // Only available when skipping processing is explicitly allowed
    return preprocessingConfigService.shouldSkipProcessing(config)
  }

  /**
   * Get detailed availability information with reasons for non-availability
   */
  async getAvailabilityInfo(config: PreprocessingConfig): Promise<{ isAvailable: boolean; reason?: string }> {
    const shouldSkip = preprocessingConfigService.shouldSkipProcessing(config)
    return {
      isAvailable: shouldSkip,
      reason: shouldSkip ? undefined : 'Processing is enabled and other providers should be used'
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async process(text: string, _config: PreprocessingConfig): Promise<PreprocessingResult> {
    const startTime = Date.now()

    return {
      text,
      metadata: {
        originalLength: text.length,
        processedLength: text.length,
        wasModified: false,
        provider: this.name,
        processingTime: Date.now() - startTime
      }
    }
  }
}