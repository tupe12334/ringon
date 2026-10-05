// Designs travel as JSON: in a file, or in the URL hash. The address bar always carries the design
// on screen (#r=..., #try&r=... in the camera view), so it is a share link.
// #r= is deflated JSON, base64url; #d= (older links) is plain JSON, base64url.

import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate'
import { sanitizeSpec, type RingSpec } from '../ring/spec'

const toBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

const fromBase64Url = (s: string) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0))
}

export const encodeSpec = (spec: RingSpec) => toBase64Url(deflateSync(strToU8(JSON.stringify(spec)), { level: 9 }))

/** Null when the value is not a decodable design. `plain` reads an older #d= link. */
export function decodeSpec(encoded: string, plain = false): RingSpec | null {
  try {
    const bytes = fromBase64Url(encoded)
    return sanitizeSpec(JSON.parse(strFromU8(plain ? bytes : inflateSync(bytes))))
  } catch {
    return null
  }
}

export const isTryOnHash = (hash = location.hash) => /^#try(&|$)/.test(hash)

export const specHash = (spec: RingSpec, tryOn = false) => `#${tryOn ? 'try&' : ''}r=${encodeSpec(spec)}`

export function shareUrl(spec: RingSpec, base = location.href) {
  const url = new URL(base)
  url.hash = specHash(spec)
  return url.toString()
}

export function specFromHash(hash = location.hash): RingSpec | null {
  const m = /[#&]([rd])=([A-Za-z0-9_-]+)/.exec(hash)
  return m ? decodeSpec(m[2], m[1] === 'd') : null
}

/** Parse an exported file: a single design or a list of designs. */
export function parseImport(text: string): RingSpec[] {
  const data: unknown = JSON.parse(text)
  const list = Array.isArray(data) ? data : [data]
  return list.slice(0, 200).map(sanitizeSpec)
}
