import type { PreprocessingConfig } from '../config'

export interface PreprocessingResult {
  text: string
  metadata?: {
    originalLength: number
    processedLength: number
    wasModified: boolean
    provider: string
    processingTime?: number
  }
  error?: {
    type: 'missing_api_key' | 'api_error' | 'network_error' | 'timeout_error' | 'unknown_error'
    message: string
    details?: Record<string, unknown>
  }
}

export interface PreprocessingProvider {
  name: string
  process(text: string, config: PreprocessingConfig): Promise<PreprocessingResult>
  isAvailable(config: PreprocessingConfig): boolean
}