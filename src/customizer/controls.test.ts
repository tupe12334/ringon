import { describe, expect, it } from 'vitest'
import { rulerTicks } from './controls'

describe('rulerTicks', () => {
  it('marks every step of a short ruler', () => expect(rulerTicks(0, 90, 15)).toBe(6))
  it('groups steps on a long ruler, evenly, at most 40', () => {
    expect(rulerTicks(0.25, 5, 0.05)).toBe(19)
    expect(rulerTicks(0, 4, 0.05)).toBe(40)
    expect(rulerTicks(0, 1, 0.01)).toBeLessThanOrEqual(40)
  })
})
