import { describe, expect, it } from 'vitest'
import { summary } from '../customizer/summary'
import { DEFAULT_SPEC } from '../ring/spec'
import { BUILTIN_TEMPLATES } from '../templates/builtin'
import i18n from '.'
import { en } from './en'
import { he } from './he'

/** Every leaf key, as "a.b.c", ignoring plural suffixes. */
const keys = (o: object, prefix = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) =>
    typeof v === 'string' ? [`${prefix}${k.replace(/_(one|two|other)$/, '')}`] : keys(v, `${prefix}${k}.`),
  )

describe('translations', () => {
  it('Hebrew has exactly the English keys', () => {
    expect([...new Set(keys(he))].sort()).toEqual([...new Set(keys(en))].sort())
  })

  it('every built-in template has a name in both languages', () => {
    for (const t of BUILTIN_TEMPLATES) {
      expect(en.builtin[t.name]).toBe(t.name)
      expect(he.builtin[t.name]).toBeTruthy()
    }
  })

  it('keeps every {{placeholder}} of the English text', () => {
    const flat = (o: object, prefix = ''): [string, string][] =>
      Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[`${prefix}${k}`, v] as [string, string]] : flat(v, `${prefix}${k}.`)))
    const heText = new Map(flat(he))
    // "One design" / "two designs" can spell the number out instead of using {{count}}.
    for (const [k, v] of flat(en).filter(([k]) => !/_(one|two)$/.test(k))) {
      const vars = (s: string) => (s.match(/\{\{\w+\}\}/g) ?? []).sort()
      expect(vars(heText.get(k)!), k).toEqual(vars(v))
    }
  })

  it('switches the summary and plurals with the language', async () => {
    await i18n.changeLanguage('en')
    expect(summary(DEFAULT_SPEC, 'us')).toMatch(/ct .* · .* · US \/ CA/)
    expect(i18n.t('templates.imported', { count: 2 })).toBe('Imported 2 designs')
    await i18n.changeLanguage('he')
    expect(summary(DEFAULT_SPEC, 'us')).toMatch(/קראט · .* · ארה״ב \/ קנדה/)
    expect(i18n.t('templates.imported', { count: 2 })).toBe('יובאו שני עיצובים')
    expect(i18n.t('templates.imported', { count: 5 })).toBe('יובאו 5 עיצובים')
    expect(i18n.dir()).toBe('rtl')
    await i18n.changeLanguage('en')
  })
})
