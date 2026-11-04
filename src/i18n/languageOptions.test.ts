import { describe, expect, it } from 'vitest'
import { LANGUAGES } from '.'
import { languageOptions, NATIVE_NAMES } from './languageOptions'

describe('languageOptions', () => {
  it('puts the browser languages, then English, on top, skipping unsupported ones', () => {
    const { suggested } = languageOptions(LANGUAGES, 'en', ['de-AT', 'xx', 'de', 'iw-IL', 'en_US', 'no', 'zh-TW', ''])
    expect(suggested.map((o) => o.lng)).toEqual(['de', 'he', 'en', 'nb', 'zh-Hant'])
  })

  it('labels each language by its own name and the current language name', () => {
    const { suggested, all } = languageOptions(LANGUAGES, 'en', ['de'])
    expect(suggested.map((o) => o.label)).toEqual(['German (Deutsch)', 'English'])
    expect(all.find((o) => o.lng === 'fr')?.label).toBe('French (Français)')
  })

  it('lists every language exactly once', () => {
    const { suggested, all } = languageOptions(LANGUAGES, 'en', ['de', 'he'])
    expect([...suggested, ...all].map((o) => o.lng).sort()).toEqual([...LANGUAGES].sort())
  })

  it('names each language in the current one, with its native name', () => {
    const { suggested } = languageOptions(LANGUAGES, 'th', [])
    expect(suggested.find((o) => o.lng === 'en')?.label).toBe('อังกฤษ (English)')
  })

  it('sorts by the name in the current language', () => {
    const order = languageOptions(LANGUAGES, 'en', []).all.map((o) => o.lng)
    const pick = ['ar', 'zh', 'de', 'el']
    expect(order.filter((l) => pick.includes(l))).toEqual(['ar', 'zh', 'de', 'el'])
  })

  it('keeps each fallback native name equal to CLDR', () => {
    for (const [lng, name] of Object.entries(NATIVE_NAMES)) expect(name, lng).toBe(new Intl.DisplayNames([lng], { type: 'language' }).of(lng))
  })

  it('leaves Georgian names lowercase, as Georgian writes them', () => {
    const { suggested } = languageOptions(LANGUAGES, 'ka', ['ka'])
    expect(suggested[0].label).toBe('ქართული')
  })
})
