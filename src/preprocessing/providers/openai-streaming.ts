/**
 * OpenAI Streaming Response Processing
 *
 * Extracted from openai.ts to reduce file size
 */

// Streaming event interfaces
export interface ResponseOutputTextDelta {
  type: 'response.output_text.delta'
  delta: string
}

export interface ResponseCompleted {
  type: 'response.completed'
}

export interface ResponseFailed {
  type: 'response.failed'
}

export type StreamingEvent = ResponseOutputTextDelta | ResponseCompleted | ResponseFailed | { type: string }

export interface StreamingTokenCallback {
  (token: string): void
}

/**
 * Process streaming lines without callback
 */
export function processStreamLines(buffer: string): { updatedBuffer: string; newText: string } {
  const lines = buffer.split('\n')
  const updatedBuffer = lines.pop() || '' // Keep incomplete line in buffer
  let newText = ''

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || !trimmed.startsWith('data: ')) continue

    const data = trimmed.slice(6) // Remove 'data: ' prefix
    if (data === '[DONE]') continue

    try {
      const event: StreamingEvent = JSON.parse(data)
      if (event.type === 'response.output_text.delta') {
        const deltaEvent = event as ResponseOutputTextDelta
        newText += deltaEvent.delta
      }
    } catch {
      // Skip invalid JSON lines
      continue
    }
  }

  return { updatedBuffer, newText }
}

/**
 * Process streaming lines with token callback
 */
export function processStreamLinesWithCallback(
  buffer: string,
  onToken: StreamingTokenCallback
): { updatedBuffer: string; newText: string } {
  const lines = buffer.split('\n')
  const updatedBuffer = lines.pop() || '' // Keep incomplete line in buffer
  let newText = ''

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || !trimmed.startsWith('data: ')) continue

    const data = trimmed.slice(6) // Remove 'data: ' prefix
    if (data === '[DONE]') continue

    try {
      const event: StreamingEvent = JSON.parse(data)
      if (event.type === 'response.output_text.delta') {
        const deltaEvent = event as ResponseOutputTextDelta
        const token = deltaEvent.delta
        newText += token
        // Call the token callback immediately
        onToken(token)
      }
    } catch {
      // Skip invalid JSON lines
      continue
    }
  }

  return { updatedBuffer, newText }
}