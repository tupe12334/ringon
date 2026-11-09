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

// Data-centre and security-scanner networks seen in D1 (2026-11-09). Heuristic: extend as new bots show up.
const DATA_CENTRE = /amazon|google|microsoft|youtube|palo alto|fortinet|hostroyale|scaleway|leaseweb|logicweb|code200|hosting|data ?cent|cloud|hostpapa|railway|oculus|fastplanet|subnet digital|braveway/i

/**
 * Why this event likely comes from a bot, or null. Stored as props.bot so reports can filter with
 * `json_extract(props, '$.bot') IS NULL`. Language-rotating test runs need a query across rows.
 * @param props the app's page props
 * @param asOrg Cloudflare's network owner
 * @param ua user agent
 * @returns a short reason, or null
 */
export function likelyBot(props: Record<string, unknown>, asOrg: string | null, ua: string | null): string | null {
  if (asOrg && DATA_CENTRE.test(asOrg)) return 'network'
  if (ua && /headless/i.test(ua)) return 'headless'
  if (props.tz === 'UTC' || props.tz === 'Etc/Unknown') return 'tz'
  if (typeof props.screen === 'string' && props.screen.startsWith('800x600@')) return 'screen'
  return null
}

const str = (v: unknown, max: number) => (typeof v === 'string' && v ? v.slice(0, max) : null)

export function toRow(body: unknown, cf: Cf, ua: string | null, now: number): Row | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  if (typeof b.event !== 'string' || !EVENT.test(b.event)) return null
  if (typeof b.uid !== 'string' || !ID.test(b.uid) || typeof b.sid !== 'string' || !ID.test(b.sid)) return null
  const from = typeof b.from === 'string' && ID.test(b.from) && b.from !== b.uid ? b.from : null
  const raw = b.props && typeof b.props === 'object' ? (b.props as Record<string, unknown>) : null
  const bot = likelyBot(raw ?? {}, str(cf.asOrganization, 200), str(ua, 400))
  const props = raw || bot ? JSON.stringify(bot ? { ...raw, bot } : raw).slice(0, 2048) : null
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
