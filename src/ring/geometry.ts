// Builds ring meshes from a RingSpec. Units are millimetres.
//
// Ring frame: the finger runs along +Y, the top of the ring (where the stone sits) is +Z.

import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { stoneDimensions } from './catalog'
import { alongPerimeter, offsetOutline, outline, perimeter, type Pt } from './outline'
import type { Gem, Profile, RingSpec, StoneShape } from './spec'

// ---------------------------------------------------------------------------------- band

type RY = [number, number] // (radius, y along the finger)

/** Cross-section of the band as separate polylines, so edges between them stay crisp. */
export function bandProfile(
  profile: Profile,
  innerR: number,
  thickness: number,
  width: number,
  comfortFit: boolean,
  n = 24,
): RY[][] {
  const hw = width / 2
  const ro = innerR + thickness
  const comfort = comfortFit || profile === 'court'
  const dome = comfort ? Math.min(thickness * 0.3, 0.45) : 0
  const rIn = (y: number) => innerR + dome * (y / hw) ** 2

  const outer = outerShape(profile, ro, thickness, hw)
  // y sampled densely near the edges (y = hw·sin φ).
  const ys = Array.from({ length: n + 1 }, (_, k) => hw * Math.sin(-Math.PI / 2 + (Math.PI * k) / n))

  const inner: RY[] = ys.map((y) => [rIn(y), y])
  const outerLine: RY[] = [...ys].reverse().map((y) => [outer(y), y])
  const right: RY[] = [
    [rIn(hw), hw],
    [outer(hw), hw],
  ]
  const left: RY[] = [
    [outer(-hw), -hw],
    [rIn(-hw), -hw],
  ]
  return [inner, right, outerLine, left]
}

function outerShape(profile: Profile, ro: number, t: number, hw: number) {
  const rounded = (edge: number) => (y: number) => {
    const e = Math.min(edge, hw * 0.9, t * 0.9)
    const a = Math.abs(y)
    if (a <= hw - e) return ro
    const dy = a - (hw - e)
    return ro - e + Math.sqrt(Math.max(0, e * e - dy * dy))
  }
  const dome = (side: number) => (y: number) => {
    const s = t * side
    return ro - t + s + (t - s) * Math.sqrt(Math.max(0, 1 - (y / hw) ** 2))
  }
  switch (profile) {
    case 'flat':
      return rounded(0.35)
    case 'square':
      return rounded(0.1)
    case 'd-shape':
      return dome(0.45)
    case 'half-round':
      return dome(0.15)
    case 'court':
      return dome(0.55)
    case 'knife-edge':
      return (y: number) => {
        const s = t * 0.35
        return ro - t + s + (t - s) * (1 - Math.abs(y / hw) ** 1.15)
      }
  }
}

export interface BandOptions {
  innerDiameterMm: number
  profile: Profile
  widthMm: number
  thicknessMm: number
  comfortFit: boolean
  taper: number
  hammered: boolean
  /** Leave an opening at the top (tension setting), radians each side of +Z. */
  gapHalfAngle?: number
  segments?: number
}

