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
  const processableLines: string[] = []
  let remainingBuffer = buffer

  while (true) {
    // Look for the next complete data line
    const dataStart = remainingBuffer.indexOf('data: ')
    if (dataStart === -1) {
      // No more data lines, return remaining buffer
      return { updatedBuffer: remainingBuffer, processableLines }
    }

    // Find the end of this data line (next newline)
    const lineStart = dataStart
    const lineEnd = remainingBuffer.indexOf('\n', lineStart)

    if (lineEnd === -1) {
      // No complete line found, return remaining buffer
      return { updatedBuffer: remainingBuffer, processableLines }
    }

    // Extract the complete line
    const line = remainingBuffer.slice(lineStart, lineEnd).trim()

    // Handle [DONE] marker
    if (line === 'data: [DONE]') {
      processableLines.push(line)
      remainingBuffer = remainingBuffer.slice(lineEnd + 1)
      continue
    }

    // Check if this is a valid data line with complete JSON
    if (line.startsWith('data: ')) {
      const jsonStr = line.substring(6) // Remove 'data: ' prefix
      try {
        JSON.parse(jsonStr)
        // JSON is valid and complete
        processableLines.push(line)
        remainingBuffer = remainingBuffer.slice(lineEnd + 1)
      } catch (e) {
        // JSON is incomplete, but we found a newline - this might be split JSON
        // Keep this line in buffer and wait for more data
        return { updatedBuffer: remainingBuffer, processableLines }
      }
    } else {
      // Not a data line, skip it
      remainingBuffer = remainingBuffer.slice(lineEnd + 1)
    }
  }
}

function extractDeltaFromLine(line: string): string | null {
  if (line === 'data: [DONE]') {
    return null
  }

  const data = line.slice(6)

  try {
    const event: any = JSON.parse(data)
    // OpenAI Responses API streaming event
    if (event && typeof event === 'object' && event.type === 'response.output_text.delta') {
      return (event as ResponseOutputTextDelta).delta
    }
    // OpenAI Chat Completions streaming chunk
    if (event && typeof event === 'object' && event.object === 'chat.completion.chunk') {
      const delta = event.choices?.[0]?.delta
      const content: unknown = delta?.content
      if (typeof content === 'string' && content.length > 0) {
        return content
      }
    }
  } catch {
    // Skip invalid JSON lines
    return null
  }

  return null
}
