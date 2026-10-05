// Builds ring meshes from a RingSpec. Units are millimetres.
//
// Ring frame: the finger runs along +Y, the top of the ring (where the stone sits) is +Z.

import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { SHAPE_INFO, stoneDimensions } from './catalog'
import { alongPerimeter, offsetOutline, outline, perimeter, type Pt } from './outline'
import type { BezelEdge, Gem, Profile, RingSpec, StoneShape } from './spec'

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
  let n = shape === 'round' ? 16 : shape === 'princess' || shape === 'asscher' ? 16 : 24
  const girdle = outline(shape, length, width, n)
  n = girdle.length
  const stepCut = ['emerald', 'asscher', 'baguette', 'tapered-baguette', 'trapezoid'].includes(shape)
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

/** Bezel wall around an outline, from `z0` to `z1`, `t` thick, with an edge finish. Optionally only some arcs. */
function bezel(pts: Pt[], z0: number, z1: number, t: number, edge: BezelEdge = 'plain', keep?: (p: Pt) => boolean) {
  const inner = pts
  const outer = offsetOutline(pts, t)
  const mid = offsetOutline(pts, t / 2)
  const v = (p: Pt, z: number) => new THREE.Vector3(p[0], p[1], z)
  const build = (idx: number[], closed: boolean) => {
    const out = [
      loft(
        [
          idx.map((i) => v(inner[i], z0)),
          idx.map((i) => v(inner[i], z1)),
          idx.map((i) => v(outer[i], z1)),
          idx.map((i) => v(outer[i], z0)),
          idx.map((i) => v(inner[i], z0)),
        ],
        closed,
      ),
    ]
    if (edge === 'rounded') {
      // Half-round rim along the top of the wall.
      const curve = new THREE.CatmullRomCurve3(idx.map((i) => v(mid[i], z1)), closed)
      out.push(new THREE.TubeGeometry(curve, Math.max(24, idx.length * 3), t / 2, 8, closed))
    } else if (edge === 'milgrain') {
      // A row of tiny beads along the outer top edge.
      const r = Math.max(0.09, t * 0.22)
      const path = idx.map((i) => outer[i])
      const length = closed ? perimeter(path) : perimeter(path) - Math.hypot(path[0][0] - path.at(-1)![0], path[0][1] - path.at(-1)![1])
      const beads = Math.max(6, Math.floor(length / (r * 2.4)))
      const at = closed ? alongPerimeter(path, beads) : alongOpen(path, beads)
      for (const [x, y] of at) out.push(new THREE.SphereGeometry(r, 6, 4).translate(x, y, z1 - r * 0.6))
    }
    return out
  }
  if (!keep) return build(pts.map((_, i) => i), true)
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
  return arcs.filter((a) => a.length > 1).flatMap((a) => build(a, false))
}

