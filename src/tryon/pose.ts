// Turns MediaPipe hand landmarks into a ring pose on screen.
//
// Screen frame (three.js orthographic camera, units = CSS pixels): origin at the centre of the
// viewport, +x right, +y up, +z toward the viewer. The ring model's frame is: finger along +Y,
// stone on +Z. We build a rotation that maps it onto the finger: Y → along the finger,
// Z → the back of the hand.

import * as THREE from 'three'

export interface Lm {
  x: number
  y: number
  z: number
}

export const FINGERS = ['thumb', 'index', 'middle', 'ring', 'pinky'] as const
export type Finger = (typeof FINGERS)[number]

/** Landmarks of the base joint and the next joint of each finger. */
export const SEGMENT: Record<Finger, [number, number]> = {
  thumb: [2, 3],
  index: [5, 6],
  middle: [9, 10],
  ring: [13, 14],
  pinky: [17, 18],
}

/** Neighbouring knuckles (MCP joints): their spacing is about one finger width. */
const KNUCKLE_PAIRS: [number, number][] = [
  [5, 9],
  [9, 13],
  [13, 17],
]

/**
 * Finger width relative to knuckle spacing, measured on adult hands at the ring position.
 * The try-on "Fit" slider corrects individual hands.
 */
export const FINGER_TO_KNUCKLE_SPACING = 0.78

export interface View {
  /** Video frame size, px. */
  videoWidth: number
  videoHeight: number
  /** Viewport (canvas) size, CSS px. */
  width: number
  height: number
  /** Front camera: the image is shown mirrored. */
  mirrored: boolean
}

export interface PoseInput {
  image: Lm[]
  world: Lm[]
  /**
   * Which side of the knuckle plane the palm is on: +1 when (index − wrist) × (pinky − wrist)
   * points out of the palm, −1 when it points out of the back. See PalmSideVote.
   */
  palmSide: 1 | -1
  finger: Finger
  /** 0 = at the knuckle, 1 = at the middle joint. */
  along: number
  /** User override when the stone shows on the palm side. */
  flip: boolean
  /** Ring inner diameter, mm: the ring is drawn so this matches the finger's width. */
  innerDiameterMm: number
}

export interface RingPose {
  position: THREE.Vector3
  quaternion: THREE.Quaternion
  /** CSS px per millimetre at the hand. */
  pxPerMm: number
  /** Unit vectors (screen frame), exposed for smoothing and tests. */
  axis: THREE.Vector3
  dorsal: THREE.Vector3
}

/** How the video is laid out to cover the viewport (like CSS object-fit: cover). */
export function coverLayout(v: View) {
  const s = Math.max(v.width / v.videoWidth, v.height / v.videoHeight)
  const w = v.videoWidth * s
  const h = v.videoHeight * s
  return { scale: s, width: w, height: h, offsetX: (v.width - w) / 2, offsetY: (v.height - h) / 2 }
}

/** Normalised image landmark → screen point. */
export function toScreen(l: Lm, v: View, layout = coverLayout(v)) {
  const x = v.mirrored ? 1 - l.x : l.x
  const px = layout.offsetX + x * layout.width
  const py = layout.offsetY + l.y * layout.height
  return new THREE.Vector3(px - v.width / 2, v.height / 2 - py, 0)
}

/** World landmark (metres; x right, y down, z away from camera) → screen-frame direction. */
const toScreenDir = (l: Lm, mirrored: boolean) => new THREE.Vector3(mirrored ? -l.x : l.x, -l.y, -l.z)

