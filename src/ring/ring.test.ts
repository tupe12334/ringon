import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { stoneDimensions } from './catalog'
import { buildBand, buildGem, buildRing, polygonGap } from './geometry'
import { outline } from './outline'
import { diameterToUs, euToDiameter, nearestSize, sizeOptions, usToDiameter } from './sizes'
import { ACCENTS, BEZEL_EDGES, DEFAULT_SPEC, HALF_BEZEL_WALLS, PROFILES, SETTINGS, STONE_SHAPES, sanitizeSpec, type RingSpec } from './spec'

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
  type Parts = ReturnType<typeof buildRing>
  const ring = (side: Partial<RingSpec['accents']['side']>, stone: Partial<RingSpec['stone']> = {}, rest: Partial<RingSpec> = {}) =>
    buildRing({
      ...DEFAULT_SPEC,
      ...rest,
      stone: { ...DEFAULT_SPEC.stone, ...stone },
      accents: { ...DEFAULT_SPEC.accents, ...rest.accents, side: { ...DEFAULT_SPEC.accents.side, count: 1, ...side } },
    })
  const stone = (parts: Parts, key: string) => parts.stones.find((s) => s.key === key)!
  /** Girdle points of a placed stone, in ring space. */
  const girdle = (parts: Parts, key: string) => {
    const st = stone(parts, key)
    const pos = st.geometry.getAttribute('position')
    const pts: THREE.Vector3[] = []
    // The girdle is a thin band (1.5% of the stone width) around z = 0.
    for (let i = 0; i < pos.count; i++) if (Math.abs(pos.getZ(i)) < 0.25) pts.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(st.matrices[0]))
    expect(pts.length).toBeGreaterThan(8)
    return pts
  }
  // Seen from above (the side stones sit lower than the centre).
  const gapBetween = (a: THREE.Vector3[], b: THREE.Vector3[], topDown = true) => {
    let best = Infinity
    for (const p of a) for (const q of b) best = Math.min(best, topDown ? Math.hypot(p.x - q.x, p.y - q.y) : p.distanceTo(q))
    return best
  }
  const centreOf = (parts: Parts, key: string) => new THREE.Vector3().setFromMatrixPosition(stone(parts, key).matrices[0])

  it('migrates old three-stone designs and clamps bad values', () => {
    const old = sanitizeSpec({ accents: { style: 'three-stone', sideRatio: 0.5, gem: 'ruby' } })
    expect(old.accents.style).toBe('none')
    expect(old.accents.side).toMatchObject({ count: 1, ratio: 0.5, gem: 'ruby' })
    expect(sanitizeSpec({ accents: { style: 'pave', gem: 'ruby' } }).accents.side).toEqual(DEFAULT_SPEC.accents.side)
    const bad = sanitizeSpec({ accents: { rows: 9.7, side: { shape: 'blob', gapMm: -4, rotationDeg: 999, count: 7 } } })
    expect(bad.accents.rows).toBe(3)
    expect(bad.accents.side).toMatchObject({ shape: 'match', gapMm: 0.1, rotationDeg: -81, count: 3 })
  })

  it('mirrors directional side stones around the centre', () => {
    const parts = ring({ shape: 'pear', rotationDeg: 90, mirror: true })
    const angle = (key: string) => {
      const q = new THREE.Quaternion()
      stone(parts, key).matrices[0].decompose(new THREE.Vector3(), q, new THREE.Vector3())
      return q
    }
    expect(centreOf(parts, 'side--1-0').x).toBeCloseTo(-centreOf(parts, 'side-1-0').x)
    // Pear points +y; the right stone's tip faces the centre (−x), the left one's +x.
    expect(new THREE.Vector3(0, 1, 0).applyQuaternion(angle('side-1-0')).x).toBeLessThan(-0.85)
    expect(new THREE.Vector3(0, 1, 0).applyQuaternion(angle('side--1-0')).x).toBeGreaterThan(0.85)
  })

  it.each([
    [0, 0, 'emerald'],
    [90, 0, 'emerald'],
    [45, 30, 'emerald'],
    [0, 50, 'pear'],
    [30, -120, 'heart'],
    [0, 90, 'trillion'],
    [0, -90, 'tapered-baguette'],
  ] as const)('keeps the gap with centre at %i°, side at %i° (%s)', (centreRot, sideRot, shape) => {
    const gap = 0.6
    const parts = ring({ shape, rotationDeg: sideRot, gapMm: gap }, { shape: 'pear', rotationDeg: centreRot })
    // Girdle points are samples of the outline, so the measured gap can only come out a bit wide.
    const measured = gapBetween(girdle(parts, 'center'), girdle(parts, 'side-1-0'))
    expect(measured).toBeGreaterThan(gap - 0.05)
    expect(measured).toBeLessThan(gap + 0.4)
  })

  it('tucks side stones along the finger without overlapping', () => {
    const base = { shape: 'pear', rotationDeg: 90, gapMm: 0.2 } as const
    const inLine = ring(base, { shape: 'pear' })
    // The pear's widest point is a little below its middle; well past it the round end curves away.
    const tucked = ring({ ...base, offsetMm: -4.5 }, { shape: 'pear' })
    expect(centreOf(tucked, 'side-1-0').x).toBeLessThan(centreOf(inLine, 'side-1-0').x - 0.3)
    // Side stones stay over the band; the centre moves the other way.
    expect(centreOf(tucked, 'side-1-0').y).toBeCloseTo(0)
    expect(centreOf(tucked, 'center').y).toBeCloseTo(4.5)
    expect(gapBetween(girdle(tucked, 'center'), girdle(tucked, 'side-1-0'))).toBeGreaterThan(0.15)
  })

  it.each([
    ['side stones moved along the finger', { offsetMm: -4.5 }],
    ['a diagonal toi et moi', { layout: 'toi-et-moi', offsetMm: 6 }],
  ] as const)('anchors the prongs of %s on the band', (_, side) => {
    const parts = ring({ shape: 'pear', rotationDeg: 90, ...side }, { shape: 'pear', rotationDeg: 30 })
    const pos = parts.head!.getAttribute('position')
    const ro = DEFAULT_SPEC.innerDiameterMm / 2 + DEFAULT_SPEC.band.thicknessMm
    for (let i = 0; i < pos.count; i++)
      if (Math.hypot(pos.getX(i), pos.getZ(i)) < ro) expect(Math.abs(pos.getY(i))).toBeLessThan(DEFAULT_SPEC.band.widthMm / 2 + 2)
  })

  /** Every pair of side and centre stones, girdle to girdle (in 3D: outer stones sit down the side of the ring). */
  const allApart = (parts: Parts, gap: number) => {
    const keys = parts.stones.filter((s) => s.key === 'center' || s.key.startsWith('side-')).map((s) => s.key)
    for (const [i, a] of keys.entries()) for (const b of keys.slice(i + 1)) expect(gapBetween(girdle(parts, a), girdle(parts, b), false), `${a} vs ${b}`).toBeGreaterThan(gap - 0.05)
  }

  it('keeps left and right stones apart when far along the finger', () => {
    allApart(ring({ offsetMm: 8 }, { carat: 0.5 }), 0.4)
  })

  it('keeps big seven-stone rows apart past the side of the ring', () => {
    allApart(ring({ count: 3, ratio: 1.2, graduation: 1, shape: 'oval', rotationDeg: 90 }, { shape: 'oval', carat: 3, rotationDeg: 90 }), 0.4)
  })

  it('starts band stones clear of a turned centre stone', () => {
    const parts = buildRing({ ...DEFAULT_SPEC, stone: { ...DEFAULT_SPEC.stone, shape: 'marquise', rotationDeg: 90 }, accents: { ...DEFAULT_SPEC.accents, style: 'pave' } })
    const first = Math.min(...stone(parts, 'accents').matrices.map((m) => Math.abs(new THREE.Vector3().setFromMatrixPosition(m).x)))
    const reach = Math.max(...girdle(parts, 'center').map((p) => Math.abs(p.x)))
    expect(first).toBeGreaterThan(reach)
  })

  it('places graduated five- and seven-stone rows along the band', () => {
    const parts = ring({ count: 3, graduation: 0.8 })
    const keys = [0, 1, 2].map((k) => `side-1-${k}`)
    const xs = keys.map((k) => centreOf(parts, k).x)
    expect(xs[1]).toBeGreaterThan(xs[0])
    expect(xs[2]).toBeGreaterThan(xs[1])
    // Each stone further out is smaller and follows the curve of the band (lower).
    const size = (k: string) => new THREE.Box3().setFromBufferAttribute(stone(parts, k).geometry.getAttribute('position') as THREE.BufferAttribute).getSize(new THREE.Vector3()).x
    expect(size(keys[1])).toBeCloseTo(size(keys[0]) * 0.8, 1)
    expect(centreOf(parts, keys[2]).z).toBeLessThan(centreOf(parts, keys[0]).z)
    expect(parts.stones.filter((s) => s.key.startsWith('side-'))).toHaveLength(6)
  })

  it('sets a toi et moi pair centred on the band', () => {
    const parts = ring({ layout: 'toi-et-moi', shape: 'pear', ratio: 1, offsetMm: 2 }, { shape: 'oval' })
    expect(parts.stones.filter((s) => s.key.startsWith('side-'))).toHaveLength(1)
    const c = centreOf(parts, 'center')
    const p = centreOf(parts, 'side-1-0')
    expect(c.x).toBeCloseTo(-p.x, 0)
    expect(p.y - c.y).toBeCloseTo(2)
  })

  it('keeps band stones clear of the side stones', () => {
    const parts = ring({ count: 2 }, {}, { accents: { ...DEFAULT_SPEC.accents, style: 'pave' } })
    const firstPave = Math.min(...stone(parts, 'accents').matrices.map((m) => Math.atan2(new THREE.Vector3().setFromMatrixPosition(m).x, new THREE.Vector3().setFromMatrixPosition(m).z)).filter((t) => t > 0))
    const lastSide = Math.atan2(centreOf(parts, 'side-1-1').x, centreOf(parts, 'side-1-1').z)
    expect(firstPave).toBeGreaterThan(lastSide)
  })

  it('places more band stones with more coverage and rows, fewer with spacing', () => {
    const count = (accents: Partial<RingSpec['accents']>) =>
      buildRing({ ...DEFAULT_SPEC, band: { ...DEFAULT_SPEC.band, widthMm: 4 }, accents: { ...DEFAULT_SPEC.accents, style: 'pave', stoneMm: 1.2, ...accents } })
        .stones.find((s) => s.key === 'accents')!.matrices.length
    expect(count({ coverageDeg: 120 })).toBeGreaterThan(count({ coverageDeg: 60 }))
    expect(count({ rows: 3 })).toBe(count({ rows: 1 }) * 3)
    // Old designs (no rows field) keep the automatic second row on a wide pavé band.
    expect(count({ rows: 0 })).toBe(count({ rows: 2 }))
    // Coverage below the head clearance still places stones.
    expect(count({ coverageDeg: 15 })).toBeGreaterThan(0)
    // Rows are capped by what fits across the band.
    expect(count({ rows: 3, stoneMm: 1.6 })).toBe(count({ rows: 2, stoneMm: 1.6 }))
    expect(count({ coverageDeg: 120, spacingMm: 4 })).toBeLessThan(count({ coverageDeg: 120 }) / 2)
  })

  it.each(STONE_SHAPES)('builds a bezel-set eternity of %s stones', (meleeCut) => {
    const parts = buildRing({ ...DEFAULT_SPEC, stone: { ...DEFAULT_SPEC.stone, enabled: false }, accents: { ...DEFAULT_SPEC.accents, style: 'eternity', meleeCut, bezelSet: true, stoneMm: 2.5 } })
    expect(finite(stone(parts, 'accents').geometry)).toBe(true)
    expect(finite(parts.head!)).toBe(true)
  })

  it('clears a halo and bezel walls', () => {
    const x = (p: Parts) => centreOf(p, 'side-1-0').x
    const bare = ring({})
    const halo = ring({}, {}, { halo: { ...DEFAULT_SPEC.halo, enabled: true } })
    const double = ring({}, {}, { halo: { ...DEFAULT_SPEC.halo, enabled: true, rows: 2 } })
    const hidden = ring({}, {}, { halo: { ...DEFAULT_SPEC.halo, enabled: true, style: 'hidden' } })
    expect(x(halo)).toBeGreaterThan(x(bare) + DEFAULT_SPEC.halo.stoneMm)
    expect(x(double)).toBeGreaterThan(x(halo) + DEFAULT_SPEC.halo.stoneMm)
    expect(x(hidden)).toBeCloseTo(x(bare), 1)
    expect(x(ring({ setting: 'bezel' }))).toBeGreaterThan(x(bare) + DEFAULT_SPEC.stone.bezel.wallMm * 0.8)
  })

  it.each(['prong-4', 'prong-6', 'bezel'] as const)('builds %s side stones', (setting) => {
    const parts = ring({ setting, shape: 'heart', rotationDeg: 45, mirror: false })
    expect(finite(parts.head!)).toBe(true)
  })

  it.each(BEZEL_EDGES.flatMap((edge) => HALF_BEZEL_WALLS.map((walls) => [edge, walls] as const)))('builds a %s half bezel with walls on the %s', (edge, halfWalls) => {
    const parts = ring({ count: 0 }, { setting: 'half-bezel', bezel: { ...DEFAULT_SPEC.stone.bezel, edge, halfWalls } })
    expect(finite(parts.head!)).toBe(true)
  })

  it('makes a chunkier bezel wider', () => {
    const width = (wallMm: number) =>
      new THREE.Box3().setFromBufferAttribute(ring({ count: 0 }, { setting: 'bezel', bezel: { ...DEFAULT_SPEC.stone.bezel, wallMm } }).head!.getAttribute('position') as THREE.BufferAttribute).getSize(new THREE.Vector3()).x
    expect(width(1.4) - width(0.4)).toBeGreaterThan(1.5)
  })
})

describe('outline clearance', () => {
  it('sees a plus-shaped overlap with no corner inside the other shape', () => {
    const bar = (hw: number, hl: number): [number, number][] => [[-hw, -hl], [hw, -hl], [hw, hl], [-hw, hl]]
    expect(polygonGap(bar(3, 0.5), bar(0.5, 3))).toBeLessThan(0)
    expect(polygonGap(bar(1, 1), bar(1, 1).map(([x, y]) => [x + 2.5, y]))).toBeCloseTo(0.5)
  })
})

describe('stone outlines', () => {
  // A self-crossing outline breaks faceting, prong placement and side-stone clearance.
  it.each(STONE_SHAPES)('%s outline does not cross itself', (shape) => {
    const pts = outline(shape, 8, 6, 48)
    const cross = (a: number[], b: number[], c: number[], d: number[]) => {
      const o = (p: number[], q: number[], r: number[]) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]))
      return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0
    }
    const n = pts.length
    for (let i = 0; i < n; i++)
      for (let j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1) continue
        expect(cross(pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n])).toBe(false)
      }
  })
})
