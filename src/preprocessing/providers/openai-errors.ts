/**
 * OpenAI Error Handling
 *
 * Extracted from openai.ts to reduce file size
 */

import type { PreprocessingResult } from './types'

export function handleApiError(response: { status: number; statusText: string; url: string }, originalText: string): PreprocessingResult {
  const errorDetails = {
    status: response.status,
    statusText: response.statusText,
    url: response.url
  }

  let errorType: 'api_error' | 'network_error' = 'api_error'
  let errorMessage = `OpenAI API error: ${response.status} ${response.statusText}`

  if (response.status === 0) {
    errorType = 'network_error'
    errorMessage = 'Network error: Unable to connect to OpenAI API'
  } else if (response.status === 401) {
    errorMessage = 'Authentication error: Invalid API key'
  } else if (response.status === 429) {
    errorMessage = 'Rate limit exceeded: Too many requests to OpenAI API'
  } else if (response.status >= 500) {
    errorMessage = 'OpenAI server error: Please try again later'
  }

  return {
    text: originalText,
    error: {
      type: errorType,
      message: errorMessage,
      details: errorDetails
    }
  }
}

export function handleProcessingError(error: unknown, originalText: string): PreprocessingResult {
  let errorType: 'timeout_error' | 'network_error' | 'unknown_error' = 'unknown_error'
  let errorMessage = 'Unknown error occurred during preprocessing'
  const errorDetails: Record<string, unknown> = { originalError: error instanceof Error ? error.message : String(error) }

  if (error instanceof Error) {
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      errorType = 'timeout_error'
      errorMessage = 'Request timeout: OpenAI API took too long to respond'
    } else if (error.message.includes('fetch') || error.message.includes('network')) {
      errorType = 'network_error'
      errorMessage = 'Network error: Unable to reach OpenAI API'
    } else {
      errorMessage = `Processing error: ${error.message}`
    }
  }

  return {
    text: originalText,
    error: {
      type: errorType,
      message: errorMessage,
      details: errorDetails
    }
  }
}