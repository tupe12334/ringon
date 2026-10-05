import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { stoneDimensions } from './catalog'
import { buildBand, buildGem, buildRing } from './geometry'
import { diameterToUs, euToDiameter, nearestSize, sizeOptions, usToDiameter } from './sizes'
import { ACCENTS, DEFAULT_SPEC, PROFILES, SETTINGS, STONE_SHAPES, sanitizeSpec, type RingSpec } from './spec'

describe('ring sizes', () => {
  it('matches published size charts', () => {
    expect(usToDiameter(7)).toBeCloseTo(17.32, 1)
    expect(euToDiameter(54)).toBeCloseTo(17.19, 1)
    expect(nearestSize('uk', usToDiameter(7)).label).toBe('N½')
    expect(nearestSize('jp', usToDiameter(7)).label).toBe('14')
    expect(diameterToUs(usToDiameter(5.5))).toBeCloseTo(5.5)
  })

  it('offers a sorted chart in every system', () => {
    for (const sys of ['us', 'eu', 'uk', 'jp'] as const) {
      const opts = sizeOptions(sys)
      expect(opts.length).toBeGreaterThan(10)
      opts.slice(1).forEach((o, i) => expect(o.diameterMm).toBeGreaterThan(opts[i].diameterMm))
    }
  })
})

describe('spec sanitising', () => {
  it('keeps a valid spec unchanged', () => {
    expect(sanitizeSpec(DEFAULT_SPEC)).toEqual(DEFAULT_SPEC)
  })

  it('clamps, rejects unknown values, and survives garbage', () => {
    const s = sanitizeSpec({
      innerDiameterMm: 999,
      band: { profile: 'evil', widthMm: -4, metal: 'platinum' },
      stone: { carat: 'big', customColor: 'red' },
      engraving: { text: 'x'.repeat(500) },
      name: '<b>hi</b>',
    })
    expect(s.innerDiameterMm).toBe(25)
    expect(s.band.profile).toBe(DEFAULT_SPEC.band.profile)
    expect(s.band.widthMm).toBe(1.2)
    expect(s.band.metal).toBe('platinum')
    expect(s.stone.carat).toBe(DEFAULT_SPEC.stone.carat)
    expect(s.stone.customColor).toBe(DEFAULT_SPEC.stone.customColor)
    expect(s.engraving.text).toHaveLength(40)
    expect(sanitizeSpec(null)).toEqual(DEFAULT_SPEC)
    expect(sanitizeSpec([1, 2])).toEqual(DEFAULT_SPEC)
  })
})

describe('stone conventions', () => {
  it('sizes a 1 ct round diamond at about 6.5 mm', () => {
    expect(stoneDimensions('round', 1, 'diamond').width).toBeCloseTo(6.5)
  })
  it('makes denser gems smaller for the same carat', () => {
    expect(stoneDimensions('round', 1, 'sapphire').width).toBeLessThan(6.5)
    expect(stoneDimensions('round', 1, 'emerald').width).toBeGreaterThan(6.5)
  })
  it('scales with the cube root of carat weight', () => {
    expect(stoneDimensions('round', 2, 'diamond').width).toBeCloseTo(6.5 * Math.cbrt(2))
  })
})

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

