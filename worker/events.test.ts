import { describe, expect, it } from 'vitest'
import { toRow } from './events'

const uid = '11111111-1111-4111-8111-111111111111'
const sid = '22222222-2222-4222-8222-222222222222'
const other = '33333333-3333-4333-8333-333333333333'
const cf = { country: 'IL', city: 'Tel Aviv', asn: 12400, asOrganization: 'Partner' }

describe('toRow', () => {
  it('keeps a valid event with Cloudflare location and the sharer id', () => {
    const row = toRow({ event: 'page_view', uid, sid, from: other, props: { shared: true }, referrer: 'web.whatsapp.com' }, cf, 'UA', 5)
    expect(row).toMatchObject({ ts: 5, event: 'page_view', uid, from_uid: other, props: '{"shared":true}', country: 'IL', asn: 12400, as_org: 'Partner', ua: 'UA' })
  })

  it('drops bad names and ids', () => {
    expect(toRow({ event: 'DROP TABLE', uid, sid }, cf, null, 0)).toBeNull()
    expect(toRow({ event: 'page_view', uid: 'x', sid }, cf, null, 0)).toBeNull()
    expect(toRow(null, cf, null, 0)).toBeNull()
  })

  it('ignores a link the user opened from themselves', () => {
    expect(toRow({ event: 'page_view', uid, sid, from: uid }, cf, null, 0)?.from_uid).toBeNull()
  })
})