/** Sweep the profile around the finger axis. */
export function buildBand(o: BandOptions): THREE.BufferGeometry {
  const innerR = o.innerDiameterMm / 2
  const segments = o.segments ?? 192
  const gap = o.gapHalfAngle ?? 0
  const open = gap > 0
  const start = gap
  const sweep = Math.PI * 2 - 2 * gap
  const rows = open ? segments + 1 : segments

  const parts: THREE.BufferGeometry[] = []
  const lines = bandProfile(o.profile, innerR, o.thicknessMm, o.widthMm, o.comfortFit)
  const ro = innerR + o.thicknessMm

  lines.forEach((line, lineIdx) => {
    const isOuter = lineIdx === 2
    const positions: number[] = []
    const uvs: number[] = []
    for (let i = 0; i < rows; i++) {
      const theta = start + (sweep * i) / segments
      const top = (1 + Math.cos(theta)) / 2 // 1 at the top, 0 under the finger
      const widthScale = o.taper + (1 - o.taper) * top
      line.forEach(([r, y], j) => {
        let rr = r
        if (isOuter && o.hammered) rr -= dimple(theta * ro, y) * 0.07
        positions.push(rr * Math.sin(theta), y * widthScale, rr * Math.cos(theta))
        uvs.push(theta / (Math.PI * 2), j / (line.length - 1))
      })
    }
    const index: number[] = []
    const m = line.length
    const quads = open ? rows - 1 : rows
    for (let i = 0; i < quads; i++) {
      const i2 = (i + 1) % rows
      for (let j = 0; j < m - 1; j++) {
        const a = i * m + j
        const b = i2 * m + j
        const c = i2 * m + j + 1
        const d = i * m + j + 1
        index.push(a, d, b, b, d, c)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    g.setIndex(index)
    g.computeVertexNormals()
    parts.push(g)
  })

  if (open) {
    const loop = lines.flatMap((l) => l.slice(0, -1))
    parts.push(bandCap(loop, start, o.taper, true), bandCap(loop, start + sweep, o.taper, false))
  }
  return merge(parts)
}

function bandCap(loop: RY[], theta: number, taper: number, flip: boolean) {
  const top = (1 + Math.cos(theta)) / 2
  const widthScale = taper + (1 - taper) * top
  const shape = loop.map(([r, y]) => new THREE.Vector2(r, y))
  const tris = THREE.ShapeUtils.triangulateShape(shape, [])
  const positions = loop.flatMap(([r, y]) => [r * Math.sin(theta), y * widthScale, r * Math.cos(theta)])
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(loop.flatMap(() => [0, 0]), 2))
  g.setIndex(tris.flatMap(([a, b, c]) => (flip ? [a, c, b] : [a, b, c])))
  g.computeVertexNormals()
  return g
}

/** Hammered texture: round dimples on a jittered grid. Returns depth 0..1. */
function dimple(u: number, v: number) {
  const cell = 0.9
  const cu = Math.floor(u / cell)
  const cv = Math.floor(v / cell)
  let best = Infinity
  for (let du = -1; du <= 1; du++)
    for (let dv = -1; dv <= 1; dv++) {
      const h1 = hash(cu + du, cv + dv)
      const h2 = hash(cv + dv + 17, cu + du - 9)
      const px = (cu + du + h1) * cell
      const py = (cv + dv + h2) * cell
      best = Math.min(best, Math.hypot(u - px, v - py))
    }
  const f = Math.min(1, best / (cell * 0.75))
  return 1 - f * f
}

function hash(a: number, b: number) {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return s - Math.floor(s)
}

// ---------------------------------------------------------------------------------- gems

/** A faceted gemstone, table facing +Z, girdle at z = 0. Flat-shaded. */
export function buildGem(shape: StoneShape, length: number, width: number): THREE.BufferGeometry {
  const n = shape === 'round' ? 16 : shape === 'princess' || shape === 'asscher' ? 16 : 24
  const girdle = outline(shape, length, width, n)
  const stepCut = shape === 'emerald' || shape === 'asscher'
  const crown = width * 0.15
  const pavilion = width * (stepCut ? 0.4 : 0.43)
  const g = width * 0.015

  const ring = (scale: number, z: number, twist = 0): THREE.Vector3[] => {
    if (!twist) return girdle.map(([x, y]) => new THREE.Vector3(x * scale, y * scale, z))
    // Half-step rotation: midpoint between neighbouring outline points.
    return girdle.map(([x, y], i) => {
      const [x2, y2] = girdle[(i + 1) % girdle.length]
      return new THREE.Vector3(((x + x2) / 2) * scale, ((y + y2) / 2) * scale, z)
    })
  }
  const table = stepCut ? 0.62 : 0.56
  const rings: THREE.Vector3[][] = [
    ring(table, g / 2 + crown), // table edge
    ring(stepCut ? 0.82 : 0.86, g / 2 + crown * 0.55, stepCut ? 0 : 1), // star / step
    ring(1, g / 2), // girdle top
    ring(1, -g / 2), // girdle bottom
    ring(stepCut ? 0.66 : 0.6, -g / 2 - pavilion * 0.5, stepCut ? 0 : 1), // pavilion mains
  ]
  const tri: number[] = []
  const push = (...v: THREE.Vector3[]) => v.forEach((p) => tri.push(p.x, p.y, p.z))

  // Table.
  const tableCenter = new THREE.Vector3(0, 0, g / 2 + crown)
  rings[0].forEach((p, i) => push(tableCenter, p, rings[0][(i + 1) % n]))
  // Bands between rings.
  for (let r = 0; r < rings.length - 1; r++) {
    const a = rings[r]
    const b = rings[r + 1]
    for (let i = 0; i < n; i++) {
      const i2 = (i + 1) % n
      push(a[i], b[i], b[i2])
      push(a[i], b[i2], a[i2])
    }
  }
  // Culet.
  const culet = new THREE.Vector3(0, 0, -g / 2 - pavilion)
  const last = rings[rings.length - 1]
  last.forEach((p, i) => push(culet, last[(i + 1) % n], p))

  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.Float32BufferAttribute(tri, 3))
  fixWinding(geom)
  geom.computeVertexNormals()
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((tri.length / 3) * 2).fill(0), 2))
  return geom
}