/** `count` points spread evenly along an open polyline. */
function alongOpen(pts: Pt[], count: number): Pt[] {
  const seg = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]))
  const total = seg.reduce((x, y) => x + y, 0)
  const out: Pt[] = []
  for (let k = 0; k < count; k++) {
    let target = ((k + 0.5) / count) * total
    let i = 0
    while (i < seg.length - 1 && target > seg[i]) target -= seg[i++]
    const f = seg[i] ? target / seg[i] : 0
    out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f])
  }
  return out
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
  const a = spec.accents
  const o = a.side
  const toiEtMoi = o.layout === 'toi-et-moi'
  // The offset moves side stones relative to the centre along the finger. Side stones stay on the
  // band and the taller centre head moves instead; a toi et moi pair splits it to stay centred.
  const sidesOn = s.enabled && (toiEtMoi || o.count > 0)
  const yCentre = !sidesOn ? 0 : toiEtMoi ? -o.offsetMm / 2 : -o.offsetMm
  const ySide = toiEtMoi ? o.offsetMm / 2 : 0
  // Prongs and posts always meet the band on its centre line, wherever the stone sits along the finger.
  const [bx, by] = rotate2([0, -yCentre], -s.rotationDeg)
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
        const base = new THREE.Vector3(p[0] * 0.3 + bx, p[1] * 0.3 + by, ro - 0.3)
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
      const bz = s.bezel
      const keep =
        s.setting !== 'half-bezel' ? undefined
        : bz.halfWalls === 'sides' ? (p: Pt) => Math.abs(p[0]) > (dims.width / 2) * 0.55
        : (p: Pt) => Math.abs(p[1]) > (dims.length / 2) * 0.55
      headParts.push(...bezel(pts, zg - dims.pavilion * 0.75, zg + dims.crown * bz.lip, bz.wallMm, bz.edge, keep))
      // Cone joining the bezel cup to the band.
      const cup = pts.filter((_, i) => i % 3 === 0).map(([x, y]) => new THREE.Vector3(x * 0.55, y * 0.55, zg - dims.pavilion * 0.8))
      headParts.push(closedTube(cup, 0.45))
      for (const p of prongPoints(s.shape, pts, 4))
        headParts.push(cylinderBetween(new THREE.Vector3(p[0] * 0.25 + bx, p[1] * 0.25 + by, ro - 0.3), new THREE.Vector3(p[0] * 0.6, p[1] * 0.6, zg - dims.pavilion * 0.7), 0.45))
    }

    const h = spec.halo
    if (h.enabled) {
      const d = h.stoneMm
      const melee = buildGem('round', d, d)
      const matrices: THREE.Matrix4[] = []
      if (h.style === 'hidden') {
        // Under the girdle, hugging the pavilion: seen from the side, not from above.
        const z = zg - dims.pavilion * 0.35
        const path = offsetOutline(pts.map(([x, y]) => [x * 0.65, y * 0.65] as Pt), d / 2 + 0.05)
        const count = Math.max(8, Math.floor(perimeter(path) / (d * 1.08)))
        matrices.push(...alongPerimeter(path, count).map(([x, y]) => new THREE.Matrix4().makeTranslation(x, y, z)))
        headParts.push(closedTube(path.filter((_, i) => i % 2 === 0).map(([x, y]) => new THREE.Vector3(x, y, z - d * 0.45)), d * 0.4))
      } else {
        const z = zg - dims.crown * 0.2
        for (let row = 0; row < h.rows; row++) {
          const path = offsetOutline(pts, 0.25 + d / 2 + row * (d * 1.05 + 0.15))
          const count = Math.max(8, Math.floor(perimeter(path) / (d * 1.08)))
          matrices.push(...alongPerimeter(path, count).map(([x, y]) => new THREE.Matrix4().makeTranslation(x, y, z)))
          headParts.push(closedTube(path.filter((_, i) => i % 2 === 0).map(([x, y]) => new THREE.Vector3(x, y, z - d * 0.45)), d * 0.42))
        }
        for (const p of prongPoints(s.shape, pts, 4)) {
          const f = (dims.width / 2 + 0.25 + d) / Math.hypot(p[0], p[1])
          headParts.push(cylinderBetween(new THREE.Vector3(p[0] * 0.25 + bx, p[1] * 0.25 + by, ro - 0.3), new THREE.Vector3(p[0] * f, p[1] * f, z - d * 0.5), 0.4))
        }
        extent = Math.max(extent, z + d * 0.2)
      }
      stones.push({ key: 'halo', gem: h.gem, customColor: h.customColor, geometry: melee, matrices: matrices.map((m) => rot.clone().multiply(m)) })
    }

    if (headParts.length) {
      const head = merge(headParts)
      head.applyMatrix4(rot)
      parts.push(head)
    }
  }

  // Side stones next to the centre: three/five/seven-stone, or one partner stone (toi et moi).
  const count = s.enabled ? (toiEtMoi ? 1 : o.count) : 0
  /** How far down the band (radians from the top) the head and side stones reach. */
  let headReach = 0
  if (count) {
    const shape = o.shape === 'match' ? s.shape : o.shape
    const centreOutline = outline(s.shape, dims.length, dims.width, 48)
    const haloOuter = spec.halo.enabled && spec.halo.style === 'classic' ? 0.25 + spec.halo.rows * spec.halo.stoneMm + (spec.halo.rows - 1) * 0.15 : 0
    const centreWall = haloOuter || (s.setting === 'bezel' || s.setting === 'half-bezel' ? s.bezel.wallMm : 0)
    const sideWall = o.setting === 'bezel' ? s.bezel.wallMm : 0
    const centreZ = tension ? ro - spec.band.thicknessMm * 0.35 : ro + s.settingHeightMm
    const z = ro + Math.max(0.5, (centreZ - ro) * o.height)
    let pairShift = 0
    const sidePlacements: { side: number; k: number; theta: number; deg: number; shape: StoneShape; sd: ReturnType<typeof stoneDimensions>; pts: Pt[] }[] = []
    const turn = (pts: Pt[], deg: number, dx: number, dy: number): Pt[] => pts.map((p) => {
      const [x, y] = rotate2(p, deg)
      return [x + dx, y + dy]
    })
    for (const side of toiEtMoi ? [1] : [-1, 1]) {
      // Flat layout first (x across the finger at girdle height), bent onto the band below.
      let prev = turn(centreWall ? offsetOutline(centreOutline, centreWall) : centreOutline, s.rotationDeg, 0, yCentre)
      let prevX = 0
      for (let k = 0; k < count; k++) {
        const ratio = o.ratio * o.graduation ** k
        const sd = stoneDimensions(shape, s.carat * ratio ** 3, o.gem)
        const pts = outline(shape, sd.length, sd.width, 48)
        const deg = side < 0 && o.mirror ? -o.rotationDeg : o.rotationDeg
        const own = sideWall ? offsetOutline(pts, sideWall) : pts
        // Slide the stone in from far out until its outline is `gap` from the previous one.
        const far = Math.max(...prev.map((p) => side * p[0])) + o.gapMm + reachX(own, deg, -side)
        const cx = side * closestSlide((x) => polygonGap(prev, turn(own, deg, side * x, ySide)), prevX, far, o.gapMm)
        prevX = side * cx
        prev = turn(own, deg, cx, ySide)
        // Bend onto the band so the stone keeps this x seen from above (at its girdle height).
        sidePlacements.push({ side, k, theta: Math.asin(Math.max(-0.95, Math.min(0.95, cx / z))), deg, shape, sd, pts })
        headReach = Math.max(headReach, Math.max(...prev.map((p) => side * p[0])) / ro)
      }
    }
    if (toiEtMoi) pairShift = -sidePlacements[0].theta / 2
    if (pairShift || yCentre) {
      const shift = new THREE.Matrix4().makeRotationY(pairShift).multiply(new THREE.Matrix4().makeTranslation(0, yCentre, 0))
      for (const st of stones) st.matrices = st.matrices.map((m) => shift.clone().multiply(m))
      for (const g of parts) g.applyMatrix4(shift)
    }
    const sideParts: THREE.BufferGeometry[] = []
    for (const { side, k, theta, deg, shape: sh, sd, pts } of sidePlacements) {
      const at = new THREE.Matrix4().makeRotationY(theta + pairShift).multiply(new THREE.Matrix4().makeTranslation(0, ySide, 0))
      const spin = new THREE.Matrix4().makeRotationZ((deg * Math.PI) / 180)
      stones.push({
        key: `side-${side}-${k}`,
        gem: o.gem,
        customColor: o.customColor,
        geometry: buildGem(sh, sd.length, sd.width),
        matrices: [at.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, z)).multiply(spin)],
      })
      const local: THREE.BufferGeometry[] = []
      if (o.setting === 'bezel') {
        const cup = bezel(pts, z - sd.pavilion * 0.75, z + sd.crown * s.bezel.lip, s.bezel.wallMm, s.bezel.edge)
        cup.forEach((g) => g.applyMatrix4(spin))
        local.push(...cup)
        for (const p of prongPoints(sh, pts, 4)) {
          const [x, y] = rotate2(p, deg)
          local.push(cylinderBetween(new THREE.Vector3(x * 0.25, y * 0.25 - ySide, ro - 0.3), new THREE.Vector3(x * 0.6, y * 0.6, z - sd.pavilion * 0.7), 0.35))
        }
      } else {
        const prongR = THREE.MathUtils.clamp(sd.width * 0.08, 0.3, 0.55)
        for (const p of prongPoints(sh, pts, o.setting === 'prong-6' ? 6 : 4)) {
          const [x, y] = rotate2(p, deg)
          const tip = new THREE.Vector3(x * 1.03, y * 1.03, z + sd.crown * 0.35)
          local.push(cylinderBetween(new THREE.Vector3(x * 0.3, y * 0.3 - ySide, ro - 0.3), tip, prongR * 0.85, prongR))
          local.push(new THREE.SphereGeometry(prongR * 1.1, 10, 6).translate(tip.x, tip.y, tip.z))
        }
      }
      local.forEach((g) => g.applyMatrix4(at))
      sideParts.push(...local)
      extent = Math.max(extent, z + sd.crown)
    }
    parts.push(merge(sideParts))
    if (toiEtMoi) headReach += Math.abs(pairShift)
  }

  // Stones set into the band.
  if (a.style !== 'none') {
    const cut = a.meleeCut === 'auto' ? (a.style === 'channel' ? 'princess' : 'round') : a.meleeCut
    // d runs across the band; `along` follows the shape's proportions (long axis across the band).
    const d = Math.min(a.stoneMm, spec.band.widthMm * 0.85)
    const info = SHAPE_INFO[cut]
    const along = d * Math.min(info.width1ct, info.length1ct) / Math.max(info.width1ct, info.length1ct)
    const crown = along * 0.15
    const melee = buildGem(cut, d, along)
    const wall = a.bezelSet ? Math.min(s.bezel.wallMm, 0.45) : 0
    const pitch = (along * (a.style === 'channel' ? 1.0 : 1.1) + 2 * wall + a.spacingMm) / ro
    const headClear = s.enabled ? ((s.setting === 'tension' ? dims.width * 0.5 : dims.width / 2 + (spec.halo.enabled && spec.halo.style === 'classic' ? spec.halo.stoneMm * spec.halo.rows + 0.5 : 0)) + along / 2 + wall + 0.5) / ro : 0
    const start = s.enabled ? Math.max(headClear, headReach + (along / 2 + wall + 0.3) / ro, pitch / 2) : a.style === 'eternity' ? 0 : pitch / 2
    // Coverage counts from the top; always place at least one stone past the head.
    const span = a.style === 'eternity' ? Math.PI : a.style === 'half-eternity' ? Math.PI / 2 : Math.max(start, (a.coverageDeg * Math.PI) / 180)
    const matrices: THREE.Matrix4[] = []
    const fit = Math.floor(spec.band.widthMm / (d * 1.05 + 2 * wall))
    const rows = a.rows || (a.style === 'pave' && spec.band.widthMm >= d * 2.2 ? 2 : 1)
    const rowCount = a.style === 'channel' ? 1 : Math.max(1, Math.min(rows, fit))
    // Bezel-set stones sit proud of the band; pavé and channel stones sit in it.
    const r = a.bezelSet ? ro + crown * 0.5 : ro - crown * 0.3
    for (let theta = start; theta <= span + 1e-6; theta += pitch)
      for (const sign of theta === 0 ? [1] : [1, -1])
        for (let row = 0; row < rowCount; row++) {
          const y = (row - (rowCount - 1) / 2) * (d * 1.05 + 2 * wall)
          matrices.push(onBand(sign * theta, y, r))
        }
    if (a.style === 'eternity' && !s.enabled) matrices.push(onBand(Math.PI, 0, r))
    stones.push({ key: 'accents', gem: a.gem, customColor: a.customColor, geometry: melee, matrices })
    if (a.bezelSet) {
      const cup = merge(bezel(outline(cut, d, along, 32), -along * 0.35, crown * s.bezel.lip, wall, s.bezel.edge))
      parts.push(merge(matrices.map((m) => cup.clone().applyMatrix4(m))))
    }
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

/** Smallest distance between two closed outlines; negative when they overlap. */
export function polygonGap(a: Pt[], b: Pt[]) {
  if (b.some((p) => insidePolygon(p, a)) || a.some((p) => insidePolygon(p, b))) return -1
  let best = Infinity
  for (const [poly, other] of [[a, b], [b, a]])
    for (const p of poly)
      for (let i = 0; i < other.length; i++) best = Math.min(best, segmentDistance(p, other[i], other[(i + 1) % other.length]))
  return best
}

function insidePolygon([x, y]: Pt, poly: Pt[]) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function segmentDistance([px, py]: Pt, [ax, ay]: Pt, [bx, by]: Pt) {
  const dx = bx - ax
  const dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)))
  return Math.hypot(px - ax - t * dx, py - ay - t * dy)
}

