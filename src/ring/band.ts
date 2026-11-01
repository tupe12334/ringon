// The band: its cross-section swept around the finger, split into the surfaces that take
// different materials (band, inlays, liner). Units are millimetres; the finger runs along +Y.

import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Profile } from './spec'


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
  /** Inlay strips in the outer surface: from/to y along the finger, mm. A later strip covers an
   * earlier one where they overlap. */
  inlays?: [number, number][]
  /** Liner (sleeve) thickness, mm. */
  linerMm?: number
  segments?: number
}

/** Sweep the profile around the finger axis. */
export function buildBand(o: BandOptions): THREE.BufferGeometry {
  const { main, inlays, liner } = buildBandParts(o)
  return merge([main, ...inlays, liner].filter((g) => g !== null))
}

/** Split a polyline running from +y to −y where it crosses `yCut`: [part above, part below]. */
function cutAtY(line: RY[], yCut: number): [RY[], RY[]] {
  for (let j = 0; j < line.length - 1; j++) {
    const [[r0, y0], [r1, y1]] = [line[j], line[j + 1]]
    if (y0 > yCut && y1 <= yCut) {
      const p: RY = [r0 + ((r1 - r0) * (yCut - y0)) / (y1 - y0), yCut]
      return [[...line.slice(0, j + 1), p], [p, ...line.slice(y1 === yCut ? j + 2 : j + 1)]]
    }
  }
  return line[0][1] > yCut ? [line, []] : [[], line]
}

/**
 * The band as separate surfaces: the main metal (or wood), inlay strips in the outer surface,
 * and a liner (sleeve) on the inside that also shows as a layer on the side walls.
 */
export function buildBandParts(o: BandOptions) {
  const innerR = o.innerDiameterMm / 2
  const segments = o.segments ?? 192
  const gap = o.gapHalfAngle ?? 0
  const open = gap > 0
  const start = gap
  const sweep = Math.PI * 2 - 2 * gap
  // A closed band repeats its first row at the end with u = 1, so the texture wraps instead of
  // squeezing whole into the last quad.
  const rows = segments + 1
  const ro = innerR + o.thicknessMm

  const sweepLine = (line: RY[], hammered: boolean) => {
    const positions: number[] = []
    const uvs: number[] = []
    for (let i = 0; i < rows; i++) {
      const u = (start + (sweep * i) / segments) / (Math.PI * 2)
      const theta = start + (sweep * (open ? i : i % segments)) / segments
      const top = (1 + Math.cos(theta)) / 2 // 1 at the top, 0 under the finger
      const widthScale = o.taper + (1 - o.taper) * top
      line.forEach(([r, y]) => {
        let rr = r
        if (hammered) rr -= dimple(theta * ro, y) * 0.07
        positions.push(rr * Math.sin(theta), y * widthScale, rr * Math.cos(theta))
        // v across the band in mm / width, so every surface shares one texture mapping.
        uvs.push(u, 0.5 + y / o.widthMm)
      })
    }
    const index: number[] = []
    const m = line.length
    for (let i = 0; i < segments; i++) {
      const i2 = i + 1
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
    if (!open) {
      // The first and last rows are one place: give them one normal so no crease shows.
      const n = g.getAttribute('normal')
      const v = new THREE.Vector3()
      for (let j = 0; j < m; j++) {
        const last = segments * m + j
        v.fromBufferAttribute(n, j).add(new THREE.Vector3().fromBufferAttribute(n, last)).normalize()
        n.setXYZ(j, v.x, v.y, v.z)
        n.setXYZ(last, v.x, v.y, v.z)
      }
    }
    return g
  }

  const lines = bandProfile(o.profile, innerR, o.thicknessMm, o.widthMm, o.comfortFit)
  const [inner, right, outerLine, left] = lines
  const main: [RY[], boolean][] = [] // [line, hammered]
  const linerLines: RY[][] = []

  // Liner: the inside surface, plus its thickness on each side wall.
  if (o.linerMm) {
    const [[rr, ry], [rr2]] = right
    const [[lr2], [lr, ly]] = left
    const cutR = (r: number) => Math.min(r + o.linerMm!, r + (rr2 - rr) * 0.6)
    linerLines.push(inner, [[rr, ry], [cutR(rr), ry]], [[cutR(lr), ly], [lr, ly]])
    main.push([[[cutR(rr), ry], [rr2, ry]], false], [[[lr2, ly], [cutR(lr), ly]], false])
  } else main.push([inner, false], [right, false], [left, false])

  // Inlays: strips of the outer surface between two heights along the finger. Cut the outer line
  // (running +y → −y) at every strip edge; each piece belongs to the last strip covering it, so
  // a narrow second strip can sit inside a wide first one (a pinstripe).
  const strips = o.inlays ?? []
  const hw = o.widthMm / 2
  const cuts = [...new Set(strips.flat().filter((y) => y > -hw && y < hw))].sort((p, q) => q - p)
  const inlayLines: RY[][][] = strips.map(() => [])
  let rest = outerLine
  for (const [k, y] of [...cuts, -hw].entries()) {
    const [piece, tail] = k < cuts.length ? cutAtY(rest, y) : [rest, []]
    rest = tail
    if (piece.length < 2) continue
    const mid = (piece[0][1] + piece[piece.length - 1][1]) / 2
    const owner = strips.findLastIndex(([lo, hi]) => lo < mid && mid < hi)
    if (owner < 0) main.push([piece, o.hammered])
    else inlayLines[owner].push(piece)
  }
  const surface = (ls: RY[][]) => (ls.length ? merge(ls.map((l) => sweepLine(l, false))) : null)
  const mainParts = main.map(([l, hammered]) => sweepLine(l, hammered))
  if (open) {
    const loop = lines.flatMap((l) => l.slice(0, -1))
    mainParts.push(bandCap(loop, start, o.taper, true), bandCap(loop, start + sweep, o.taper, false))
  }
  return { main: merge(mainParts), inlays: inlayLines.map(surface), liner: surface(linerLines) }
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

/** Merge geometries into one, keeping only position, normal and uv. */
export function merge(parts: THREE.BufferGeometry[]) {
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
