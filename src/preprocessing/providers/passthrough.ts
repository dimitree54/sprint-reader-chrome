import type { PreprocessingProvider, PreprocessingResult } from './types'
import type { PreprocessingConfig } from '../config'
import { preprocessingConfigService } from '../config'

export class PassthroughProvider implements PreprocessingProvider {
  name = 'passthrough'

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isAvailable(_config: PreprocessingConfig): boolean {
    // Always available as a safe fallback when AI preprocessing cannot run
    return true
  }

  /**
   * Get detailed availability information with reasons for non-availability
   */
  async getAvailabilityInfo(config: PreprocessingConfig): Promise<{ isAvailable: boolean; reason?: string }> {
    const shouldSkip = preprocessingConfigService.shouldSkipProcessing(config)
    return {
      isAvailable: true,
      reason: shouldSkip ? 'Preprocessing disabled in config' : 'Fallback provider active'
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
