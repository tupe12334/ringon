// Designs travel as JSON: in a file, or base64url-encoded in the URL hash (#d=...).

import { sanitizeSpec, type RingSpec } from '../ring/spec'

const toBase64Url = (s: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(s)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

const fromBase64Url = (s: string) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

export const encodeSpec = (spec: RingSpec) => toBase64Url(JSON.stringify(spec))

/** Null when the value is not a decodable design. */
export function decodeSpec(encoded: string): RingSpec | null {
  try {
    return sanitizeSpec(JSON.parse(fromBase64Url(encoded)))
  } catch {
    return null
  }
}

export function shareUrl(spec: RingSpec, base = location.href) {
  const url = new URL(base)
  url.hash = `d=${encodeSpec(spec)}`
  return url.toString()
}

export function specFromHash(hash = location.hash): RingSpec | null {
  const m = /[#&]d=([A-Za-z0-9_-]+)/.exec(hash)
  return m ? decodeSpec(m[1]) : null
}

/** Parse an exported file: a single design or a list of designs. */
export function parseImport(text: string): RingSpec[] {
  const data: unknown = JSON.parse(text)
  const list = Array.isArray(data) ? data : [data]
  return list.slice(0, 200).map(sanitizeSpec)
}
