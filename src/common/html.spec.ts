import { describe, it, expect } from 'vitest'
import { encodeHtml, decodeHtml } from './html'

const FOO_BAR = 'foo bar'
const HELLO_WORLD = 'Hello World'

describe('encodeHtml', () => {
  it('should encode ampersand', () => {
    expect(encodeHtml(`${FOO_BAR.replace(' ', ' & ')}`)).toBe('foo &amp; bar')
  })

  it('should encode less than', () => {
    expect(encodeHtml(`${FOO_BAR.replace(' ', ' < ')}`)).toBe('foo &lt; bar')
  })

  it('should encode greater than', () => {
    expect(encodeHtml(`${FOO_BAR.replace(' ', ' > ')}`)).toBe('foo &gt; bar')
  })

  it('should encode double quote', () => {
    expect(encodeHtml('foo "bar" baz')).toBe('foo &quot;bar&quot; baz')
  })

  it('should encode single quote', () => {
    expect(encodeHtml("foo 'bar' baz")).toBe('foo &#39;bar&#39; baz')
  })

  it('should encode multiple characters', () => {
    expect(encodeHtml('<div class="test">A & B</div>')).toBe('&lt;div class=&quot;test&quot;&gt;A &amp; B&lt;/div&gt;')
  })

  it('should leave normal text unchanged', () => {
    expect(encodeHtml(HELLO_WORLD)).toBe(HELLO_WORLD)
  })

  it('should handle empty string', () => {
    expect(encodeHtml('')).toBe('')
  })
})

describe('decodeHtml', () => {
  it('should decode named ampersand entity', () => {
    expect(decodeHtml(`${FOO_BAR.replace(' ', ' &amp; ')}`)).toBe('foo & bar')
  })

  it('should decode named less than entity', () => {
    expect(decodeHtml(`${FOO_BAR.replace(' ', ' &lt; ')}`)).toBe('foo < bar')
  })

  it('should decode named greater than entity', () => {
    expect(decodeHtml(`${FOO_BAR.replace(' ', ' &gt; ')}`)).toBe('foo > bar')
  })

  it('should decode named double quote entity', () => {
    expect(decodeHtml('foo &quot;bar&quot; baz')).toBe('foo "bar" baz')
  })

  it('should decode named single quote entity', () => {
    expect(decodeHtml('foo &apos;bar&apos; baz')).toBe("foo 'bar' baz")
  })

  it('should decode numeric decimal entity', () => {
    expect(decodeHtml('&#65;')).toBe('A')
  })

  it('should decode numeric hexadecimal entity', () => {
    expect(decodeHtml('&#x41;')).toBe('A')
  })

  it('should decode Unicode codepoints', () => {
    expect(decodeHtml('&#8364;')).toBe('€') // Euro symbol
    expect(decodeHtml('&#x1F600;')).toBe('😀') // Grinning face emoji
  })

  it('should decode multiple entities', () => {
    expect(decodeHtml('&lt;div class=&quot;test&quot;&gt;A &amp; B&lt;/div&gt;')).toBe('<div class="test">A & B</div>')
  })

  it('should leave unknown entities unchanged', () => {
    expect(decodeHtml('&unknown;')).toBe('&unknown;')
  })

  it('should handle invalid numeric entities', () => {
    expect(decodeHtml('&#invalid;')).toBe('&#invalid;')
  })

  it('should leave normal text unchanged', () => {
    expect(decodeHtml(HELLO_WORLD)).toBe(HELLO_WORLD)
  })

  it('should handle empty string', () => {
    expect(decodeHtml('')).toBe('')
  })
})