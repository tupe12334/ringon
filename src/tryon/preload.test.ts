import { describe, expect, it, vi } from 'vitest'
import { importTryOn, preloadAllowed, preloadTryOn } from './preload'

const prefetch = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const loaded = vi.hoisted(() => vi.fn())
vi.mock('./TryOn', () => (loaded(), { TryOn: () => null }))
vi.mock('./tracker', () => ({ prefetchHandTracking: prefetch }))

describe('preloadAllowed', () => {
  it('preloads on a normal or unknown connection', () => {
    expect(preloadAllowed(undefined)).toBe(true)
    expect(preloadAllowed({ effectiveType: '4g' })).toBe(true)
    expect(preloadAllowed({ effectiveType: '3g', saveData: false })).toBe(true)
  })
  it('skips with data saver or on 2G', () => {
    expect(preloadAllowed({ saveData: true, effectiveType: '4g' })).toBe(false)
    expect(preloadAllowed({ effectiveType: '2g' })).toBe(false)
    expect(preloadAllowed({ effectiveType: 'slow-2g' })).toBe(false)
  })
})

describe('preloadTryOn', () => {
  it('loads the chunk and the hand-tracking files once, and lazy() reuses the chunk', async () => {
    const chunk = importTryOn()
    preloadTryOn()
    preloadTryOn()
    expect(importTryOn()).toBe(chunk)
    await vi.waitFor(() => expect(prefetch).toHaveBeenCalledTimes(1))
    preloadTryOn()
    await chunk
    expect(prefetch).toHaveBeenCalledTimes(1)
    expect(loaded).toHaveBeenCalledTimes(1)
  })
})
