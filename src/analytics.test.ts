import { describe, expect, it } from 'vitest'
import { swapFrom } from './analytics'

const a = '11111111-1111-4111-8111-111111111111'
const b = '22222222-2222-4222-8222-222222222222'

describe('swapFrom', () => {
  it('reads the sharer and puts our id in the link', () => {
    expect(swapFrom(`?from=${a}&utm_source=x`, b)).toEqual({ from: a, search: `?utm_source=x&from=${b}` })
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
