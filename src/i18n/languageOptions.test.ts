import { describe, expect, it } from 'vitest'
import { LANGUAGES } from '.'
import { languageOptions } from './languageOptions'

describe('languageOptions', () => {
  it('puts the browser languages, then English, on top, skipping unsupported ones', () => {
    const { suggested } = languageOptions(LANGUAGES, 'en', ['de-AT', 'xx', 'de', 'he-IL', 'en_US', 'no', ''])
    expect(suggested.map((o) => o.lng)).toEqual(['de', 'he', 'en', 'nb'])
  })

  it('labels each language by its own name and the current language name', () => {
    const { all } = languageOptions(LANGUAGES, 'en', [])
    expect(all.find((o) => o.lng === 'de')?.label).toBe('German (Deutsch)')
    expect(all.find((o) => o.lng === 'en')?.label).toBe('English')
    expect(all).toHaveLength(LANGUAGES.length)
  })

  it('names each language in the current one, with its native name', () => {
    const { all } = languageOptions(LANGUAGES, 'th', [])
    expect(all.find((o) => o.lng === 'en')?.label).toBe('อังกฤษ (English)')
  })

  it('sorts by the name in the current language', () => {
    const order = languageOptions(LANGUAGES, 'en', []).all.map((o) => o.lng)
    const pick = ['ar', 'zh', 'en', 'de', 'el']
    expect(order.filter((l) => pick.includes(l))).toEqual(['ar', 'zh', 'en', 'de', 'el'])
  })
})
