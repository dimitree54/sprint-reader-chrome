/**
 * Streaming Text Buffer
 *
 * Accumulates streaming tokens into complete sentences for RSVP processing.
 * Based on the Python TextBuffer implementation.
 */

export interface StreamingTextBufferOptions {
  minBufferSize: number
  sentenceDelimiters: string
}

export class StreamingTextBuffer {
  private buffer = ''
  private readonly minBufferSize: number
  private readonly sentenceDelimiters: string

  constructor(options: StreamingTextBufferOptions = { minBufferSize: 50, sentenceDelimiters: '.!?' }) {
    this.minBufferSize = options.minBufferSize
    this.sentenceDelimiters = options.sentenceDelimiters
  }

  /**
   * Add token to buffer and return complete sentence if available
   */
  addToken(token: string): string | null {
    this.buffer += token

    // Search for last sentence delimiter regardless of buffer length
    let lastDelimiterPos = -1
    for (const delimiter of this.sentenceDelimiters) {
      const pos = this.buffer.lastIndexOf(delimiter)
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

    // No delimiter found; fall back to min buffer guard for partial flush decisions
    if (this.buffer.length >= this.minBufferSize) {
      return null
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
  }
}
