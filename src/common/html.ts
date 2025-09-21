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
  return value.replace(/&(#?)(x?)(\w+);/g, (_match, prefix: string, isHex: string, code: string) => {
    if (prefix === '') {
      const named = NAMED_ENTITIES[code]
      if (typeof named !== 'undefined') {
        return named
      }
      return code
    }

    const base = isHex === 'x' ? 16 : 10
    const parsed = Number.parseInt(code, base)
    if (Number.isNaN(parsed)) {
      return code
    }
    try {
      return String.fromCodePoint(parsed)
    } catch {
      return code
    }
  })
}

export const escapeHtml = encodeHtml
