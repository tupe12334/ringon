// Anonymous usage counters on hits.sh (no cookies, no signup, no id sent); see README "Privacy".
// ringon = page loads; ringon-users = first visit per browser; ringon-daily-users = first visit
// per browser per hits.sh day. hits.sh buckets days in Korea time (UTC+9, seen live
// 2026-11-01: a 15:25 UTC hit landed in the 2026-11-02 bucket), so the daily rule uses it too. Counts are read at
// https://hits.sh/api/urns/<host>/<counter>, which does not add a hit.

export const LIVE_HOST = 'tupe12334.github.io'

export type Store = Pick<Storage, 'getItem' | 'setItem'>

// en-CA formats as YYYY-MM-DD, the same form as hits.sh's day keys.
const hitsDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' })

/**
 * Picks the counters to ping for this page load and records what it counted.
 * @param host page hostname; only the live host counts
 * @param store browser storage, or undefined when it is blocked
 * @param now current time (its hits.sh day decides the daily count)
 * @returns counter names to ping
 */
export function countersToPing(host: string, store: Store | undefined, now: Date): string[] {
  if (host !== LIVE_HOST) return [] // dev and tests never count
  const names = ['ringon']
  if (!store) return names
  if (!store.getItem('ringon-counted')) {
    store.setItem('ringon-counted', '1')
    names.push('ringon-users')
  }
  const today = hitsDay.format(now)
  if (store.getItem('ringon-counted-day') !== today) {
    store.setItem('ringon-counted-day', today)
    names.push('ringon-daily-users')
  }
  return names
}

/** Pings the hits.sh counters for this page load. */
export function countUsage(): void {
  let store: Store | undefined
  try {
    store = localStorage
    store.getItem('ringon-counted') // throws when storage is blocked
  } catch {
    store = undefined
  }
  for (const name of countersToPing(location.hostname, store, new Date()))
    new Image().src = `https://hits.sh/${LIVE_HOST}/${name}.svg`
}