export function computePose(input: PoseInput, view: View): RingPose | null {
  const { image, world } = input
  if (image.length < 21 || world.length < 21) return null
  const layout = coverLayout(view)
  const [a, b] = SEGMENT[input.finger]

  const W = worldToScreen(world, view.mirrored)
  const axis = new THREE.Vector3().subVectors(W[b], W[a])
  if (axis.lengthSq() < 1e-10) return null
  axis.normalize()

  // Back-of-hand normal from the palm triangle (wrist, index base, pinky base).
  const dorsal = knuckleNormal(W).multiplyScalar(-input.palmSide)
  if (input.flip) dorsal.negate()
  dorsal.addScaledVector(axis, -dorsal.dot(axis))
  if (dorsal.lengthSq() < 1e-12) return null
  dorsal.normalize()

  const x = new THREE.Vector3().crossVectors(axis, dorsal)
  const m = new THREE.Matrix4().makeBasis(x, axis, dorsal)
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(m)

  const pa = toScreen(image[a], view, layout)
  const pb = toScreen(image[b], view, layout)
  const position = pa.clone().lerp(pb, input.along)

  // Scale from the knuckle spacing in the image. MediaPipe's metric world landmarks are not
  // reliable in absolute size, but their directions tell how foreshortened the spacing is.
  let spacingPx = 0
  for (const [i, j] of KNUCKLE_PAIRS) {
    const p = toScreen(image[i], view, layout).sub(toScreen(image[j], view, layout))
    const w = new THREE.Vector3().subVectors(W[i], W[j])
    const inPlane = w.length() > 1e-9 ? Math.hypot(w.x, w.y) / w.length() : 1
    spacingPx += Math.hypot(p.x, p.y) / Math.max(inPlane, 0.35)
  }
  spacingPx /= KNUCKLE_PAIRS.length
  if (spacingPx < 1) return null
  const pxPerMm = (spacingPx * FINGER_TO_KNUCKLE_SPACING) / input.innerDiameterMm

  return { position, quaternion, pxPerMm, axis, dorsal }
}

/** World landmarks in the screen frame (mirrored like the image when it is). */
export function worldToScreen(world: Lm[], mirrored: boolean) {
  return world.map((l) => toScreenDir(l, mirrored))
}

/** Unit normal of the knuckle plane: (index base − wrist) × (pinky base − wrist). */
function knuckleNormal(W: THREE.Vector3[]) {
  const v5 = new THREE.Vector3().subVectors(W[5], W[0])
  const v17 = new THREE.Vector3().subVectors(W[17], W[0])
  return new THREE.Vector3().crossVectors(v5, v17).normalize()
}

const FINGER_CHAINS: [number, number, number, number][] = [
  [5, 6, 7, 8],
  [9, 10, 11, 12],
  [13, 14, 15, 16],
  [17, 18, 19, 20],
]

/**
 * Evidence for PalmSideVote from one frame, in −1..1: positive when the knuckle-plane normal
 * points out of the palm. Fingers only bend toward the palm, so the bend of the middle and end
 * joints shows where the palm is, whatever the hand's left/right label says (MediaPipe's label
 * proved unreliable on real footage). Near zero for a perfectly flat hand.
 */
export function palmSideEvidence(W: THREE.Vector3[]) {
  const toPalm = new THREE.Vector3()
  const along = new THREE.Vector3()
  const seg = new THREE.Vector3()
  for (const [mcp, pip, dip, tip] of FINGER_CHAINS) {
    along.subVectors(W[pip], W[mcp]).normalize()
    for (const [from, to] of [
      [pip, dip],
      [dip, tip],
    ]) {
      seg.subVectors(W[to], W[from])
      toPalm.add(seg.addScaledVector(along, -seg.dot(along)))
    }
  }
  const bend = toPalm.length()
  if (bend < 1e-9) return 0
  const agreement = knuckleNormal(W).dot(toPalm.divideScalar(bend))
  // Full weight from ~2 cm of total bend (metres); a nearly flat hand counts for little.
  return agreement * Math.min(1, bend / 0.02)
}

/**
 * Accumulates per-frame evidence of which side the palm is on. A hand can't change sides
 * mid-shot, so brief mistakes (motion blur, a fist) don't flip the ring; sustained evidence
 * (the other hand came in) does.
 */
export class PalmSideVote {
  private score = 0
  private side: 1 | -1 | null = null
  private readonly limit: number

  constructor(limit = 6) {
    this.limit = limit
  }

  /** `evidence` from palmSideEvidence; `fallback` used until there is some (e.g. from the label). */
  update(evidence: number, fallback: 1 | -1): 1 | -1 {
    this.score = Math.max(-this.limit, Math.min(this.limit, this.score + evidence))
    if (this.side === null) {
      if (Math.abs(this.score) < 0.3) return fallback
      this.side = this.score > 0 ? 1 : -1
    } else if (this.side === 1 && this.score < -this.limit / 2) this.side = -1
    else if (this.side === -1 && this.score > this.limit / 2) this.side = 1
    return this.side
  }

  reset() {
    this.score = 0
    this.side = null
  }
}

/** Palm side implied by MediaPipe's label: a weak fallback for a perfectly flat hand. */
export function palmSideFromLabel(label: string, mirrored: boolean): 1 | -1 {
  // For a hand that looks right-handed on screen, the knuckle normal points out of the palm.
  return (label === 'Right') !== mirrored ? 1 : -1
}
