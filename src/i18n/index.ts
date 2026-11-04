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
  ak: () => import('./locales/ak'),
  am: () => import('./locales/am'),
  ar: () => import('./locales/ar'),
  as: () => import('./locales/as'),
  ast: () => import('./locales/ast'),
  az: () => import('./locales/az'),
  be: () => import('./locales/be'),
  bg: () => import('./locales/bg'),
  bm: () => import('./locales/bm'),
  bn: () => import('./locales/bn'),
  bo: () => import('./locales/bo'),
  br: () => import('./locales/br'),
  bs: () => import('./locales/bs'),
  ca: () => import('./locales/ca'),
  ce: () => import('./locales/ce'),
  ceb: () => import('./locales/ceb'),
  chr: () => import('./locales/chr'),
  ckb: () => import('./locales/ckb'),
  cs: () => import('./locales/cs'),
  cv: () => import('./locales/cv'),
  cy: () => import('./locales/cy'),
  da: () => import('./locales/da'),
  de: () => import('./locales/de'),
  dz: () => import('./locales/dz'),
  ee: () => import('./locales/ee'),
  el: () => import('./locales/el'),
  eo: () => import('./locales/eo'),
  es: () => import('./locales/es'),
  et: () => import('./locales/et'),
  eu: () => import('./locales/eu'),
  fa: () => import('./locales/fa'),
  ff: () => import('./locales/ff'),
  fi: () => import('./locales/fi'),
  fil: () => import('./locales/fil'),
  fo: () => import('./locales/fo'),
  fr: () => import('./locales/fr'),
  fy: () => import('./locales/fy'),
  ga: () => import('./locales/ga'),
  gd: () => import('./locales/gd'),
  gl: () => import('./locales/gl'),
  gu: () => import('./locales/gu'),
  gv: () => import('./locales/gv'),
  ha: () => import('./locales/ha'),
  haw: () => import('./locales/haw'),
  he: () => import('./locales/he'),
  hi: () => import('./locales/hi'),
  hr: () => import('./locales/hr'),
  hu: () => import('./locales/hu'),
  hy: () => import('./locales/hy'),
  ia: () => import('./locales/ia'),
  id: () => import('./locales/id'),
  ie: () => import('./locales/ie'),
  ig: () => import('./locales/ig'),
  ii: () => import('./locales/ii'),
  is: () => import('./locales/is'),
  it: () => import('./locales/it'),
  ja: () => import('./locales/ja'),
  jv: () => import('./locales/jv'),
  ka: () => import('./locales/ka'),
  kk: () => import('./locales/kk'),
  kl: () => import('./locales/kl'),
  km: () => import('./locales/km'),
  kn: () => import('./locales/kn'),
  ko: () => import('./locales/ko'),
  kok: () => import('./locales/kok'),
  ks: () => import('./locales/ks'),
  ku: () => import('./locales/ku'),
  kw: () => import('./locales/kw'),
  ky: () => import('./locales/ky'),
  lb: () => import('./locales/lb'),
  lg: () => import('./locales/lg'),
  ln: () => import('./locales/ln'),
  lo: () => import('./locales/lo'),
  lt: () => import('./locales/lt'),
  lv: () => import('./locales/lv'),
  mg: () => import('./locales/mg'),
  mk: () => import('./locales/mk'),
  ml: () => import('./locales/ml'),
  mn: () => import('./locales/mn'),
  mr: () => import('./locales/mr'),
  ms: () => import('./locales/ms'),
  mt: () => import('./locales/mt'),
  my: () => import('./locales/my'),
  nb: () => import('./locales/nb'),
  nd: () => import('./locales/nd'),
  ne: () => import('./locales/ne'),
  nl: () => import('./locales/nl'),
  nn: () => import('./locales/nn'),
  om: () => import('./locales/om'),
  or: () => import('./locales/or'),
  os: () => import('./locales/os'),
  pa: () => import('./locales/pa'),
  pl: () => import('./locales/pl'),
  ps: () => import('./locales/ps'),
  pt: () => import('./locales/pt'),
  rm: () => import('./locales/rm'),
  ro: () => import('./locales/ro'),
  ru: () => import('./locales/ru'),
  sat: () => import('./locales/sat'),
  sc: () => import('./locales/sc'),
  sd: () => import('./locales/sd'),
  se: () => import('./locales/se'),
  sg: () => import('./locales/sg'),
  si: () => import('./locales/si'),
  sk: () => import('./locales/sk'),
  sl: () => import('./locales/sl'),
  sn: () => import('./locales/sn'),
  so: () => import('./locales/so'),
  sq: () => import('./locales/sq'),
  sr: () => import('./locales/sr'),
  st: () => import('./locales/st'),
  su: () => import('./locales/su'),
  sv: () => import('./locales/sv'),
  sw: () => import('./locales/sw'),
  ta: () => import('./locales/ta'),
  te: () => import('./locales/te'),
  th: () => import('./locales/th'),
  ti: () => import('./locales/ti'),
  tk: () => import('./locales/tk'),
  tn: () => import('./locales/tn'),
  to: () => import('./locales/to'),
  tr: () => import('./locales/tr'),
  ug: () => import('./locales/ug'),
  uk: () => import('./locales/uk'),
  ur: () => import('./locales/ur'),
  uz: () => import('./locales/uz'),
  vi: () => import('./locales/vi'),
  wo: () => import('./locales/wo'),
  xh: () => import('./locales/xh'),
  yi: () => import('./locales/yi'),
  yo: () => import('./locales/yo'),
  yue: () => import('./locales/yue'),
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
 * Traditional Chinese regions, which read zh-Hant, and plain Norwegian (no), which reads Bokmål.
 */
export const toUiLanguage = (code: string): string => {
  const [base, ...rest] = code.toLowerCase().split(/[-_]/)
  if (base === 'zh' && rest.some((p) => ['hant', 'tw', 'hk', 'mo'].includes(p))) return 'zh-Hant'
  if (base === 'no') return 'nb'
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
