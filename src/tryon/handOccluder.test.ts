import { describe, expect, it } from 'vitest'
import { handJoints, occluderBones } from './handOccluder'
import type { Lm, View } from './pose'

const view: View = { videoWidth: 1000, videoHeight: 1000, width: 1000, height: 1000, mirrored: false }

// A flat hand (metres) whose ring finger's middle joint bends 2 cm toward the camera.
function hand(): Lm[] {
  const w: Lm[] = Array.from({ length: 21 }, (_, i) => ({ x: 0.002 * i, y: 0.08 - 0.004 * i, z: 0 }))
  w[13] = { x: 0, y: 0, z: 0 }
  w[14] = { x: 0, y: -0.04, z: 0 }
  w[15] = { x: 0, y: -0.06, z: -0.02 }
  return w
}
// Image: the same hand seen by an orthographic camera, 5000 px per metre, centred.
const image = (w: Lm[]) => w.map((l) => ({ x: 0.5 + l.x * 5, y: 0.5 + l.y * 5, z: 0 }))

describe('handJoints', () => {
  it('places joints at their image position, with depth in the same pixels relative to the ring', () => {
    const w = hand()
    const J = handJoints(image(w), w, view, 'ring', 0.5)!
    // The ring sits halfway along 13→14, at depth 0.
    expect(J[13].z).toBeCloseTo(0)
    expect(J[13].y).toBeCloseTo(0)
    expect(J[14].y).toBeCloseTo(200)
    // 2 cm toward the camera = 100 px toward the viewer (+z).
    expect(J[15].z).toBeCloseTo(100)
  })

  it('leaves the ring finger’s own segment to the ring’s cylinder', () => {
    const bones = occluderBones('ring')
    expect(bones).not.toContainEqual([13, 14])
    expect(bones).toContainEqual([14, 15])
    expect(bones).toContainEqual([9, 10])
  })
})
