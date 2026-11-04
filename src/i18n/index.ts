// UI language: picked from the browser and remembered on this device. English ships in the
// main bundle; every other language is its own chunk, fetched when it is first used.

import i18n, { type BackendModule } from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import { en, type Translation } from './en'

type Loader = () => Promise<{ default: Translation }>

/** Every UI language but English, by BCP 47 code. A new language is one line here plus its file. */
const LOCALES = {
  am: () => import('./locales/am'),
  af: () => import('./locales/af'),
  is: () => import('./locales/is'),
  cy: () => import('./locales/cy'),
  eu: () => import('./locales/eu'),
  gl: () => import('./locales/gl'),
  ar: () => import('./locales/ar'),
  bg: () => import('./locales/bg'),
  bn: () => import('./locales/bn'),
  ca: () => import('./locales/ca'),
  cs: () => import('./locales/cs'),
  da: () => import('./locales/da'),
  de: () => import('./locales/de'),
  el: () => import('./locales/el'),
  es: () => import('./locales/es'),
  et: () => import('./locales/et'),
  fa: () => import('./locales/fa'),
  fi: () => import('./locales/fi'),
  fil: () => import('./locales/fil'),
  fr: () => import('./locales/fr'),
  gu: () => import('./locales/gu'),
  he: () => import('./locales/he'),
  hi: () => import('./locales/hi'),
  hr: () => import('./locales/hr'),
  hu: () => import('./locales/hu'),
  id: () => import('./locales/id'),
  it: () => import('./locales/it'),
  ja: () => import('./locales/ja'),
  kn: () => import('./locales/kn'),
  ko: () => import('./locales/ko'),
  lt: () => import('./locales/lt'),
  lv: () => import('./locales/lv'),
  ml: () => import('./locales/ml'),
  mr: () => import('./locales/mr'),
  ms: () => import('./locales/ms'),
  nb: () => import('./locales/nb'),
  nl: () => import('./locales/nl'),
  pl: () => import('./locales/pl'),
  pt: () => import('./locales/pt'),
  ro: () => import('./locales/ro'),
  ru: () => import('./locales/ru'),
  sk: () => import('./locales/sk'),
  sl: () => import('./locales/sl'),
  sr: () => import('./locales/sr'),
  sv: () => import('./locales/sv'),
  sw: () => import('./locales/sw'),
  ta: () => import('./locales/ta'),
  te: () => import('./locales/te'),
  th: () => import('./locales/th'),
  tr: () => import('./locales/tr'),
  uk: () => import('./locales/uk'),
  ur: () => import('./locales/ur'),
  vi: () => import('./locales/vi'),
  zh: () => import('./locales/zh'),
} as const satisfies Record<string, Loader>

export type Language = 'en' | keyof typeof LOCALES
export const LANGUAGES = ['en', ...Object.keys(LOCALES)] as Language[]
const isLanguage = (lng: string): lng is Language => (LANGUAGES as string[]).includes(lng)

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

// The page's lang and direction follow the language, so Arabic, Hebrew, Persian and Urdu lay out right to left.
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
    nonExplicitSupportedLngs: true,
    fallbackLng: 'en',
    load: 'languageOnly',
    // `?lng=he` in a link opens Hebrew; the choice is then kept in localStorage.
    detection: { order: ['querystring', 'localStorage', 'navigator'], caches: ['localStorage'] },
    interpolation: { escapeValue: false },
  })

export default i18n
