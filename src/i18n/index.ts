// UI language: picked from the browser and remembered on this device. English ships in the
// main bundle; every other language is its own chunk, fetched when it is first used.

import i18n, { type BackendModule } from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import { en, type Translation } from './en'

type Loader = () => Promise<{ default: Translation }>

/** Every UI language but English, by BCP 47 code. A new language is one line here plus its file. */
const LOCALES = {
  af: () => import('./locales/af'),
  am: () => import('./locales/am'),
  ar: () => import('./locales/ar'),
  as: () => import('./locales/as'),
  az: () => import('./locales/az'),
  be: () => import('./locales/be'),
  bg: () => import('./locales/bg'),
  bn: () => import('./locales/bn'),
  bs: () => import('./locales/bs'),
  ca: () => import('./locales/ca'),
  cs: () => import('./locales/cs'),
  cy: () => import('./locales/cy'),
  da: () => import('./locales/da'),
  de: () => import('./locales/de'),
  eo: () => import('./locales/eo'),
  ia: () => import('./locales/ia'),
  ie: () => import('./locales/ie'),
  ast: () => import('./locales/ast'),
  se: () => import('./locales/se'),
  mt: () => import('./locales/mt'),
  ha: () => import('./locales/ha'),
  ig: () => import('./locales/ig'),
  yo: () => import('./locales/yo'),
  ff: () => import('./locales/ff'),
  el: () => import('./locales/el'),
  es: () => import('./locales/es'),
  et: () => import('./locales/et'),
  eu: () => import('./locales/eu'),
  fa: () => import('./locales/fa'),
  fi: () => import('./locales/fi'),
  fil: () => import('./locales/fil'),
  fr: () => import('./locales/fr'),
  gl: () => import('./locales/gl'),
  gu: () => import('./locales/gu'),
  he: () => import('./locales/he'),
  hi: () => import('./locales/hi'),
  hr: () => import('./locales/hr'),
  hu: () => import('./locales/hu'),
  hy: () => import('./locales/hy'),
  id: () => import('./locales/id'),
  is: () => import('./locales/is'),
  it: () => import('./locales/it'),
  ja: () => import('./locales/ja'),
  ka: () => import('./locales/ka'),
  kk: () => import('./locales/kk'),
  km: () => import('./locales/km'),
  kn: () => import('./locales/kn'),
  ko: () => import('./locales/ko'),
  ky: () => import('./locales/ky'),
  lo: () => import('./locales/lo'),
  lt: () => import('./locales/lt'),
  lv: () => import('./locales/lv'),
  mk: () => import('./locales/mk'),
  ml: () => import('./locales/ml'),
  mn: () => import('./locales/mn'),
  mr: () => import('./locales/mr'),
  ms: () => import('./locales/ms'),
  my: () => import('./locales/my'),
  nb: () => import('./locales/nb'),
  ne: () => import('./locales/ne'),
  nl: () => import('./locales/nl'),
  or: () => import('./locales/or'),
  pa: () => import('./locales/pa'),
  pl: () => import('./locales/pl'),
  pt: () => import('./locales/pt'),
  ro: () => import('./locales/ro'),
  ru: () => import('./locales/ru'),
  si: () => import('./locales/si'),
  sk: () => import('./locales/sk'),
  sl: () => import('./locales/sl'),
  sq: () => import('./locales/sq'),
  sr: () => import('./locales/sr'),
  sv: () => import('./locales/sv'),
  sw: () => import('./locales/sw'),
  ta: () => import('./locales/ta'),
  te: () => import('./locales/te'),
  th: () => import('./locales/th'),
  tr: () => import('./locales/tr'),
  uk: () => import('./locales/uk'),
  ur: () => import('./locales/ur'),
  uz: () => import('./locales/uz'),
  vi: () => import('./locales/vi'),
  zh: () => import('./locales/zh'),
  'zh-Hant': () => import('./locales/zh-Hant'),
  zu: () => import('./locales/zu'),
} as const satisfies Record<string, Loader>

export type Language = 'en' | keyof typeof LOCALES
const isLocale = (code: string): code is keyof typeof LOCALES => Object.hasOwn(LOCALES, code)
export const isLanguage = (lng: string): lng is Language => lng === 'en' || isLocale(lng)
export const LANGUAGES: Language[] = ['en', ...Object.keys(LOCALES).filter(isLocale)]

/** Loads one language's text; tests use it to check every file. */
export const loadTranslation = async (lng: Language): Promise<Translation> => (lng === 'en' ? en : (await LOCALES[lng]()).default)

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: { translation: typeof en }
    // `defaultValue` cannot hide a missing key.
    strictKeyChecks: true
  }
}

const backend: BackendModule = {
  type: 'backend',
  init() {},
  read(lng, _ns, done) {
    if (!isLanguage(lng)) return done(null, false)
    loadTranslation(lng).then(
      (text) => done(null, text),
      (error: Error) => done(error, false),
    )
  },
}

/**
 * A browser or link code (de-AT, zh-TW, no) as one of our languages: the base language, except
 * Traditional Chinese regions, which read zh-Hant, and Norwegian, which reads Bokmål.
 */
export const toUiLanguage = (code: string): string => {
  const [base, ...rest] = code.toLowerCase().split(/[-_]/)
  if (base === 'zh' && rest.some((p) => ['hant', 'tw', 'hk', 'mo'].includes(p))) return 'zh-Hant'
  if (base === 'no' || base === 'nn') return 'nb'
  // Old codes some browsers still send.
  return { tl: 'fil', iw: 'he', in: 'id' }[base] ?? base
}

// The page's lang and direction follow the language, so right-to-left scripts (Arabic, Hebrew, …) lay out right to left.
i18n.on('languageChanged', (lng) => {
  if (typeof document === 'undefined') return
  document.documentElement.lang = lng
  document.documentElement.dir = i18n.dir(lng)
})

i18n
  .use(backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en } },
    partialBundledLanguages: true,
    supportedLngs: LANGUAGES,
    fallbackLng: 'en',
    // zh-Hant is a language of its own here, so codes are not cut to their first part.
    load: 'currentOnly',
    // `?lng=he` in a link opens Hebrew; the choice is then kept in localStorage.
    detection: { order: ['querystring', 'localStorage', 'navigator'], caches: ['localStorage'], convertDetectedLanguage: toUiLanguage },
    interpolation: { escapeValue: false },
  })

export default i18n
