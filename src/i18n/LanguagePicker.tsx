import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES, type Language } from '.'
import { languageOptions } from './languageOptions'

export function LanguagePicker() {
  const { t, i18n } = useTranslation()
  const current = (i18n.resolvedLanguage ?? 'en') as Language
  const { suggested, all } = useMemo(() => languageOptions(LANGUAGES, current, navigator.languages ?? []), [current])
  return (
    <select className="language" aria-label={t('app.language')} value={current} onChange={(e) => i18n.changeLanguage(e.target.value)}>
      {suggested.map(({ lng, label }) => (
        <option key={`top-${lng}`} value={lng}>
          {label}
        </option>
      ))}
      {/* A divider where the browser draws one in a select; ignored elsewhere. */}
      <hr />
      {all.map(({ lng, label }) => (
        <option key={lng} value={lng}>
          {label}
        </option>
      ))}
    </select>
  )
}
