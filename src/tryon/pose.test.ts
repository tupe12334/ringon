import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { appearsRightHanded, computePose, coverLayout, FINGER_TO_KNUCKLE_SPACING, toScreen, type Lm, type View } from './pose'

// A right hand held up, palm facing the camera (a "stop" gesture), in MediaPipe's world frame:
// metres, x right, y down, z away from the camera. Seen by the camera, the thumb is on the
// image's right.
function rightHandPalmToCamera(): Lm[] {
  const w: Lm[] = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }))
  w[0] = { x: 0, y: 0.08, z: 0 }
  w[2] = { x: 0.04, y: 0.05, z: 0 }
  w[3] = { x: 0.055, y: 0.03, z: 0 }
  w[5] = { x: 0.03, y: 0, z: 0 }
  w[6] = { x: 0.03, y: -0.035, z: 0 }
  w[9] = { x: 0.01, y: 0, z: 0 }
  w[10] = { x: 0.01, y: -0.04, z: 0 }
  w[13] = { x: -0.01, y: 0, z: 0 }
  w[14] = { x: -0.01, y: -0.035, z: 0 }
  w[17] = { x: -0.03, y: 0, z: 0 }
  w[18] = { x: -0.03, y: -0.02, z: 0 }
  return w
}

/** Image landmarks for a hand 20 cm wide in a square frame: 5 normalised units per metre. */
const toImage = (w: Lm[]) => w.map((l) => ({ x: 0.5 + l.x * 5, y: 0.5 + l.y * 5, z: l.z }))

const square: View = { videoWidth: 1000, videoHeight: 1000, width: 1000, height: 1000, mirrored: false }

describe('handedness', () => {
  it('follows the label, swapped when the image is shown mirrored', () => {
    expect(appearsRightHanded('Right', false)).toBe(true)
    expect(appearsRightHanded('Right', true)).toBe(false)
    expect(appearsRightHanded('Left', true)).toBe(true)
  })
})

describe('ring pose', () => {
  const world = rightHandPalmToCamera()
  const image = toImage(world)
  const base = { image, world, finger: 'ring' as const, along: 0.4, flip: false, innerDiameterMm: 17 }

  it('puts the stone on the back of the hand (away from a camera facing the palm)', () => {
    const pose = computePose({ ...base, handedness: 'Right' }, square)!
    expect(pose.dorsal.z).toBeLessThan(-0.99)
    expect(pose.axis.y).toBeGreaterThan(0.99) // finger points up the screen
  })

  it('is consistent when the front camera mirrors the image', () => {
    const pose = computePose({ ...base, handedness: 'Right' }, { ...square, mirrored: true })!
    expect(pose.dorsal.z).toBeLessThan(-0.99)
  })

  it('flips on request', () => {
    const pose = computePose({ ...base, handedness: 'Right', flip: true }, square)!
    expect(pose.dorsal.z).toBeGreaterThan(0.99)
  })

  it('places the ring between the knuckle and the middle joint', () => {
    const pose = computePose({ ...base, handedness: 'Right' }, square)!
    const mcp = toScreen(image[13], square)
    const pip = toScreen(image[14], square)
    expect(pose.position.x).toBeCloseTo(mcp.x, 3)
    expect(pose.position.y).toBeCloseTo(mcp.y + (pip.y - mcp.y) * 0.4, 3)
  })

  it('sizes the ring to the finger from the knuckle spacing', () => {
    // Knuckles 20 mm apart → 0.1 image units → 100 px; finger ≈ 78 px wide; 17 mm ring.
    const pose = computePose({ ...base, handedness: 'Right' }, square)!
    expect(pose.pxPerMm).toBeCloseTo((100 * FINGER_TO_KNUCKLE_SPACING) / 17, 2)
  })

  it('undoes foreshortening when the hand is turned away', () => {
    // Rotate the hand 60° about the vertical axis: knuckle spacing halves on screen.
    const turned = world.map((l) => ({ x: l.x * 0.5, y: l.y, z: l.x * Math.sin(Math.PI / 3) }))
    const pose = computePose({ ...base, world: turned, image: toImage(turned), handedness: 'Right' }, square)!
    expect(pose.pxPerMm).toBeCloseTo((100 * FINGER_TO_KNUCKLE_SPACING) / 17, 1)
  })

  it('maps the ring model axes onto the finger', () => {
    const pose = computePose({ ...base, handedness: 'Right' }, square)!
    const fingerDir = new THREE.Vector3(0, 1, 0).applyQuaternion(pose.quaternion)
    const stoneDir = new THREE.Vector3(0, 0, 1).applyQuaternion(pose.quaternion)
    expect(fingerDir.distanceTo(pose.axis)).toBeLessThan(1e-6)
    expect(stoneDir.distanceTo(pose.dorsal)).toBeLessThan(1e-6)
  })

  it('handles a partial hand', () => {
    expect(computePose({ ...base, image: image.slice(0, 5), handedness: 'Right' }, square)).toBeNull()
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
