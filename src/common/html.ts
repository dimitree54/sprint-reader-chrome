const CHAR_TO_ENTITY: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}

const NAMED_ENTITIES: Record<string, string> = {
  lt: '<',
  gt: '>',
  amp: '&',
  quot: '"',
  apos: "'"
}

export function encodeHtml (value: string): string {
  return value.replace(/[&<>"']/g, (char) => CHAR_TO_ENTITY[char] ?? char)
}

export function decodeHtml (value: string): string {
  return value.replace(/&(#?)(x?)(\w+);/gi, (_match, prefix: string, isHex: string, code: string) => {
    if (prefix === '') {
      const named = NAMED_ENTITIES[code]
      if (typeof named !== 'undefined') {
        return named
      }
      return _match
    }

    const base = isHex.toLowerCase() === 'x' ? 16 : 10
    const parsed = Number.parseInt(code, base)
    if (Number.isNaN(parsed)) {
      return _match
    }
    try {
      return String.fromCodePoint(parsed)
    } catch {
      return _match
    }
  })
}

export const escapeHtml = encodeHtml
