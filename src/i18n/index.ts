// UI language: picked from the browser and remembered on this device. English ships in the
// main bundle; every other language is its own chunk, fetched when it is first used.

import i18n, { type BackendModule } from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import { en, type Translation } from './en'

type Loader = () => Promise<{ default: Translation }>

/** Every UI language but English, by BCP 47 code. A new language is one line here plus its file. */
const LOCALES = {
  hi: () => import('./locales/hi'),
  bn: () => import('./locales/bn'),
  mr: () => import('./locales/mr'),
  gu: () => import('./locales/gu'),
  ta: () => import('./locales/ta'),
  te: () => import('./locales/te'),
  kn: () => import('./locales/kn'),
  ml: () => import('./locales/ml'),
  ar: () => import('./locales/ar'),
  fa: () => import('./locales/fa'),
  ur: () => import('./locales/ur'),
  tr: () => import('./locales/tr'),
  hu: () => import('./locales/hu'),
  am: () => import('./locales/am'),
  sw: () => import('./locales/sw'),
  de: () => import('./locales/de'),
  es: () => import('./locales/es'),
  pt: () => import('./locales/pt'),
  fr: () => import('./locales/fr'),
  it: () => import('./locales/it'),
  ca: () => import('./locales/ca'),
  ro: () => import('./locales/ro'),
  he: () => import('./locales/he'),
  pl: () => import('./locales/pl'),
  cs: () => import('./locales/cs'),
  sk: () => import('./locales/sk'),
  sl: () => import('./locales/sl'),
  hr: () => import('./locales/hr'),
  sr: () => import('./locales/sr'),
  uk: () => import('./locales/uk'),
  bg: () => import('./locales/bg'),
  ru: () => import('./locales/ru'),
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
