import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildBand } from './band'
import { buildRing } from './geometry'
import { DEFAULT_SPEC, PROFILES, type RingSpec } from './spec'

const finite = (g: THREE.BufferGeometry) => {
  const arr = g.getAttribute('position').array as Float32Array
  return arr.every(Number.isFinite)
}

describe('band geometry', () => {
  it.each(PROFILES)('%s band has the right inner diameter and width', (profile) => {
    const g = buildBand({
      innerDiameterMm: 17,
      profile,
      widthMm: 4,
      thicknessMm: 1.8,
      comfortFit: true,
      taper: 1,
      hammered: false,
    })
    expect(finite(g)).toBe(true)
    g.computeBoundingBox()
    const box = g.boundingBox!
    expect(box.max.y - box.min.y).toBeCloseTo(4, 1)
    expect(box.max.z).toBeCloseTo(8.5 + 1.8, 1)
    // No vertex inside the finger hole.
    const p = g.getAttribute('position')
    let minR = Infinity
    for (let i = 0; i < p.count; i++) minR = Math.min(minR, Math.hypot(p.getX(i), p.getZ(i)))
    expect(minR).toBeGreaterThanOrEqual(8.5 - 1e-3)
  })

  it('points outer-surface normals away from the finger', () => {
    const g = buildBand({ innerDiameterMm: 17, profile: 'flat', widthMm: 4, thicknessMm: 2, comfortFit: false, taper: 1, hammered: false })
    const p = g.getAttribute('position')
    const n = g.getAttribute('normal')
    let checked = 0
    for (let i = 0; i < p.count; i++) {
      const r = Math.hypot(p.getX(i), p.getZ(i))
      if (Math.abs(p.getY(i)) < 0.5 && r > 10.4) {
        const outward = (p.getX(i) * n.getX(i) + p.getZ(i) * n.getZ(i)) / r
        expect(outward).toBeGreaterThan(0.9)
        checked++
      }
    }
    expect(checked).toBeGreaterThan(10)
  })

  it('tapers the shank under the finger', () => {
    const g = buildBand({ innerDiameterMm: 17, profile: 'court', widthMm: 4, thicknessMm: 1.8, comfortFit: true, taper: 0.5, hammered: false })
    const p = g.getAttribute('position')
    let topW = 0
    let bottomW = 0
    for (let i = 0; i < p.count; i++) {
      if (p.getZ(i) > 8) topW = Math.max(topW, Math.abs(p.getY(i)))
      if (p.getZ(i) < -8) bottomW = Math.max(bottomW, Math.abs(p.getY(i)))
    }
    expect(bottomW / topW).toBeCloseTo(0.5, 1)
  })
})

describe('inlays and liners', () => {
  /** Min/max y (along the finger) of a surface. */
  const ySpan = (g: THREE.BufferGeometry) => {
    g.computeBoundingBox()
    return [g.boundingBox!.min.y, g.boundingBox!.max.y]
  }
  const banded = (band: Partial<RingSpec['band']>) =>
    buildRing({ ...DEFAULT_SPEC, stone: { ...DEFAULT_SPEC.stone, enabled: false }, band: { ...DEFAULT_SPEC.band, widthMm: 8, taper: 1, ...band } })

  it('cuts an inlay strip out of the outer surface, off centre when asked', () => {
    const plain = banded({})
    expect(plain.inlay).toBeNull()
    const parts = banded({ inlay: 'koa', inlayWidth: 0.25, inlayOffset: -0.125 })
    const [lo, hi] = ySpan(parts.inlay!)
    expect(lo).toBeCloseTo(-2, 5)
    expect(hi).toBeCloseTo(0, 5)
    // The band keeps the rest, with no surface lost or doubled.
    const count = (g: THREE.BufferGeometry) => g.getAttribute('position').count
    // Both cuts here land on profile samples (y = 4·sin(−π/6) = −2 and 0), the exact-hit path.
    expect(count(parts.band) + count(parts.inlay!)).toBe(count(plain.band))
    expect(finite(parts.inlay!)).toBe(true)
  })

  it('lets a second strip sit inside the first (pinstripe)', () => {
    const parts = banded({ inlay: 'koa', inlayWidth: 0.7, inlay2: 'turquoise', inlay2Width: 0.15, inlay2Offset: 0 })
    const [lo2, hi2] = ySpan(parts.inlay2!)
    expect(lo2).toBeCloseTo(-0.6, 5)
    expect(hi2).toBeCloseTo(0.6, 5)
    // The koa is split in two around the stripe: none of it lies inside the stripe.
    const p = parts.inlay!.getAttribute('position')
    for (let i = 0; i < p.count; i++) expect(Math.abs(p.getY(i))).toBeGreaterThanOrEqual(0.6 - 1e-5)
    expect(ySpan(parts.inlay!)).toEqual([expect.closeTo(-2.8, 5), expect.closeTo(2.8, 5)])
  })

  it('ignores a second strip without a first', () => {
    const parts = banded({ inlay2: 'turquoise' })
    expect(parts.inlay).toBeNull()
    expect(parts.inlay2).toBeNull()
  })

  it('lines the inside and shows the liner on the side walls', () => {
    const parts = banded({ metal: 'koa', liner: 'titanium' })
    const innerR = DEFAULT_SPEC.innerDiameterMm / 2
    const p = parts.liner!.getAttribute('position')
    let maxR = 0
    for (let i = 0; i < p.count; i++) maxR = Math.max(maxR, Math.hypot(p.getX(i), p.getZ(i)))
    expect(maxR).toBeLessThan(innerR + DEFAULT_SPEC.band.thicknessMm * 0.6)
    expect(maxR).toBeGreaterThan(innerR + 0.1)
  })
})