/** Make every triangle of a convex-ish, origin-centred solid face outward. */
function fixWinding(g: THREE.BufferGeometry) {
  const p = g.getAttribute('position') as THREE.BufferAttribute
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  const n = new THREE.Vector3()
  const centroid = new THREE.Vector3()
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i)
    b.fromBufferAttribute(p, i + 1)
    c.fromBufferAttribute(p, i + 2)
    n.subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b))
    centroid.copy(a).add(b).add(c).divideScalar(3)
    // Stones are centred at the origin with z spanning both sides; compare with direction
    // away from the stone axis blended with z.
    if (n.dot(centroid) < 0) {
      p.setXYZ(i + 1, c.x, c.y, c.z)
      p.setXYZ(i + 2, b.x, b.y, b.z)
    }
  }
}

// ---------------------------------------------------------------------------------- head

export interface StonePlacement {
  key: string
  gem: Gem
  customColor: string
  geometry: THREE.BufferGeometry
  matrices: THREE.Matrix4[]
}

export interface RingParts {
  band: THREE.BufferGeometry
  /** Prongs, bezels, halo frame. Uses the head metal. */
  head: THREE.BufferGeometry | null
  stones: StonePlacement[]
  /** Engraving sleeve (inside the band): radius and width, mm. */
  engraving: { radius: number; width: number } | null
  /** Overall outer radius at the top, used to frame the camera. */
  extent: number
}

const up = new THREE.Vector3(0, 1, 0)

function cylinderBetween(a: THREE.Vector3, b: THREE.Vector3, r1: number, r2 = r1, radial = 10) {
  const dir = new THREE.Vector3().subVectors(b, a)
  const len = dir.length()
  const g = new THREE.CylinderGeometry(r2, r1, len, radial, 1, false)
  const q = new THREE.Quaternion().setFromUnitVectors(up, dir.normalize())
  const m = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1))
  return g.applyMatrix4(m)
}

function closedTube(pts: THREE.Vector3[], radius: number) {
  const curve = new THREE.CatmullRomCurve3(pts, true)
  return new THREE.TubeGeometry(curve, Math.max(32, pts.length * 3), radius, 8, true)
}

