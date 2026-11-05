// Serves the built app (dist/), takes analytics events at POST /e into D1 (migrations/), and answers GET /country.
import { MAX_BODY, toRow, type Cf } from './events'

type D1 = { prepare(sql: string): { bind(...v: unknown[]): { run(): Promise<unknown> } } }
type Env = { ASSETS: { fetch(req: Request): Promise<Response> }; DB: D1 }
type Ctx = { waitUntil(p: Promise<unknown>): void }

const COLUMNS = ['ts', 'event', 'uid', 'sid', 'from_uid', 'props', 'host', 'referrer', 'country', 'region', 'city', 'timezone', 'asn', 'as_org', 'ua'] as const
const INSERT = `INSERT INTO events (${COLUMNS.join(', ')}) VALUES (${COLUMNS.map(() => '?').join(', ')})`

export default {
  async fetch(req: Request, env: Env, ctx: Ctx): Promise<Response> {
    const url = new URL(req.url)
    // The viewer's country, so the language picker can suggest its languages. Nothing is stored.
    if (url.pathname === '/country') {
      const country = ((req as Request & { cf?: Cf }).cf ?? {}).country ?? ''
      return new Response(country, { headers: { 'content-type': 'text/plain', 'cache-control': 'private, no-store' } })
    }
    if (url.pathname !== '/e') return env.ASSETS.fetch(req)
    if (req.method !== 'POST') return new Response(null, { status: 405 })
    const text = await req.text()
    if (text.length > MAX_BODY) return new Response(null, { status: 413 })
    let body: unknown
    try {
      body = JSON.parse(text)
    } catch {
      return new Response(null, { status: 400 })
    }
    const cf = ((req as Request & { cf?: Cf }).cf ?? {}) as Cf
    const row = toRow(body, cf, req.headers.get('user-agent'), Date.now())
    if (!row) return new Response(null, { status: 400 })
    ctx.waitUntil(env.DB.prepare(INSERT).bind(...COLUMNS.map((c) => row[c])).run())
    return new Response(null, { status: 204 })
  },
}
