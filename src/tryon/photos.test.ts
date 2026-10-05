// The ring pose on real photos of hands (e2e/fixtures/photos), against what the photos show:
// where real rings sit, how wide the finger is, which side of the hand faces the camera.
// landmarks.json holds what MediaPipe found in each photo (refresh with e2e/photos.spec.ts);
// truth.json was measured by hand on the photos.

import { describe, expect, it } from 'vitest'
import landmarks from '../../e2e/fixtures/photos/landmarks.json'
import truth from '../../e2e/fixtures/photos/truth.json'
import { computePose, PalmSideVote, palmSideEvidence, worldToScreen, type Finger, type Lm, type View } from './pose'

interface Truth {
  /** Centre of the real ring worn on this finger, image px. */
  ringCentre?: [number, number]
  /** Finger width at the ring, image px. */
  fingerWidthPx?: number
  facing?: 'back' | 'palm'
  /** The finger lies flat to the camera: a ring on it shows as a band, not a loop. */
  flatFinger?: boolean
  /** Finger the real ring is on, when not the ring finger. */
  finger?: Finger
  /** Added after the pose constants were calibrated on the other photos. */
  holdout?: boolean
}

const INNER_DIAMETER_MM = 17
const toLm = (a: number[][]): Lm[] => a.map(([x, y, z]) => ({ x, y, z }))

const cases = Object.entries(landmarks as Record<string, { view: View; image: number[][]; world: number[][] }>).map(([photo, hand]) => {
  const world = toLm(hand.world)
  const t = (truth as unknown as Record<string, Truth>)[photo] ?? {}
  const palmSide = new PalmSideVote().update(palmSideEvidence(worldToScreen(world, false)), 1)
  const pose = computePose({ image: toLm(hand.image), world, palmSide, finger: t.finger ?? 'ring', along: 0.6, flip: false, innerDiameterMm: INNER_DIAMETER_MM }, hand.view)!
  const { width, height } = hand.view
  // Screen frame (centre origin, y up) → image px.
  const centre: [number, number] = [pose.position.x + width / 2, height / 2 - pose.position.y]
  return { photo, pose, centre, fingerPx: pose.pxPerMm * INNER_DIAMETER_MM, truth: t }
})

describe('ring pose on real photos', () => {
  it('has a case per photo, some held out from calibration', () => {
    expect(cases.length).toBeGreaterThanOrEqual(20)
    expect(cases.filter((c) => c.truth.holdout).length).toBeGreaterThanOrEqual(8)
  })

  it.each(cases.filter((c) => c.truth.fingerWidthPx).map((c) => [c.photo, c]))('%s: ring fits the finger', (_, c) => {
    expect(c.fingerPx / c.truth.fingerWidthPx!).toBeGreaterThan(0.8)
    expect(c.fingerPx / c.truth.fingerWidthPx!).toBeLessThan(1.2)
  })

  it.each(cases.filter((c) => c.truth.ringCentre).map((c) => [c.photo, c]))('%s: ring sits where the real one does', (_, c) => {
    const [x, y] = c.truth.ringCentre!
    expect(Math.hypot(c.centre[0] - x, c.centre[1] - y)).toBeLessThan(0.65 * (c.truth.fingerWidthPx ?? c.fingerPx))
  })

  it.each(cases.filter((c) => c.truth.facing).map((c) => [c.photo, c]))('%s: stone on the back of the hand', (_, c) => {
    if (c.truth.facing === 'back') expect(c.pose.dorsal.z).toBeGreaterThan(0.2)
    else expect(c.pose.dorsal.z).toBeLessThan(-0.2)
  })

  it.each(cases.filter((c) => c.truth.flatFinger).map((c) => [c.photo, c]))('%s: band lies flat on a flat finger', (_, c) => {
    expect(Math.abs(c.pose.axis.z)).toBeLessThan(0.5)
  })
})