/** Loft between closed (or open) rings with the same point count. */
function loft(rings: THREE.Vector3[][], closed: boolean) {
  const m = rings[0].length
  const positions = rings.flatMap((ring) => ring.flatMap((p) => [p.x, p.y, p.z]))
  const uvs = rings.flatMap((ring, r) => ring.flatMap((_, i) => [i / m, r / (rings.length - 1)]))
  const index: number[] = []
  const cols = closed ? m : m - 1
  for (let r = 0; r < rings.length - 1; r++)
    for (let i = 0; i < cols; i++) {
      const i2 = (i + 1) % m
      const a = r * m + i
      const b = r * m + i2
      const c = (r + 1) * m + i2
      const d = (r + 1) * m + i
      index.push(a, b, c, a, c, d)
    }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setIndex(index)
  g.computeVertexNormals()
  return g
}

/** Bezel wall around an outline, from `z0` to `z1`, `t` thick. Optionally only some arcs. */
function bezel(pts: Pt[], z0: number, z1: number, t: number, keep?: (p: Pt) => boolean) {
  const inner = pts
  const outer = offsetOutline(pts, t)
  const v = (p: Pt, z: number) => new THREE.Vector3(p[0], p[1], z)
  const build = (idx: number[], closed: boolean) =>
    loft(
      [
        idx.map((i) => v(inner[i], z0)),
        idx.map((i) => v(inner[i], z1)),
        idx.map((i) => v(outer[i], z1)),
        idx.map((i) => v(outer[i], z0)),
        idx.map((i) => v(inner[i], z0)),
      ],
      closed,
    )
  if (!keep) return [build(pts.map((_, i) => i), true)]
  // Split the kept points into contiguous arcs.
  const arcs: number[][] = []
  let cur: number[] = []
  const startAt = pts.findIndex((p) => !keep(p))
  for (let k = 1; k <= pts.length; k++) {
    const i = (startAt + k) % pts.length
    if (keep(pts[i])) cur.push(i)
    else if (cur.length) {
      arcs.push(cur)
      cur = []
    }
  }
  if (cur.length) arcs.push(cur)
  return arcs.filter((a) => a.length > 1).map((a) => build(a, false))
}

function merge(parts: THREE.BufferGeometry[]) {
  const clean = parts.map((g) => {
    const ng = g.index ? g.toNonIndexed() : g
    for (const name of Object.keys(ng.attributes))
      if (!['position', 'normal', 'uv'].includes(name)) ng.deleteAttribute(name)
    return ng
  })
  const merged = mergeGeometries(clean, false)
  if (!merged) throw new Error('could not merge ring geometry')
  return merged
}

/** Matrix placing a stone (table up) at a point on the band, tilted to follow the surface. */
function onBand(theta: number, y: number, r: number, scale = 1) {
  const q = new THREE.Quaternion().setFromAxisAngle(up, theta)
  const pos = new THREE.Vector3(r * Math.sin(theta), y, r * Math.cos(theta))
  return new THREE.Matrix4().compose(pos, q, new THREE.Vector3(scale, scale, scale))
}

