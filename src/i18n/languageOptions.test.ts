import { describe, expect, it } from 'vitest'
import { LANGUAGES } from '.'
import { languageOptions } from './languageOptions'

describe('languageOptions', () => {
  it('puts the browser languages, then English, on top, skipping unsupported ones', () => {
    const { suggested } = languageOptions(LANGUAGES, 'en', ['de-AT', 'xx', 'de', 'he-IL'])
    expect(suggested.map((o) => o.lng)).toEqual(['de', 'he', 'en'])
  })

  it('labels each language by its own name and the current language name', () => {
    const { all } = languageOptions(LANGUAGES, 'en', [])
    expect(all.find((o) => o.lng === 'de')?.label).toBe('Deutsch — German')
    expect(all.find((o) => o.lng === 'en')?.label).toBe('English')
    expect(all).toHaveLength(LANGUAGES.length)
  })

  it('sorts with the current language collator and names each language in it', () => {
    const { all } = languageOptions(LANGUAGES, 'th', [])
    expect(all.find((o) => o.lng === 'en')?.label).toBe('English — อังกฤษ')
    const labels = all.map((o) => o.label)
    expect(labels).toEqual([...labels].sort(new Intl.Collator('th').compare))
  })
})
