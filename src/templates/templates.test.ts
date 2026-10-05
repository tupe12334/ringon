import { describe, expect, it } from 'vitest'
import { buildRing } from '../ring/geometry'
import { DEFAULT_SPEC, sanitizeSpec } from '../ring/spec'
import { BUILTIN_TEMPLATES } from './builtin'
import { decodeSpec, encodeSpec, isTryOnHash, parseImport, shareUrl, specFromHash, specHash } from './share'

describe('built-in templates', () => {
  it.each(BUILTIN_TEMPLATES.map((t) => [t.name, t]))('%s is valid and builds', (_, t) => {
    expect(sanitizeSpec(t)).toEqual(t)
    expect(() => buildRing(t)).not.toThrow()
  })
  it('have unique names', () => {
    expect(new Set(BUILTIN_TEMPLATES.map((t) => t.name)).size).toBe(BUILTIN_TEMPLATES.length)
  })
})

describe('sharing', () => {
  it('round-trips through the URL hash, including non-ASCII engraving', () => {
    const spec = { ...DEFAULT_SPEC, engraving: { text: 'לנצח ♥ toujours', font: 'script' as const } }
    const url = shareUrl(spec, 'https://example.com/ringon/')
    expect(specFromHash(new URL(url).hash)).toEqual(spec)
    expect(decodeSpec(encodeSpec(spec))).toEqual(spec)
  })
  it('compresses: a design fits in a short link', () => {
    for (const t of BUILTIN_TEMPLATES) expect((specHash(t)).length).toBeLessThan(600)
  })
  it('opens older plain #d= links', () => {
    expect(specFromHash(`#d=${btoa(JSON.stringify(DEFAULT_SPEC)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`)).toEqual(DEFAULT_SPEC)
  })
  it('keeps the design in the camera view hash', () => {
    const hash = specHash(DEFAULT_SPEC, true)
    expect(isTryOnHash(hash)).toBe(true)
    expect(isTryOnHash(specHash(DEFAULT_SPEC))).toBe(false)
    expect(isTryOnHash('#try')).toBe(true)
    expect(specFromHash(hash)).toEqual(DEFAULT_SPEC)
  })
  it('rejects garbage', () => {
    expect(decodeSpec('!!!')).toBeNull()
    expect(decodeSpec('abcd')).toBeNull()
    expect(specFromHash('#nothing')).toBeNull()
  })
  it('imports one design or a list, sanitising each', () => {
    expect(parseImport(JSON.stringify(DEFAULT_SPEC))).toEqual([DEFAULT_SPEC])
    const list = parseImport(JSON.stringify([{ band: { widthMm: 100 } }, DEFAULT_SPEC]))
    expect(list).toHaveLength(2)
    expect(list[0].band.widthMm).toBe(12)
    expect(() => parseImport('not json')).toThrow()
  })
})