/** Everything that makes up a ring, ready to turn into meshes. */
export function buildRing(spec: RingSpec): RingParts {
  const innerR = spec.innerDiameterMm / 2
  const ro = innerR + spec.band.thicknessMm
  const parts: THREE.BufferGeometry[] = []
  const stones: StonePlacement[] = []
  const s = spec.stone
  const dims = stoneDimensions(s.shape, s.carat, s.gem)
  const tension = s.enabled && s.setting === 'tension'

  // Tension: the stone is clamped between the band ends, girdle level with the band top.
  const gapHalfAngle = tension ? Math.asin(Math.min(0.95, (dims.width * 0.42) / ro)) : 0

  const band = buildBand({
    innerDiameterMm: spec.innerDiameterMm,
    profile: spec.band.profile,
    widthMm: spec.band.widthMm,
    thicknessMm: spec.band.thicknessMm,
    comfortFit: spec.band.comfortFit,
    taper: spec.band.taper,
    hammered: spec.band.finish === 'hammered',
    gapHalfAngle,
  })

  let extent = ro
  const rot = new THREE.Matrix4().makeRotationZ((s.rotationDeg * Math.PI) / 180)

  if (s.enabled) {
    const zg = tension ? ro - spec.band.thicknessMm * 0.35 : ro + s.settingHeightMm
    extent = zg + dims.crown
    const gemGeom = buildGem(s.shape, dims.length, dims.width)
    stones.push({
      key: 'center',
      gem: s.gem,
      customColor: s.customColor,
      geometry: gemGeom,
      matrices: [new THREE.Matrix4().makeTranslation(0, 0, zg).multiply(rot)],
    })
    const pts = outline(s.shape, dims.length, dims.width, 48)
    const headParts: THREE.BufferGeometry[] = []
    const prongR = THREE.MathUtils.clamp(dims.width * 0.07, 0.35, 0.65)

    if (s.setting === 'prong-4' || s.setting === 'prong-6') {
      for (const p of prongPoints(s.shape, pts, s.setting === 'prong-4' ? 4 : 6)) {
        const tip = new THREE.Vector3(p[0] * 1.03, p[1] * 1.03, zg + dims.crown * 0.35)
        const base = new THREE.Vector3(p[0] * 0.3, p[1] * 0.3, ro - 0.3)
        headParts.push(cylinderBetween(base, tip, prongR * 0.85, prongR))
        if (s.prongTip === 'round') headParts.push(new THREE.SphereGeometry(prongR * 1.1, 12, 8).translate(tip.x, tip.y, tip.z))
        else {
          const inward = new THREE.Vector3(-p[0], -p[1], -dims.crown * 0.6).normalize()
          const len = s.prongTip === 'claw' ? prongR * 2.6 : prongR * 1.8
          headParts.push(cylinderBetween(tip, tip.clone().addScaledVector(inward, len), prongR * 1.05, 0.05, s.prongTip === 'claw' ? 10 : 4))
        }
      }
      // Basket rail under the girdle.
      const rail = pts.filter((_, i) => i % 2 === 0).map(([x, y]) => new THREE.Vector3(x * 0.72, y * 0.72, zg - dims.pavilion * 0.55))
      headParts.push(closedTube(rail, prongR * 0.55))
    } else if (s.setting === 'bezel' || s.setting === 'half-bezel') {
      const keep = s.setting === 'half-bezel' ? (p: Pt) => Math.abs(p[0]) > (dims.width / 2) * 0.55 : undefined
      headParts.push(...bezel(pts, zg - dims.pavilion * 0.75, zg + dims.crown * 0.3, 0.5, keep))
      // Cone joining the bezel cup to the band.
      const cup = pts.filter((_, i) => i % 3 === 0).map(([x, y]) => new THREE.Vector3(x * 0.55, y * 0.55, zg - dims.pavilion * 0.8))
      headParts.push(closedTube(cup, 0.45))
      for (const p of prongPoints(s.shape, pts, 4))
        headParts.push(cylinderBetween(new THREE.Vector3(p[0] * 0.25, p[1] * 0.25, ro - 0.3), new THREE.Vector3(p[0] * 0.6, p[1] * 0.6, zg - dims.pavilion * 0.7), 0.45))
    }

    if (spec.halo.enabled) {
      const d = spec.halo.stoneMm
      const path = offsetOutline(pts, 0.25 + d / 2)
      const count = Math.max(8, Math.floor(perimeter(path) / (d * 1.08)))
      const z = zg - dims.crown * 0.2
      const melee = buildGem('round', d, d)
      stones.push({
        key: 'halo',
        gem: spec.halo.gem,
        customColor: spec.halo.customColor,
        geometry: melee,
        matrices: alongPerimeter(path, count).map(([x, y]) => rot.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, z))),
      })
      const frame = offsetOutline(pts, 0.25 + d / 2)
        .filter((_, i) => i % 2 === 0)
        .map(([x, y]) => new THREE.Vector3(x, y, z - d * 0.45))
      headParts.push(closedTube(frame, d * 0.42))
      for (const p of prongPoints(s.shape, pts, 4)) {
        const f = (dims.width / 2 + 0.25 + d) / Math.hypot(p[0], p[1])
        headParts.push(cylinderBetween(new THREE.Vector3(p[0] * 0.25, p[1] * 0.25, ro - 0.3), new THREE.Vector3(p[0] * f, p[1] * f, z - d * 0.5), 0.4))
      }
      extent = Math.max(extent, z + d * 0.2)
    }

    if (headParts.length) {
      const head = merge(headParts)
      head.applyMatrix4(rot)
      parts.push(head)
    }
  }

  // Accent stones along the band or beside the centre stone.
  const a = spec.accents
  if (a.style === 'three-stone' && s.enabled) {
    const o = a.side
    const shape = o.shape === 'match' ? s.shape : o.shape
    const sd = stoneDimensions(shape, s.carat * a.sideRatio ** 3, a.gem)
    const gemGeom = buildGem(shape, sd.length, sd.width)
    const sidePts = outline(shape, sd.length, sd.width, 48)
    // Clear the centre stone (its halo, bezel walls) as it actually sits, rotated on the finger.
    const centreOutline = outline(s.shape, dims.length, dims.width, 48)
    const centreWall = spec.halo.enabled ? spec.halo.stoneMm + 0.25 : s.setting === 'bezel' || s.setting === 'half-bezel' ? 0.5 : 0
    const sideWall = o.setting === 'bezel' ? 0.4 : 0
    const centreZ = tension ? ro - spec.band.thicknessMm * 0.35 : ro + s.settingHeightMm
    const z = ro + Math.max(0.5, (centreZ - ro) * o.height)
    const prongR = THREE.MathUtils.clamp(sd.width * 0.08, 0.3, 0.55)
    const matrices: THREE.Matrix4[] = []
    const sideParts: THREE.BufferGeometry[] = []
    for (const side of [-1, 1]) {
      const deg = side < 0 && o.mirror ? -o.rotationDeg : o.rotationDeg
      // Gap between the facing edges: the centre's edge toward this side, the side stone's edge toward the centre.
      const cx = side * (reachX(centreOutline, s.rotationDeg, side) + centreWall + o.gapMm + sideWall + reachX(sidePts, deg, -side))
      const place = new THREE.Matrix4().makeTranslation(cx, 0, 0).multiply(new THREE.Matrix4().makeRotationZ((deg * Math.PI) / 180))
      matrices.push(new THREE.Matrix4().makeTranslation(0, 0, z).multiply(place))
      if (o.setting === 'bezel') {
        const cup = bezel(sidePts, z - sd.pavilion * 0.75, z + sd.crown * 0.3, 0.4)
        cup.forEach((g) => g.applyMatrix4(place))
        sideParts.push(...cup)
        for (const p of prongPoints(shape, sidePts, 4)) {
          const [x, y] = rotate2(p, deg)
          sideParts.push(cylinderBetween(new THREE.Vector3(cx * 0.8 + x * 0.25, y * 0.25, ro - 0.3), new THREE.Vector3(cx + x * 0.6, y * 0.6, z - sd.pavilion * 0.7), 0.35))
        }
      } else
        for (const p of prongPoints(shape, sidePts, o.setting === 'prong-6' ? 6 : 4)) {
          const [x, y] = rotate2(p, deg)
          const tip = new THREE.Vector3(cx + x * 1.03, y * 1.03, z + sd.crown * 0.35)
          const base = new THREE.Vector3(cx * 0.7 + x * 0.3, y * 0.3, ro - 0.3)
          sideParts.push(cylinderBetween(base, tip, prongR * 0.85, prongR))
          sideParts.push(new THREE.SphereGeometry(prongR * 1.1, 10, 6).translate(tip.x, tip.y, tip.z))
        }
      extent = Math.max(extent, z + sd.crown)
    }
    stones.push({ key: 'side', gem: a.gem, customColor: a.customColor, geometry: gemGeom, matrices })
    parts.push(merge(sideParts))
  } else if (a.style !== 'none' && a.style !== 'three-stone') {
    const cut = a.meleeCut === 'auto' ? (a.style === 'channel' ? 'princess' : 'round') : a.meleeCut
    // d runs across the band; a baguette is half as long along it.
    const d = Math.min(a.stoneMm, spec.band.widthMm * 0.85)
    const along = cut === 'baguette' ? d * 0.5 : d
    const crown = along * 0.15
    const melee = cut === 'baguette' ? buildGem('emerald', d, along) : buildGem(cut, d, d)
    const pitch = (along * (a.style === 'channel' ? 1.0 : 1.1)) / ro
    const headClear = s.enabled ? ((s.setting === 'tension' ? dims.width * 0.5 : dims.width / 2 + (spec.halo.enabled ? spec.halo.stoneMm + 0.5 : 0)) + along / 2 + 0.5) / ro : 0
    const start = s.enabled ? Math.max(headClear, pitch / 2) : a.style === 'eternity' ? 0 : pitch / 2
    // Coverage counts from the top; always place at least one stone past the head.
    const span = a.style === 'eternity' ? Math.PI : a.style === 'half-eternity' ? Math.PI / 2 : Math.max(start, (a.coverageDeg * Math.PI) / 180)
    const matrices: THREE.Matrix4[] = []
    const fit = Math.floor(spec.band.widthMm / (d * 1.05))
    const rows = a.rows || (a.style === 'pave' && spec.band.widthMm >= d * 2.2 ? 2 : 1)
    const rowCount = a.style === 'channel' ? 1 : Math.max(1, Math.min(rows, fit))
    for (let theta = start; theta <= span + 1e-6; theta += pitch)
      for (const sign of theta === 0 ? [1] : [1, -1])
        for (let row = 0; row < rowCount; row++) {
          const y = (row - (rowCount - 1) / 2) * d * 1.05
          matrices.push(onBand(sign * theta, y, ro - crown * 0.3))
        }
    if (a.style === 'eternity' && !s.enabled) matrices.push(onBand(Math.PI, 0, ro - crown * 0.3))
    stones.push({ key: 'accents', gem: a.gem, customColor: a.customColor, geometry: melee, matrices })
  }

  return {
    band,
    head: parts.length ? merge(parts) : null,
    stones,
    // Narrow enough to stay on the flat middle of a comfort-fit (domed) inside.
    engraving: spec.engraving.text.trim() ? { radius: innerR - 0.01, width: spec.band.widthMm * 0.5 } : null,
    extent,
  }
}

