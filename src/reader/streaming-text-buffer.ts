/**
 * Streaming Text Buffer
 *
 * Accumulates streaming tokens into complete sentences for RSVP processing.
 * Based on the Python TextBuffer implementation.
 */

export interface StreamingTextBufferOptions {
  minBufferSize: number
  sentenceDelimiters: string
  aggressiveEarlyFlush?: boolean
}

export class StreamingTextBuffer {
  private buffer = ''
  private readonly minBufferSize: number
  private readonly sentenceDelimiters: string
  private readonly aggressiveEarlyFlush: boolean
  private tokenCount = 0

  constructor(options: StreamingTextBufferOptions = { minBufferSize: 50, sentenceDelimiters: '.!?' }) {
    this.minBufferSize = options.minBufferSize
    this.sentenceDelimiters = options.sentenceDelimiters
    this.aggressiveEarlyFlush = options.aggressiveEarlyFlush ?? false
  }

  /**
   * Add token to buffer and return complete sentence if available
   */
  addToken(token: string): string | null {
    this.buffer += token
    this.tokenCount++

    // For aggressive early flush mode, emit the first few small chunks quickly
    if (this.aggressiveEarlyFlush && this.tokenCount <= 3) {
      const spacePos = this.buffer.indexOf(' ')
      if (spacePos > 0 && this.buffer.slice(0, spacePos).trim().length >= 3) {
        const chunk = this.buffer.slice(0, spacePos).trim()
        this.buffer = this.buffer.slice(spacePos + 1).trim()
        console.log(`[StreamingTextBuffer] Early flush chunk ${this.tokenCount}: "${chunk}"`)
        return chunk
      }
    }

    // Search for last sentence delimiter regardless of buffer length
    let lastDelimiterPos = -1
    for (const delimiter of this.sentenceDelimiters) {
      const pos = this.buffer.lastIndexOf(delimiter)
      if (pos === -1) {
        continue
      }

      if (delimiter === '.' && (pos + 1 >= this.buffer.length || this.buffer[pos + 1] !== ' ')) {
        continue
      }

      if (pos > lastDelimiterPos) {
        lastDelimiterPos = pos
      }
    }

    if (lastDelimiterPos > 0) {
      // Extract the complete sentence(s)
      const sentence = this.buffer.slice(0, lastDelimiterPos + 1).trim()
      this.buffer = this.buffer.slice(lastDelimiterPos + 1).trim()
      return sentence
    }

    // No delimiter found; if buffer is large enough, flush up to the last whitespace
    if (this.buffer.length >= this.minBufferSize) {
      const lastSpace = this.buffer.lastIndexOf(' ')
      if (lastSpace > 0) {
        const chunk = this.buffer.slice(0, lastSpace).trim()
        this.buffer = this.buffer.slice(lastSpace + 1).trim()
        if (chunk.length > 0) return chunk
      }
      // If no space found but buffer is quite large, flush it anyway to avoid long delays
      if (this.buffer.length >= this.minBufferSize * 2) {
        const chunk = this.buffer.trim()
        this.buffer = ''
        if (chunk.length > 0) return chunk
      }
    }

    return null
  }

  /**
   * Return any remaining content in buffer
   */
  flush(): string | null {
    if (this.buffer.trim()) {
      const content = this.buffer.trim()
      this.buffer = ''
      return content
    }
    return null
  }

  /**
   * Get current buffer content (for debugging)
   */
  getCurrentBuffer(): string {
    return this.buffer
  }

  /**
   * Clear the buffer
   */
  clear(): void {
    this.buffer = ''
    this.tokenCount = 0
  }
}
