// First-party analytics: events go to POST https://ringon.app/e (worker/index.ts), stored in D1.
// A random id in this browser's storage and a cookie tells returning users apart; links made by "Share" carry
// the sharer's id as ?from= (see withFrom), so we can count who brought whom. Nothing is sent when the browser asks
// not to be tracked (Global Privacy Control or Do Not Track). See README "Privacy".
import { LIVE_HOSTS } from './usage-counter'

const ENDPOINT = 'https://ringon.app/e'
const ID = /^[0-9a-f-]{36}$/

let uid = ''
let sid = ''
let from: string | null = null

const optedOut = () =>
  (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true || navigator.doNotTrack === '1'

function storedId(store: () => Storage, key: string): string {
  try {
    const s = store()
    const v = s.getItem(key)
    if (v && ID.test(v)) return v
    const id = crypto.randomUUID()
    s.setItem(key, id)
    return id
  } catch {
    return crypto.randomUUID() // storage blocked: one id per page load
  }
}

const COOKIE = 'ringon-id'

/** The id in a `document.cookie` string, or null. */
export function cookieId(cookie: string): string | null {
  const v = cookie
    .split(/;\s*/)
    .find((c) => c.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1)
  return v && ID.test(v) ? v : null
}

/** The `document.cookie` assignment that keeps `id` for a year. */
export const idCookie = (id: string) => `${COOKIE}=${id}; Max-Age=31536000; Path=/; SameSite=Lax; Secure`

/**
 * This browser's id, kept in localStorage and a first-party cookie. Some browsers (seen: Chrome on
 * iOS, 2026-11) lose localStorage between visits but keep cookies, and counted as a new user each time.
 */
function userId(): string {
  let id = ''
  try {
    const v = localStorage.getItem(COOKIE)
    if (v && ID.test(v)) id = v
  } catch {
    // storage blocked: try the cookie
  }
  try {
    id ||= cookieId(document.cookie) ?? ''
  } catch {
    // cookies blocked
  }
  id ||= crypto.randomUUID()
  try {
    localStorage.setItem(COOKIE, id)
  } catch {
    // storage blocked
  }
  try {
    document.cookie = idCookie(id) // also renews the year on each visit
  } catch {
    // cookies blocked: one id per page load if storage is blocked too
  }
  return id
}

/**
 * Reads the sharer's id from the query string and strips it. Our own id never goes into the
 * address bar: a reload or bookmark of it, after this browser lost its stored id, would count as a
 * referral from ourselves (seen in D1, 2026-11-09).
 * @param search location.search
 * @param own this user's id, or null when analytics is off
 */
export function swapFrom(search: string, own: string | null): { from: string | null; search: string } {
  const q = new URLSearchParams(search)
  const got = q.get('from')
  q.delete('from')
  const s = q.toString()
  return { from: got && ID.test(got) && got !== own ? got : null, search: s ? `?${s}` : '' }
}

/** Adds this user's id as ?from= to a link they share; unchanged when analytics is off. */
export function withFrom(link: string): string {
  if (!uid) return link
  const url = new URL(link)
  url.searchParams.set('from', uid)
  return url.toString()
}

/** Sends one event; a no-op off the live site or when the user opted out. */
export function track(event: string, props?: Record<string, unknown>): void {
  if (!uid) return
  const body = JSON.stringify({ event, uid, sid, from, props, host: location.hostname, referrer: refHost() })
  try {
    navigator.sendBeacon(ENDPOINT, body) // text/plain: no CORS preflight from the old GitHub Pages host
  } catch {
    // analytics must never break the app
  }
}

function refHost(): string | null {
  try {
    const h = new URL(document.referrer).hostname
    return h && h !== location.hostname ? h : null
  } catch {
    return null
  }
}

/** Call once at startup, before the app writes the design into the address bar. */
export function initAnalytics(): void {
  const live = LIVE_HOSTS.includes(location.hostname) && !optedOut()
  if (live) {
    uid = userId()
    sid = storedId(() => sessionStorage, 'ringon-session')
  }
  const swapped = swapFrom(location.search, live ? uid : null)
  from = swapped.from
  history.replaceState(history.state, '', `${location.pathname}${swapped.search}${location.hash}`)
  if (!live) return
  const q = new URLSearchParams(location.search)
  track('page_view', {
    path: location.pathname,
    shared: /[#&][rd]=/.test(location.hash),
    tryon: /^#try(&|$)/.test(location.hash),
    utm_source: q.get('utm_source'),
    utm_medium: q.get('utm_medium'),
    utm_campaign: q.get('utm_campaign'),
    standalone: matchMedia('(display-mode: standalone)').matches,
    lang: navigator.language,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen: `${screen.width}x${screen.height}@${devicePixelRatio}`,
    touch: navigator.maxTouchPoints > 0,
  })
  addEventListener('appinstalled', () => track('install'))
}
