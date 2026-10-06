// UI language: English or Hebrew, picked from the browser and remembered on this device.

import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import { en } from './en'
import { he } from './he'

export const LANGUAGES = ['en', 'he'] as const
export type Language = (typeof LANGUAGES)[number]

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: { translation: typeof en }
  }
}

// The page's lang and direction follow the language, so Hebrew lays out right to left.
i18n.on('languageChanged', (lng) => {
  if (typeof document === 'undefined') return
  document.documentElement.lang = lng
  document.documentElement.dir = i18n.dir(lng)
})

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, he: { translation: he } },
    supportedLngs: LANGUAGES,
    nonExplicitSupportedLngs: true,
    fallbackLng: 'en',
    load: 'languageOnly',
    // `?lng=he` in a link opens Hebrew; the choice is then kept in localStorage.
    detection: { order: ['querystring', 'localStorage', 'navigator'], caches: ['localStorage'] },
    interpolation: { escapeValue: false },
  })

export const currentLanguage = (): Language => (i18n.resolvedLanguage === 'he' ? 'he' : 'en')

export default i18n
