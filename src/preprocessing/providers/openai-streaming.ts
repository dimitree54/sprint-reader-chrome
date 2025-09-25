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
  (token: string): Promise<void>
}

/**
 * Process streaming lines without callback
 */
export function processStreamLines(buffer: string): { updatedBuffer: string; newText: string } {
  const { updatedBuffer, processableLines } = extractProcessableLines(buffer)
  let newText = ''

  for (const line of processableLines) {
    const token = extractDeltaFromLine(line)
    if (token) {
      newText += token
    }
  }

  return { updatedBuffer, newText }
}

/**
 * Process streaming lines with token callback
 */
export async function processStreamLinesWithCallback(
  buffer: string,
  onToken: StreamingTokenCallback
): Promise<{ updatedBuffer: string; newText: string }> {
  const { updatedBuffer, processableLines } = extractProcessableLines(buffer)
  let newText = ''

  for (const line of processableLines) {
    const token = extractDeltaFromLine(line)
    if (!token) continue

    newText += token
    // Await the token callback to ensure proper ordering and error propagation
    await onToken(token)
  }

  return { updatedBuffer, newText }
}

function extractProcessableLines(buffer: string): { updatedBuffer: string; processableLines: string[] } {
  const lines = buffer.split('\n')
  let updatedBuffer = lines.pop() || '' // Keep potentially incomplete last line in buffer
  const processableLines: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || !trimmed.startsWith('data: ')) {
      continue
    }

    if (trimmed !== 'data: [DONE]' && !/[}\]]$/.test(trimmed)) {
      // Line might be incomplete JSON; keep it in the buffer for the next chunk
      updatedBuffer = `${trimmed}\n${updatedBuffer}`.trim()
      continue
    }

    processableLines.push(trimmed)
  }

  return { updatedBuffer, processableLines }
}

function extractDeltaFromLine(line: string): string | null {
  if (line === 'data: [DONE]') {
    return null
  }

  const data = line.slice(6)

  try {
    const event: StreamingEvent = JSON.parse(data)
    if (event.type === 'response.output_text.delta') {
      return (event as ResponseOutputTextDelta).delta
    }
  } catch {
    // Skip invalid JSON lines
    return null
  }

  return null
}
