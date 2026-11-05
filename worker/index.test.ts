import { describe, expect, it } from 'vitest'
import worker from './index'

const env = { ASSETS: { fetch: async () => new Response('asset') }, DB: { prepare: () => ({ bind: () => ({ run: async () => ({}) }) }) } }
const ctx = { waitUntil() {} }
const get = (path: string, cf?: object) => worker.fetch(Object.assign(new Request(`https://ringon.app${path}`), { cf }), env, ctx)

describe('GET /country', () => {
  it("answers the viewer's country, uncached", async () => {
    const res = await get('/country', { country: 'IL' })
    expect(await res.text()).toBe('IL')
    expect(res.headers.get('cache-control')).toBe('private, no-store')
  })

  it('answers empty without Cloudflare data', async () => {
    expect(await (await get('/country')).text()).toBe('')
  })
})
