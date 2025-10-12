import { describe, expect, it } from 'vitest'

import { StreamingTextBuffer } from './streaming-text-buffer'

describe('StreamingTextBuffer', () => {
  it('does not flush when period lacks trailing space', () => {
    const buffer = new StreamingTextBuffer()

    expect(buffer.addToken('This is ~1.6x')).toBeNull()
    expect(buffer.addToken('.')).toBeNull()

    // Period should only flush after a trailing space arrives
    const chunk = buffer.addToken(' ')
    expect(chunk).toBe('This is ~1.6x.')
  })

  it('flushes on period followed by space in same token', () => {
    const buffer = new StreamingTextBuffer()

    const chunk = buffer.addToken('Done. Next part')

    expect(chunk).toBe('Done.')
    expect(buffer.getCurrentBuffer()).toBe('Next part')
  })
})

