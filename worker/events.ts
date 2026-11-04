// Turns one POST /e body from the app (src/analytics.ts) into an events row; null drops it.

export type Row = {
  ts: number
  event: string
  uid: string
  sid: string
  from_uid: string | null
  props: string | null
  host: string | null
  referrer: string | null
  country: string | null
  region: string | null
  city: string | null
  timezone: string | null
  asn: number | null
  as_org: string | null
  ua: string | null
}

/** The parts of Cloudflare's request.cf that we keep. */
export type Cf = { country?: string; region?: string; city?: string; timezone?: string; asn?: number; asOrganization?: string }

const ID = /^[0-9a-f-]{36}$/
const EVENT = /^[a-z_]{1,32}$/
export const MAX_BODY = 4096

const str = (v: unknown, max: number) => (typeof v === 'string' && v ? v.slice(0, max) : null)

export function toRow(body: unknown, cf: Cf, ua: string | null, now: number): Row | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  if (typeof b.event !== 'string' || !EVENT.test(b.event)) return null
  if (typeof b.uid !== 'string' || !ID.test(b.uid) || typeof b.sid !== 'string' || !ID.test(b.sid)) return null
  const from = typeof b.from === 'string' && ID.test(b.from) && b.from !== b.uid ? b.from : null
  const props = b.props && typeof b.props === 'object' ? JSON.stringify(b.props).slice(0, 2048) : null
  return {
    ts: now,
    event: b.event,
    uid: b.uid,
    sid: b.sid,
    from_uid: from,
    props,
    host: str(b.host, 100),
    referrer: str(b.referrer, 200),
    country: str(cf.country, 8),
    region: str(cf.region, 100),
    city: str(cf.city, 100),
    timezone: str(cf.timezone, 64),
    asn: typeof cf.asn === 'number' ? cf.asn : null,
    as_org: str(cf.asOrganization, 200),
    ua: str(ua, 400),
  }
}
