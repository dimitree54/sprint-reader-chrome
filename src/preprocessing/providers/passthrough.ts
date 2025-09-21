import type { PreprocessingProvider, PreprocessingResult } from './types'
import type { PreprocessingConfig } from '../config'

export class PassthroughProvider implements PreprocessingProvider {
  name = 'passthrough'

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isAvailable(_config: PreprocessingConfig): boolean {
    return true // Always available as fallback
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