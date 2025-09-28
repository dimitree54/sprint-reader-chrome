import { PreprocessingManager } from './manager'
import { OpenAIProvider } from './providers/openai'
import { PassthroughProvider } from './providers/passthrough'
import { preprocessingConfigService } from './config'
import type { PreprocessingResult } from './providers/types'

// Create the default preprocessing manager with provider priority order
const defaultPreprocessingManager = new PreprocessingManager([
  new OpenAIProvider(),     // Try OpenAI first
  new PassthroughProvider() // Always available fallback
])

/**
 * Main preprocessing function with early return optimization
 */
export async function preprocessTextForReader(text: string): Promise<PreprocessingResult> {
  const config = await preprocessingConfigService.getConfig()

  // Early return - don't even initialize providers if no processing needed
  if (preprocessingConfigService.shouldSkipProcessing(config)) {
    console.log('[PreprocessingIndex] Skipping preprocessing: processing disabled or conditions not met')
    return {
      text,
      metadata: {
        originalLength: text.length,
        processedLength: text.length,
        wasModified: false,
        provider: 'none',
        processingTime: 0
      }
    }
  }

  return defaultPreprocessingManager.process(text, config)
}

// Export types and services for testing
export type { PreprocessingResult } from './providers/types'
export { PreprocessingManager } from './manager'
export { OpenAIProvider } from './providers/openai'
export { PassthroughProvider } from './providers/passthrough'
export { preprocessingConfigService } from './config'