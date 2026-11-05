import { toUiLanguage, type Language } from '.'

export type LanguageOption = { lng: Language; label: string }

// Georgian has capital letters (Mtavruli) but never capitalizes names, so its names stay as they are.
const capitalize = (s: string, lng: string) => (lng === 'ka' ? s : s.charAt(0).toLocaleUpperCase(lng) + s.slice(1))

/** A language's name as written in `inLng`, e.g. ("de", "en") → "German"; from the browser's own data. */
const nameIn = (lng: Language, inLng: string) => capitalize(new Intl.DisplayNames([inLng], { type: 'language' }).of(lng) ?? lng, inLng)

/**
 * CLDR's own-script names for languages some browsers (Chromium) ship no name data for; without them,
 * Georgian would read "Georgian" to a Georgian reader. The test checks them against Node's full CLDR.
 */
export const NATIVE_NAMES: Partial<Record<Language, string>> = {
  as: 'অসমীয়া', ast: 'asturianu', be: 'беларуская', bm: 'bamanakan', bo: 'བོད་སྐད་', br: 'brezhoneg', ce: 'нохчийн',
  ceb: 'Cebuano', chr: 'ᏣᎳᎩ', ckb: 'کوردیی ناوەندی', cv: 'чӑваш чӗлхи', cy: 'Cymraeg', dz: 'རྫོང་ཁ', ee: 'eʋegbe',
  eo: 'Esperanto', eu: 'euskara', ff: 'Pulaar', fo: 'føroyskt', fy: 'Frysk', ga: 'Gaeilge', gd: 'Gàidhlig',
  gl: 'galego', gv: 'Gaelg', ha: 'Hausa', haw: 'ʻŌlelo Hawaiʻi', hy: 'հայերեն', ia: 'interlingua', ie: 'Interlingue',
  ig: 'Igbo', ii: 'ꆈꌠꉙ', is: 'íslenska', jv: 'Jawa', ka: 'ქართული', kl: 'kalaallisut', km: 'ខ្មែរ', ks: 'کٲشُر',
  ku: 'kurdî (kurmancî)', kw: 'kernewek', ky: 'кыргызча', lb: 'Lëtzebuergesch', lg: 'Luganda', ln: 'lingála',
  lo: 'ລາວ', mg: 'Malagasy', mk: 'македонски', mn: 'монгол', mt: 'Malti', my: 'မြန်မာ', nd: 'isiNdebele',
  ne: 'नेपाली', nn: 'norsk nynorsk', om: 'Oromoo', or: 'ଓଡ଼ିଆ', os: 'ирон', ps: 'پښتو', rm: 'rumantsch', sat: 'ᱥᱟᱱᱛᱟᱲᱤ', sc: 'sardu',
  se: 'davvisámegiella', sg: 'Sängö', si: 'සිංහල', sn: 'chiShona', so: 'Soomaali', sq: 'shqip', st: 'Sesotho',
  su: 'Basa Sunda', ti: 'ትግርኛ', tk: 'türkmen dili', tn: 'Setswana', to: 'lea fakatonga', ug: 'ئۇيغۇرچە', wo: 'Wolof',
  xh: 'IsiXhosa', yi: 'ייִדיש', yo: 'Èdè Yorùbá', yue: '粵語', zu: 'isiZulu',
}

/** A language's name in its own script: the browser's data when it has that language, else the table. */
const nativeName = (lng: Language) => {
  const own = Intl.DisplayNames.supportedLocalesOf([lng]).length ? undefined : NATIVE_NAMES[lng]
  return own ? capitalize(own, lng) : nameIn(lng, lng)
}

/**
 * The languages of a country (ISO 3166 code, e.g. "IN"): its main language, then each language whose main
 * country it is, from the browser's own likely-subtags data, so no table to keep.
 * shortcut: a language is listed only where it is most spoken (Arabic not for Israel, French not for Belgium);
 * upgrade to CLDR territory data if people miss theirs.
 */
export function countryLanguages(country: string, languages: readonly Language[]): Language[] {
  const region = (tag: string) => {
    try {
      return new Intl.Locale(tag).maximize().region
    } catch {
      return undefined
    }
  }
  const main = new Intl.Locale('und', { region: country }).maximize().language
  return [...new Set([main, ...languages.filter((lng) => region(lng) === country)])].filter((lng): lng is Language => languages.includes(lng as Language))
}

/**
 * The picker's two parts. The top is the browser's languages, then the languages of the viewer's country, then
 * English, so most people find theirs on top.
 * Below is every other language, sorted by its name in the current language. Each label leads with that name, so the
 * order reads right and typing "G" finds German, then adds the native name when it differs ("German (Deutsch)"),
 * so a reader stuck in an unknown script can still find theirs.
 */
export function languageOptions(languages: readonly Language[], current: Language, preferred: readonly string[], country?: string) {
  const option = (lng: Language): LanguageOption => {
    const native = nativeName(lng)
    const local = nameIn(lng, current)
    // The current language shows only its own name, also where the browser lacks data for it.
    return { lng, label: lng === current || native === local ? native : `${local} (${native})` }
  }
  const supported = new Set<string>(languages)
  const local = country ? countryLanguages(country, languages) : []
  const suggested = [...new Set([...preferred.map(toUiLanguage), ...local, 'en'])].filter((lng): lng is Language => supported.has(lng))
  const collator = new Intl.Collator(current)
  // The top languages are not repeated below, so a screen reader names each language once.
  const all = languages
    .filter((lng) => !suggested.includes(lng))
    .map(option)
    .sort((a, b) => collator.compare(a.label, b.label))
  return { suggested: suggested.map(option), all }
}
