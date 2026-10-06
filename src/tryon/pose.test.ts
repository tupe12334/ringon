import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import {
  computePose,
  coverLayout,
  FINGER_TO_KNUCKLE_SPACING,
  PalmSideVote,
  palmSideEvidence,
  palmSideFromLabel,
  toScreen,
  worldToScreen,
  type Lm,
  type View,
} from './pose'

// A right hand held up, palm facing the camera (a "stop" gesture), fingers slightly curled, in
// MediaPipe's world frame: metres, x right, y down, z away from the camera. Seen by the camera,
// the thumb is on the image's right, and the fingertips curl toward the camera.
function rightHandPalmToCamera(): Lm[] {
  const w: Lm[] = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }))
  w[0] = { x: 0, y: 0.08, z: 0 }
  w[2] = { x: 0.04, y: 0.05, z: 0 }
  w[3] = { x: 0.055, y: 0.03, z: 0 }
  const fingers: [number, number][] = [
    [5, 0.03],
    [9, 0.01],
    [13, -0.01],
    [17, -0.03],
  ]
  for (const [mcp, x] of fingers) {
    w[mcp] = { x, y: 0, z: 0 }
    w[mcp + 1] = { x, y: -0.035, z: 0 }
    w[mcp + 2] = { x, y: -0.055, z: -0.008 }
    w[mcp + 3] = { x, y: -0.07, z: -0.02 }
  }
  return w
}

/** The same hand turned 180° about the vertical: back of the hand to the camera. */
const turnAround = (w: Lm[]) => w.map((l) => ({ x: -l.x, y: l.y, z: -l.z }))

/** Image landmarks for a hand 20 cm wide in a square frame: 5 normalised units per metre. */
const toImage = (w: Lm[]) => w.map((l) => ({ x: 0.5 + l.x * 5, y: 0.5 + l.y * 5, z: l.z }))

const square: View = { videoWidth: 1000, videoHeight: 1000, width: 1000, height: 1000, mirrored: false }

/** What the app does each frame: decide the palm side from the finger bend, then the pose. */
function poseFor(world: Lm[], view: View, extra: Partial<Parameters<typeof computePose>[0]> = {}) {
  const palmSide = new PalmSideVote().update(palmSideEvidence(worldToScreen(world, view.mirrored)), 1)
  return computePose(
    { image: toImage(world), world, palmSide, finger: 'ring', along: 0.4, flip: false, innerDiameterMm: 17, ...extra },
    view,
  )!
}

describe('palm side', () => {
  it('is read from the finger bend, so it tells a right hand from a left one', () => {
    const right = palmSideEvidence(worldToScreen(rightHandPalmToCamera(), false))
    const rightTurned = palmSideEvidence(worldToScreen(turnAround(rightHandPalmToCamera()), false))
    // A mirror image of a right hand is a left hand.
    const left = palmSideEvidence(worldToScreen(rightHandPalmToCamera(), true))
    expect(right).toBeGreaterThan(0.5)
    expect(rightTurned).toBeGreaterThan(0.5)
    expect(left).toBeLessThan(-0.5)
  })

  it('falls back to the label for a flat hand', () => {
    expect(palmSideFromLabel('Right', false)).toBe(1)
    expect(palmSideFromLabel('Right', true)).toBe(-1)
    expect(new PalmSideVote().update(0, -1)).toBe(-1)
  })

  it('ignores brief contrary evidence but follows a sustained change', () => {
    const v = new PalmSideVote()
    for (let i = 0; i < 20; i++) v.update(0.9, 1)
    for (let i = 0; i < 5; i++) expect(v.update(-0.9, 1)).toBe(1)
    let side: number = 1
    for (let i = 0; i < 10; i++) side = v.update(-0.9, 1)
    expect(side).toBe(-1)
    v.reset()
    expect(v.update(-0.9, 1)).toBe(-1)
  })
})

describe('ring pose', () => {
  const world = rightHandPalmToCamera()
  const image = toImage(world)

  it('puts the stone on the back of the hand: away from a camera facing the palm', () => {
    const pose = poseFor(world, square)
    expect(pose.dorsal.z).toBeLessThan(-0.95)
    expect(pose.axis.y).toBeGreaterThan(0.95) // finger points up the screen
  })

  it('…and toward a camera facing the back of the hand', () => {
    expect(poseFor(turnAround(world), square).dorsal.z).toBeGreaterThan(0.95)
  })

  it('is consistent when the front camera mirrors the image', () => {
    expect(poseFor(world, { ...square, mirrored: true }).dorsal.z).toBeLessThan(-0.95)
    expect(poseFor(turnAround(world), { ...square, mirrored: true }).dorsal.z).toBeGreaterThan(0.95)
  })

  it('flips on request', () => {
    expect(poseFor(world, square, { flip: true }).dorsal.z).toBeGreaterThan(0.95)
  })

  it('places the ring between the knuckle and the middle joint', () => {
    const pose = poseFor(world, square)
    const mcp = toScreen(image[13], square)
    const pip = toScreen(image[14], square)
    expect(pose.position.x).toBeCloseTo(mcp.x, 3)
    expect(pose.position.y).toBeCloseTo(mcp.y + (pip.y - mcp.y) * 0.4, 3)
  })

  it('sizes the ring to the finger from the hand in the image', () => {
    // Knuckles 20 mm apart → 0.1 image units → 100 px; finger ≈ 78 px wide; 17 mm ring.
    expect(poseFor(world, square).pxPerMm).toBeCloseTo((100 * FINGER_TO_KNUCKLE_SPACING) / 17, 2)
  })

  it('undoes foreshortening when the hand is turned away', () => {
    // Rotate the hand 60° about the vertical axis: knuckle spacing halves on screen.
    const turned = world.map((l) => ({ x: l.x * 0.5 - l.z * Math.sin(Math.PI / 3), y: l.y, z: l.x * Math.sin(Math.PI / 3) + l.z * 0.5 }))
    // The palm's length is unchanged, so the size holds.
    expect(poseFor(turned, square).pxPerMm / ((100 * FINGER_TO_KNUCKLE_SPACING) / 17)).toBeCloseTo(1, 1)
  })

  it('maps the ring model axes onto the finger', () => {
    const pose = poseFor(world, square)
    const fingerDir = new THREE.Vector3(0, 1, 0).applyQuaternion(pose.quaternion)
    const stoneDir = new THREE.Vector3(0, 0, 1).applyQuaternion(pose.quaternion)
    expect(fingerDir.distanceTo(pose.axis)).toBeLessThan(1e-6)
    expect(stoneDir.distanceTo(pose.dorsal)).toBeLessThan(1e-6)
  })

  it('handles a partial hand', () => {
    expect(computePose({ image: image.slice(0, 5), world, palmSide: 1, finger: 'ring', along: 0.4, flip: false, innerDiameterMm: 17 }, square)).toBeNull()
  })
})

describe('cover layout', () => {
  it('crops a landscape video to a portrait phone screen', () => {
    const v: View = { videoWidth: 1280, videoHeight: 720, width: 390, height: 844, mirrored: false }
    const l = coverLayout(v)
    expect(l.height).toBeCloseTo(844)
    expect(l.width).toBeGreaterThan(390)
    // The centre of the video is the centre of the screen.
    expect(toScreen({ x: 0.5, y: 0.5, z: 0 }, v).length()).toBeCloseTo(0)
  })
  it('mirrors x for the front camera', () => {
    const v: View = { ...square, mirrored: true }
    expect(toScreen({ x: 0.25, y: 0.5, z: 0 }, v).x).toBeCloseTo(250)
  })
})

