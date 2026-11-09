import { describe, expect, it } from 'vitest'
import { cookieId, idCookie, swapFrom, withFrom } from './analytics'

const a = '11111111-1111-4111-8111-111111111111'
const b = '22222222-2222-4222-8222-222222222222'

describe('swapFrom', () => {
  it('reads the sharer and keeps our id out of the address bar', () => {
    expect(swapFrom(`?from=${a}&utm_source=x`, b)).toEqual({ from: a, search: '?utm_source=x' })
  })

  it('ignores our own id and junk', () => {
    expect(swapFrom(`?from=${b}`, b).from).toBeNull()
    expect(swapFrom('?from=nope', b).from).toBeNull()
  })

  it('only strips the id when analytics is off', () => {
    expect(swapFrom(`?from=${a}`, null)).toEqual({ from: a, search: '' })
    expect(swapFrom('', null)).toEqual({ from: null, search: '' })
  })
})

describe('withFrom', () => {
  it('leaves links alone when analytics is off', () => {
    expect(withFrom('https://ringon.app/#r=x')).toBe('https://ringon.app/#r=x')
  })
})

describe('id cookie', () => {
  it('reads back the id it writes', () => {
    expect(cookieId(idCookie(a).split(';')[0])).toBe(a)
    expect(cookieId(`x=1; ringon-id=${a}; y=2`)).toBe(a)
  })

  it('ignores other cookies and junk', () => {
    expect(cookieId('')).toBeNull()
    expect(cookieId(`xringon-id=${a}`)).toBeNull()
    expect(cookieId('ringon-id=nope')).toBeNull()
  })

  it('lasts a year on this site only', () => {
    expect(idCookie(a)).toBe(`ringon-id=${a}; Max-Age=31536000; Path=/; SameSite=Lax; Secure`)
  })
})
