// The hand as invisible depth-only geometry: the parts of the ring behind a finger, a bent
// joint or the palm stay hidden, as on a real hand.

import * as THREE from 'three'
import { coverLayout, SEGMENT, toScreen, worldToScreen, type Finger, type Lm, type View } from './pose'

/** Landmark pairs drawn as capsules: every finger bone plus a web across the palm. */
export const HAND_BONES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [5, 6], [6, 7], [7, 8],
  [9, 10], [10, 11], [11, 12],
  [13, 14], [14, 15], [15, 16],
  [17, 18], [18, 19], [19, 20],
  [0, 5], [0, 9], [0, 13], [0, 17], [5, 9], [9, 13], [13, 17], [1, 5],
]

/** Bones to draw for a ring on `finger`: its own segment is covered by the ring's own cylinder. */
export const occluderBones = (finger: Finger) => {
  const [a, b] = SEGMENT[finger]
  return HAND_BONES.filter(([i, j]) => !(i === a && j === b))
}

/**
 * All 21 landmarks in the screen frame (CSS px), with depth relative to the ring centre (which
 * the ring is drawn at, z = 0). x, y come from the image; depth from the world landmarks, scaled
 * by how many image pixels one world unit spans across the hand.
 */
export function handJoints(image: Lm[], world: Lm[], view: View, finger: Finger, along: number): THREE.Vector3[] | null {
  if (image.length < 21 || world.length < 21) return null
  const layout = coverLayout(view)
  const P = image.map((l) => toScreen(l, view, layout))
  const W = worldToScreen(world, view.mirrored)
  let px = 0
  let wu = 0
  for (const [i, j] of HAND_BONES) {
    px += Math.hypot(P[i].x - P[j].x, P[i].y - P[j].y)
    wu += Math.hypot(W[i].x - W[j].x, W[i].y - W[j].y)
  }
  if (wu < 1e-9) return null
  const k = px / wu
  const [a, b] = SEGMENT[finger]
  const z0 = THREE.MathUtils.lerp(W[a].z, W[b].z, along)
  return P.map((p, i) => p.setZ((W[i].z - z0) * k))
}

export const UNIT_CYLINDER = new THREE.CylinderGeometry(1, 1, 1, 16)
export const UNIT_SPHERE = new THREE.SphereGeometry(1, 16, 12)
/** Writes depth only: hides what is behind it and shows the camera image through it. */
export const DEPTH_ONLY = new THREE.MeshBasicMaterial({ colorWrite: false })
const UP = new THREE.Vector3(0, 1, 0)

/**
 * Lays a group of capsule meshes (one per bone, then one per joint) onto `joints`, shifted by
 * `shift` (to follow the smoothed ring).
 */
export function placeHand(group: THREE.Group, joints: THREE.Vector3[], bones: [number, number][], radius: number, shift: THREE.Vector3) {
  const dir = new THREE.Vector3()
  bones.forEach(([i, j], n) => {
    const m = group.children[n]
    dir.subVectors(joints[j], joints[i])
    const len = dir.length()
    m.position.addVectors(joints[i], joints[j]).multiplyScalar(0.5).add(shift)
    m.quaternion.setFromUnitVectors(UP, len > 1e-6 ? dir.divideScalar(len) : UP)
    m.scale.set(radius, len, radius)
  })
  joints.forEach((p, i) => {
    const m = group.children[bones.length + i]
    m.position.copy(p).add(shift)
    m.scale.setScalar(radius)
  })
  group.visible = true
}
