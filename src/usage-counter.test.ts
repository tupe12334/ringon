import { describe, expect, it } from 'vitest'
import { countersToPing, LIVE_HOST, type Store } from './usage-counter'

const memory = (): Store => {
  const m = new Map<string, string>()
  return {
    getItem: (k: string): string | null => m.get(k) ?? null,
    setItem: (k: string, v: string): void => void m.set(k, v),
  }
}
const day1 = new Date('2026-11-01T23:59:00Z')
const day2 = new Date('2026-11-02T00:01:00Z')

describe('usage counters', () => {
  it('counts a visit, a user and a daily user on the first load', () => {
    expect(countersToPing(LIVE_HOST, memory(), day1)).toEqual(['ringon', 'ringon-users', 'ringon-daily-users'])
  })

  it('counts only the visit on a reload the same UTC day', () => {
    const store = memory()
    countersToPing(LIVE_HOST, store, day1)
    expect(countersToPing(LIVE_HOST, store, day1)).toEqual(['ringon'])
  })

  it('counts the daily user again on the next UTC day, not the user', () => {
    const store = memory()
    countersToPing(LIVE_HOST, store, day1)
    expect(countersToPing(LIVE_HOST, store, day2)).toEqual(['ringon', 'ringon-daily-users'])
  })

  it('counts only visits when storage is blocked', () => {
    expect(countersToPing(LIVE_HOST, undefined, day1)).toEqual(['ringon'])
  })

  it('never counts off the live site', () => {
    expect(countersToPing('localhost', memory(), day1)).toEqual([])
  })
})
