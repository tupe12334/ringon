import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Svg } from '../customizer/icons'
import { isLanguage, LANGUAGES } from '.'
import { languageOptions } from './languageOptions'

/** A globe, so the picker reads as "language" in any script. */
const globeIcon = (
  <Svg>
    <circle cx={12} cy={12} r={9} />
    <path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z" />
  </Svg>
)

export function LanguagePicker() {
  const { t, i18n } = useTranslation()
  const resolved = i18n.resolvedLanguage ?? 'en'
  const current = isLanguage(resolved) ? resolved : 'en'
  const { suggested, all } = useMemo(() => languageOptions(LANGUAGES, current, navigator.languages ?? []), [current])
  return (
    <span className="language-pick">
      {globeIcon}
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
    </span>
  )
}
