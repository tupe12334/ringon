import { toUiLanguage, type Language } from '.'

export type LanguageOption = { lng: Language; label: string }

const capitalize = (s: string, lng: string) => s.charAt(0).toLocaleUpperCase(lng) + s.slice(1)

/** A language's name as written in `inLng`, e.g. ("de", "en") → "German"; from the browser's own data. */
const nameIn = (lng: Language, inLng: string) => capitalize(new Intl.DisplayNames([inLng], { type: 'language' }).of(lng) ?? lng, inLng)

/**
 * The picker's two parts. The top is the browser's languages, then English, so most people find theirs on top.
 * Below is every other language, sorted by its name in the current language. Each label leads with that name, so the
 * order reads right and typing "G" finds German, then adds the native name when it differs ("German (Deutsch)"),
 * so a reader stuck in an unknown script can still find theirs.
 */
export function languageOptions(languages: readonly Language[], current: Language, preferred: readonly string[]) {
  const option = (lng: Language): LanguageOption => {
    const native = nameIn(lng, lng)
    const local = nameIn(lng, current)
    return { lng, label: native === local ? native : `${local} (${native})` }
  }
  const supported = new Set<string>(languages)
  const suggested = [...new Set([...preferred.map(toUiLanguage), 'en'])].filter((lng): lng is Language => supported.has(lng))
  const collator = new Intl.Collator(current)
  // The top languages are not repeated below, so a screen reader names each language once.
  const all = languages
    .filter((lng) => !suggested.includes(lng))
    .map(option)
    .sort((a, b) => collator.compare(a.label, b.label))
  return { suggested: suggested.map(option), all }
}
