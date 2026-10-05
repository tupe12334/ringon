import { describe, expect, it } from 'vitest'
import { isPausedForSlowness, isPhotorealOn, markTooSlow, SampleTimer, togglePhotoreal, type PhotorealState } from './photoreal'

const fresh: PhotorealState = { stored: true, tooSlow: false, forced: false }

describe('photoreal state', () => {
  it('is on by default and toggles off and on', () => {
    expect(isPhotorealOn(fresh)).toBe(true)
    const off = togglePhotoreal(fresh)
    expect(isPhotorealOn(off)).toBe(false)
    expect(off.stored).toBe(false)
    expect(isPhotorealOn(togglePhotoreal(off))).toBe(true)
  })

  it('pauses on a slow device and says so', () => {
    const slow = markTooSlow(fresh)
    expect(isPhotorealOn(slow)).toBe(false)
    expect(isPausedForSlowness(slow)).toBe(true)
  })

  it('stays on once the user insists, even if still slow', () => {
    const insisted = togglePhotoreal(markTooSlow(fresh))
    expect(isPhotorealOn(insisted)).toBe(true)
    expect(isPausedForSlowness(insisted)).toBe(false)
    expect(isPhotorealOn(markTooSlow(insisted))).toBe(true)
  })

  it('turning it off clears the insistence; turning on again insists again', () => {
    const insisted = togglePhotoreal(markTooSlow(fresh))
    const off = togglePhotoreal(insisted)
    expect(off).toEqual({ stored: false, tooSlow: true, forced: false })
    expect(isPausedForSlowness(off)).toBe(false) // the user chose off; no "paused" note
    expect(isPhotorealOn(togglePhotoreal(off))).toBe(true)
  })
})

describe('sample timer', () => {
  it('ignores the first samples (shader compile, BVH upload)', () => {
    const t = new SampleTimer(120, 4, 3)
    for (let i = 0; i < 3; i++) expect(t.record(2000)).toBe(false)
    for (let i = 0; i < 3; i++) expect(t.record(10)).toBe(false)
    expect(t.record(10)).toBe(false)
  })

  it('flags a device whose samples average over the limit', () => {
    const t = new SampleTimer(120, 4, 0)
    expect([200, 200, 200].map((ms) => t.record(ms))).toEqual([false, false, false])
    expect(t.record(200)).toBe(true)
  })

  it('starts over after a reset', () => {
    const t = new SampleTimer(120, 2, 1)
    t.record(500)
    t.record(500)
    t.reset()
    expect(t.record(500)).toBe(false) // skipped again
  })
})
