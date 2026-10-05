// Face-up outlines of gemstone shapes, as closed polygons in the XY plane.
// x spans the stone width, y the stone length; the centre is the origin.

import type { StoneShape } from './spec'

export type Pt = [number, number]

/** Closed outline with `n` points (some shapes use their own vertex count). */
export function outline(shape: StoneShape, length: number, width: number, n = 32): Pt[] {
  const hw = width / 2
  const hl = length / 2
  const ring = (f: (t: number) => Pt) =>
    Array.from({ length: n }, (_, k) => f((k / n) * Math.PI * 2))

  switch (shape) {
    case 'round':
    case 'oval':
      return ring((t) => [hw * Math.sin(t), hl * Math.cos(t)])
    case 'cushion':
      return ring((t) => superellipse(t, hw, hl, 4))
    case 'princess':
      return chamferedRect(hw, hl, Math.min(hw, hl) * 0.03, n)
    case 'asscher':
      return chamferedRect(hw, hl, Math.min(hw, hl) * 0.3, n)
    case 'emerald':
      return chamferedRect(hw, hl, Math.min(hw, hl) * 0.22, n)
    case 'radiant':
      return chamferedRect(hw, hl, Math.min(hw, hl) * 0.18, n)
    case 'pear': {
      // Round end at −y, point at +y.
      const r = hw
      const c = -hl + r
      return ring((t) => {
        const cos = Math.cos(t)
        if (cos <= 0) return [r * Math.sin(t), c + r * cos]
        return [r * Math.sin(t) * (1 - cos) ** 0.9, c + (hl - c) * cos]
      })
    }
    case 'marquise':
      return ring((t) => [hw * Math.sign(Math.sin(t)) * Math.sin(t) ** 2, hl * Math.cos(t)])
    case 'heart': {
      // Classic heart curve, scaled to fit width × length, point at +y.
      const raw = ring((t) => [
        16 * Math.sin(t) ** 3,
        -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)),
      ])
      return fit(raw, hw, hl)
    }
  }
}

function superellipse(t: number, a: number, b: number, p: number): Pt {
  const s = Math.sin(t)
  const c = Math.cos(t)
  return [a * Math.sign(s) * Math.abs(s) ** (2 / p), b * Math.sign(c) * Math.abs(c) ** (2 / p)]
}

/** Rectangle with cut corners, resampled to n points evenly along the perimeter. */
function chamferedRect(hw: number, hl: number, c: number, n: number): Pt[] {
  const corners: Pt[] = [
    [-hw + c, hl],
    [hw - c, hl],
    [hw, hl - c],
    [hw, -hl + c],
    [hw - c, -hl],
    [-hw + c, -hl],
    [-hw, -hl + c],
    [-hw, hl - c],
  ]
  return resample(corners, n)
}

/** Evenly spaced points along a closed polygon, always keeping its corners. */
export function resample(poly: Pt[], n: number): Pt[] {
  const seg = poly.map((p, i) => {
    const q = poly[(i + 1) % poly.length]
    return Math.hypot(q[0] - p[0], q[1] - p[1])
  })
  const total = seg.reduce((a, b) => a + b, 0)
  const out: Pt[] = []
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length]
    const steps = Math.max(1, Math.round((seg[i] / total) * n))
    for (let s = 0; s < steps; s++) {
      const f = s / steps
      out.push([p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f])
    }
  })
  return out
}

function fit(pts: Pt[], hw: number, hl: number): Pt[] {
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  return pts.map(([x, y]) => [
    ((x - x0) / (x1 - x0) - 0.5) * 2 * hw,
    ((y - y0) / (y1 - y0) - 0.5) * 2 * hl,
  ])
}

/** Outline pushed outward by `d` along its normals (for halos and bezels). */
export function offsetOutline(pts: Pt[], d: number): Pt[] {
  // Orientation-independent: push away from the centroid side of each edge.
  const area = pts.reduce((a, p, i) => {
    const q = pts[(i + 1) % pts.length]
    return a + p[0] * q[1] - q[0] * p[1]
  }, 0)
  const sign = area > 0 ? 1 : -1
  return pts.map((p, i) => {
    const prev = pts[(i - 1 + pts.length) % pts.length]
    const next = pts[(i + 1) % pts.length]
    let tx = next[0] - prev[0]
    let ty = next[1] - prev[1]
    const len = Math.hypot(tx, ty) || 1
    tx /= len
    ty /= len
    // Outward normal of a counter-clockwise polygon is (ty, -tx).
    return [p[0] + sign * ty * d, p[1] - sign * tx * d]
  })
}

export function perimeter(pts: Pt[]) {
  return pts.reduce((a, p, i) => {
    const q = pts[(i + 1) % pts.length]
    return a + Math.hypot(q[0] - p[0], q[1] - p[1])
  }, 0)
}

/** Points spaced `count` evenly along a closed polygon by arc length. */
export function alongPerimeter(pts: Pt[], count: number): Pt[] {
  const total = perimeter(pts)
  const out: Pt[] = []
  let i = 0
  let acc = 0
  for (let k = 0; k < count; k++) {
    const target = (k / count) * total
    while (true) {
      const p = pts[i % pts.length]
      const q = pts[(i + 1) % pts.length]
      const len = Math.hypot(q[0] - p[0], q[1] - p[1])
      if (acc + len >= target || i > pts.length * 2) {
        const f = len ? (target - acc) / len : 0
        out.push([p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f])
        break
      }
      acc += len
      i++
    }
  }
  return out
}
