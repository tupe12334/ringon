import { describe, expect, it } from 'vitest'
import { exposureFor, meanLuminance } from './cameraExposure'

describe('camera lighting', () => {
  it('measures frame brightness', () => {
    const px = (r: number, g: number, b: number) => [r, g, b, 255]
    expect(meanLuminance(new Uint8ClampedArray([...px(255, 255, 255), ...px(0, 0, 0)]))).toBeCloseTo(0.5)
    expect(meanLuminance(new Uint8ClampedArray(px(0, 255, 0)))).toBeCloseTo(0.7152)
  })

  it('keeps a mid-grey room at normal exposure', () => {
    expect(exposureFor(0.45)).toBeCloseTo(1)
  })

  it('dims in a dark room and brightens in a bright one, within limits', () => {
    expect(exposureFor(0.15)).toBeLessThan(1)
    expect(exposureFor(0.8)).toBeGreaterThan(1)
    expect(exposureFor(0.001)).toBe(0.6)
    expect(exposureFor(5)).toBe(1.4)
  })

  it('falls back to normal exposure for an empty or broken frame', () => {
    expect(exposureFor(0)).toBe(1)
    expect(exposureFor(Number.NaN)).toBe(1)
  })
})