/** Smallest x in [from, far] with gapAt(x) ≥ gap, by bisection (gapAt grows as the stone slides out). */
function closestSlide(gapAt: (x: number) => number, from: number, far: number, gap: number) {
  let lo = from
  let hi = far
  if (gapAt(lo) >= gap) return lo
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    if (gapAt(mid) >= gap) hi = mid
    else lo = mid
  }
  return hi
}

/** How far an outline turned by `deg` reaches from its centre toward +x (dir 1) or −x (dir −1). */
export function reachX(pts: Pt[], deg: number, dir: number) {
  return Math.max(...pts.map((p) => dir * rotate2(p, deg)[0]))
}

/** Outline points where prongs go: diagonals for 4, every 60° for 6, tips for pointed shapes. */
function prongPoints(shape: StoneShape, pts: Pt[], count: 4 | 6): Pt[] {
  // Corner angles of shapes whose corners sit at the front (+y) and back.
  const hw = Math.max(...pts.map((p) => p[0]))
  const hl = Math.max(...pts.map((p) => p[1]))
  const front = (Math.atan2(hw, hl) * 180) / Math.PI
  const angles =
    count === 6
      ? [0, 60, 120, 180, 240, 300].map((d) => d + 30)
      : shape === 'trillion'
        ? [front, 180, 360 - front]
        : shape === 'half-moon'
          ? [front, 135, 225, 360 - front]
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
