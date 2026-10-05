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
const SEGMENT: Record<Finger, [number, number]> = {
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
  /** MediaPipe handedness label ("Left" / "Right"). */
  handedness: string
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

/**
 * Whether the hand *as displayed* looks like a right hand. MediaPipe Tasks (web) labels the
 * hand as it appears in the frame it was given (verified on MediaPipe's own right_hands.jpg
 * test image); showing that frame mirrored swaps it.
 */
export function appearsRightHanded(label: string, mirrored: boolean) {
  return (label === 'Right') !== mirrored
}

export function computePose(input: PoseInput, view: View): RingPose | null {
  const { image, world } = input
  if (image.length < 21 || world.length < 21) return null
  const layout = coverLayout(view)
  const [a, b] = SEGMENT[input.finger]

  const W = world.map((l) => toScreenDir(l, view.mirrored))
  const axis = new THREE.Vector3().subVectors(W[b], W[a])
  if (axis.lengthSq() < 1e-10) return null
  axis.normalize()

  // Back-of-hand normal from the palm triangle (wrist, index base, pinky base).
  const v5 = new THREE.Vector3().subVectors(W[5], W[0])
  const v17 = new THREE.Vector3().subVectors(W[17], W[0])
  const right = appearsRightHanded(input.handedness, view.mirrored)
  // For a right hand, index×pinky (from the wrist) is the palm normal; the back is opposite.
  const dorsal = right ? new THREE.Vector3().crossVectors(v17, v5) : new THREE.Vector3().crossVectors(v5, v17)
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
