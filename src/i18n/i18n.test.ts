import { describe, expect, it } from 'vitest'
import { summary } from '../customizer/summary'
import { DEFAULT_SPEC } from '../ring/spec'
import { BUILTIN_TEMPLATES } from '../templates/builtin'
import i18n, { LANGUAGES, loadTranslation, toUiLanguage } from '.'
import { en, isBuiltinName } from './en'

const PLURAL = /_(zero|one|two|few|many|other)$/

/** Every leaf, as ["a.b.c", text]. */
const flat = (o: object, prefix = ''): [string, string][] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[`${prefix}${k}`, v] as [string, string]] : flat(v, `${prefix}${k}.`)))
const vars = (s: string) => [...new Set(s.match(/\{\{\w+\}\}/g) ?? [])].sort()
const enText = new Map(flat(en))
const enKeys = [...new Set([...enText.keys()].map((k) => k.replace(PLURAL, '')))].sort()

describe.each(LANGUAGES)('%s', (lng) => {
  it('has exactly the English keys, with its own plural forms', async () => {
    const text = flat(await loadTranslation(lng))
    expect([...new Set(text.map(([k]) => k.replace(PLURAL, '')))].sort()).toEqual(enKeys)
    const categories = new Intl.PluralRules(lng).resolvedOptions().pluralCategories.sort()
    const forms = new Map<string, string[]>()
    for (const [k] of text) {
      const m = k.match(PLURAL)
      if (m) forms.set(k.replace(PLURAL, ''), [...(forms.get(k.replace(PLURAL, '')) ?? []), m[1]])
    }
    for (const [key, got] of forms) expect(got.sort(), key).toEqual(categories)
  })

  it('keeps every {{placeholder}} of the English text, and adds none', async () => {
    const rules = new Intl.PluralRules(lng)
    // A plural form for exactly one number (Hebrew "two designs") may spell it out instead of {{count}}.
    const single = (category: string) => Array.from({ length: 1000 }, (_, n) => rules.select(n)).filter((c) => c === category).length === 1
    for (const [k, v] of flat(await loadTranslation(lng))) {
      const source = enText.get(k) ?? enText.get(k.replace(PLURAL, '_other'))!
      const category = k.match(PLURAL)?.[1]
      const want = vars(source).filter((x) => !(x === '{{count}}' && category && single(category) && !v.includes(x)))
      expect(vars(v), k).toEqual(want)
    }
  })

  it('names every built-in template', async () => {
    const { builtin } = await loadTranslation(lng)
    for (const t of BUILTIN_TEMPLATES) {
      expect(isBuiltinName(t.name), t.name).toBe(true)
      if (isBuiltinName(t.name)) expect(builtin[t.name]).toBeTruthy()
    }
  })
})

describe('switching language', () => {
  it('switches the summary, plurals and direction', async () => {
    await i18n.changeLanguage('en')
    expect(summary(DEFAULT_SPEC, 'us')).toMatch(/ct .* · .* · US \/ CA/)
    expect(i18n.t('templates.imported', { count: 2 })).toBe('Imported 2 designs')
    await i18n.changeLanguage('he')
    expect(summary(DEFAULT_SPEC, 'us')).toMatch(/קראט · .* · ארה״ב \/ קנדה/)
    expect(i18n.t('templates.imported', { count: 2 })).toBe('יובאו שני עיצובים')
    expect(i18n.t('templates.imported', { count: 5 })).toBe('יובאו 5 עיצובים')
    expect(i18n.dir()).toBe('rtl')
    await i18n.changeLanguage('ru')
    expect(i18n.t('templates.imported', { count: 5 })).toContain('5')
    expect(i18n.dir()).toBe('ltr')
    await i18n.changeLanguage('en')
  })

  it.each(LANGUAGES)('lays out %s in its script direction', (lng) => {
    // The runtime's own locale data says which way each script runs.
    const locale = new Intl.Locale(lng) as Intl.Locale & { getTextInfo?: () => { direction: string }; textInfo?: { direction: string } }
    expect(i18n.dir(lng)).toBe((locale.getTextInfo?.() ?? locale.textInfo)?.direction ?? 'ltr')
  })
})

describe('browser language codes', () => {
  it.each([
    ['de-AT', 'de'],
    ['pt_BR', 'pt'],
    ['zh-CN', 'zh'],
    ['zh-TW', 'zh-Hant'],
    ['zh-Hant-HK', 'zh-Hant'],
    ['no', 'nb'],
    ['nn-NO', 'nn'],
    ['iw', 'he'],
  ])('reads %s as %s', (code, lng) => {
    expect(toUiLanguage(code)).toBe(lng)
    expect(LANGUAGES).toContain(lng)
  })
})
