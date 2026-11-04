import type { Language } from '.'

export type LanguageOption = { lng: Language; label: string }

const capitalize = (s: string, lng: string) => s.charAt(0).toLocaleUpperCase(lng) + s.slice(1)

/** A language's name as written in `inLng`, e.g. ("de", "en") → "German"; from the browser's own data. */
const nameIn = (lng: Language, inLng: string) => capitalize(new Intl.DisplayNames([inLng], { type: 'language' }).of(lng) ?? lng, inLng)

/**
 * The picker's two parts. The top is the browser's languages, then English, so most people find theirs on top.
 * Below is every language, sorted in the current language's alphabet. Each label is the native name, plus the
 * name in the current language when it differs ("Deutsch — German"), so a reader stuck in an unknown script can still find theirs.
 */
export function languageOptions(languages: readonly Language[], current: Language, preferred: readonly string[]) {
  const option = (lng: Language): LanguageOption => {
    const native = nameIn(lng, lng)
    const local = nameIn(lng, current)
    return { lng, label: native === local ? native : `${native} — ${local}` }
  }
  const supported = new Set<string>(languages)
  const suggested = [...new Set([...preferred.map((tag) => new Intl.Locale(tag).language), 'en'])].filter((lng): lng is Language => supported.has(lng))
  const collator = new Intl.Collator(current)
  const all = languages.map(option).sort((a, b) => collator.compare(a.label, b.label))
  return { suggested: suggested.map(option), all }
}