function rotate2([x, y]: Pt, deg: number): Pt {
  const t = (deg * Math.PI) / 180
  return [x * Math.cos(t) - y * Math.sin(t), x * Math.sin(t) + y * Math.cos(t)]
}

/** How far an outline turned by `deg` reaches from its centre toward +x (dir 1) or −x (dir −1). */
export function reachX(pts: Pt[], deg: number, dir: number) {
  return Math.max(...pts.map((p) => dir * rotate2(p, deg)[0]))
}

/** Outline points where prongs go: diagonals for 4, every 60° for 6, tips for pointed shapes. */
function prongPoints(shape: StoneShape, pts: Pt[], count: 4 | 6): Pt[] {
  const angles =
    count === 6
      ? [0, 60, 120, 180, 240, 300].map((d) => d + 30)
      : shape === 'pear' || shape === 'marquise' || shape === 'heart'
        ? [0, 90, 180, 270]
        : [45, 135, 225, 315]
  return angles.map((deg) => {
    const t = (deg * Math.PI) / 180
    const dir: Pt = [Math.sin(t), Math.cos(t)]
    return pts.reduce((best, p) => {
      const score = (p[0] * dir[0] + p[1] * dir[1]) / (Math.hypot(p[0], p[1]) || 1)
      const bestScore = (best[0] * dir[0] + best[1] * dir[1]) / (Math.hypot(best[0], best[1]) || 1)
      return score > bestScore ? p : best
    })
  })
}