describe('gem geometry', () => {
  it.each(STONE_SHAPES)('%s faces point outward', (shape) => {
    const g = buildGem(shape, 7, 5)
    expect(finite(g)).toBe(true)
    const p = g.getAttribute('position')
    const n = g.getAttribute('normal')
    for (let i = 0; i < p.count; i += 3) {
      const c = new THREE.Vector3(
        (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3,
        (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3,
        (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3,
      )
      const normal = new THREE.Vector3(n.getX(i), n.getY(i), n.getZ(i))
      expect(normal.dot(c)).toBeGreaterThanOrEqual(-1e-6)
    }
    g.computeBoundingBox()
    expect(g.boundingBox!.max.y - g.boundingBox!.min.y).toBeCloseTo(7, 0)
    expect(g.boundingBox!.max.x - g.boundingBox!.min.x).toBeCloseTo(5, 0)
  })
})

describe('full ring', () => {
  const variants: RingSpec[] = []
  for (const setting of SETTINGS)
    for (const style of ACCENTS)
      for (const shape of ['round', 'pear', 'emerald'] as const)
        variants.push(
          sanitizeSpec({
            ...DEFAULT_SPEC,
            stone: { ...DEFAULT_SPEC.stone, setting, shape },
            halo: { ...DEFAULT_SPEC.halo, enabled: style === 'pave' },
            accents: { ...DEFAULT_SPEC.accents, style },
            engraving: { text: 'Forever', font: 'script' },
          }),
        )

  it.each(variants.map((v) => [`${v.stone.setting}/${v.accents.style}/${v.stone.shape}`, v]))('builds %s', (_, spec) => {
    const parts = buildRing(spec)
    expect(finite(parts.band)).toBe(true)
    if (parts.head) expect(finite(parts.head)).toBe(true)
    expect(parts.stones.length).toBeGreaterThanOrEqual(1)
    parts.stones.forEach((s) => expect(s.matrices.length).toBeGreaterThan(0))
    expect(parts.engraving).not.toBeNull()
    expect(parts.extent).toBeGreaterThan(spec.innerDiameterMm / 2)
  })

  it('builds a plain band with no stones', () => {
    const parts = buildRing({ ...DEFAULT_SPEC, stone: { ...DEFAULT_SPEC.stone, enabled: false } })
    expect(parts.stones).toHaveLength(0)
    expect(parts.head).toBeNull()
  })

  it('opens the band for a tension setting', () => {
    const parts = buildRing({ ...DEFAULT_SPEC, stone: { ...DEFAULT_SPEC.stone, setting: 'tension' } })
    const p = parts.band.getAttribute('position')
    for (let i = 0; i < p.count; i++) {
      const top = p.getZ(i) > 0 && Math.abs(p.getX(i)) < 0.5
      expect(top).toBe(false)
    }
  })
})

describe('accent controls', () => {
  const threeStone = (side: Partial<RingSpec['accents']['side']>, stone: Partial<RingSpec['stone']> = {}) =>
    buildRing({
      ...DEFAULT_SPEC,
      stone: { ...DEFAULT_SPEC.stone, ...stone },
      accents: { ...DEFAULT_SPEC.accents, style: 'three-stone', side: { ...DEFAULT_SPEC.accents.side, ...side } },
    })
  const sideStones = (parts: ReturnType<typeof buildRing>) => parts.stones.find((s) => s.key === 'side')!

  it('fills side-stone defaults into old specs and clamps bad values', () => {
    const old = sanitizeSpec({ accents: { style: 'three-stone', sideRatio: 0.5 } })
    expect(old.accents.side).toEqual(DEFAULT_SPEC.accents.side)
    const bad = sanitizeSpec({ accents: { rows: 9.7, side: { shape: 'blob', gapMm: -4, rotationDeg: 999 } } })
    expect(bad.accents.rows).toBe(3)
    expect(bad.accents.side.shape).toBe('match')
    expect(bad.accents.side.gapMm).toBe(0.1)
    expect(bad.accents.side.rotationDeg).toBe(180)
  })

  it('uses the chosen side shape, mirrored around the centre', () => {
    const parts = threeStone({ shape: 'pear', rotationDeg: 90, mirror: true })
    const [left, right] = sideStones(parts).matrices.map((m) => {
      const p = new THREE.Vector3(), q = new THREE.Quaternion()
      m.decompose(p, q, new THREE.Vector3())
      return { x: p.x, angle: new THREE.Euler().setFromQuaternion(q).z }
    })
    expect(left.x).toBeCloseTo(-right.x)
    expect(right.angle).toBeCloseTo(Math.PI / 2)
    expect(left.angle).toBeCloseTo(-Math.PI / 2)
    // Pear points +y; turned 90° the right stone's tip faces the centre (−x).
    const tip = new THREE.Vector3(0, 1, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), right.angle)
    expect(tip.x).toBeLessThan(-0.99)
  })

  it('keeps the gap to the centre stone when either stone turns', () => {
    for (const [centreRot, sideRot] of [[0, 0], [90, 0], [0, 90], [45, 30]]) {
      const gap = 0.6
      const parts = threeStone({ shape: 'emerald', rotationDeg: sideRot, gapMm: gap }, { shape: 'oval', rotationDeg: centreRot })
      const right = sideStones(parts).matrices[1]
      const centre = parts.stones.find((s) => s.key === 'center')!
      const box = (g: THREE.BufferGeometry, m: THREE.Matrix4) => new THREE.Box3().setFromObject(new THREE.Mesh(g.clone().applyMatrix4(m)))
      const c = box(centre.geometry, centre.matrices[0])
      const r = box(sideStones(parts).geometry, right)
      expect(r.min.x - c.max.x).toBeCloseTo(gap, 1)
    }
  })

  it('places more pavé with more coverage and rows', () => {
    const count = (accents: Partial<RingSpec['accents']>) =>
      buildRing({ ...DEFAULT_SPEC, band: { ...DEFAULT_SPEC.band, widthMm: 4 }, accents: { ...DEFAULT_SPEC.accents, style: 'pave', stoneMm: 1.2, ...accents } })
        .stones.find((s) => s.key === 'accents')!.matrices.length
    expect(count({ coverageDeg: 120 })).toBeGreaterThan(count({ coverageDeg: 60 }))
    expect(count({ rows: 3 })).toBe(count({ rows: 1 }) * 3)
    // Rows are capped by what fits across the band.
    expect(count({ rows: 3, stoneMm: 1.6 })).toBe(count({ rows: 2, stoneMm: 1.6 }))
  })

  it.each(['round', 'princess', 'baguette'] as const)('builds a %s channel', (meleeCut) => {
    const parts = buildRing({ ...DEFAULT_SPEC, accents: { ...DEFAULT_SPEC.accents, style: 'channel', meleeCut } })
    expect(finite(parts.stones.find((s) => s.key === 'accents')!.geometry)).toBe(true)
  })

  it.each(['prong-4', 'prong-6', 'bezel'] as const)('builds %s side stones', (setting) => {
    const parts = threeStone({ setting, shape: 'heart', rotationDeg: 45, mirror: false })
    expect(finite(parts.head!)).toBe(true)
  })
})
