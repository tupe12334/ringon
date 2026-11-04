import { useTranslation } from 'react-i18next'
import { LANGUAGES, type Language } from '.'

/** Each language's name in that language, e.g. "Deutsch", from the browser's own data. */
const nativeName = (lng: Language) => {
  const name = new Intl.DisplayNames([lng], { type: 'language' }).of(lng) ?? lng
  return name.charAt(0).toLocaleUpperCase(lng) + name.slice(1)
}

const OPTIONS = LANGUAGES.map((lng) => ({ lng, name: nativeName(lng) })).sort((a, b) => a.name.localeCompare(b.name, 'en'))

export function LanguagePicker() {
  const { t, i18n } = useTranslation()
  return (
    <select className="language" aria-label={t('app.language')} value={i18n.resolvedLanguage} onChange={(e) => i18n.changeLanguage(e.target.value)}>
      {OPTIONS.map(({ lng, name }) => (
        <option key={lng} value={lng} lang={lng}>
          {name}
        </option>
      ))}
    </select>
  )
}
