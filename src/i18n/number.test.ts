import { describe, expect, it } from 'vitest'
import i18n from '.'
import { num } from './number'

describe('num', () => {
  it('writes decimals the way the current language does', async () => {
    await i18n.changeLanguage('en')
    expect(num(1.25, 2)).toBe('1.25')
    expect(num(2, 1)).toBe('2.0')
    await i18n.changeLanguage('de')
    expect(num(1.25, 2)).toBe('1,25')
    await i18n.changeLanguage('en')
  })
})
