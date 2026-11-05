import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Svg } from '../customizer/icons'
import { isLanguage, LANGUAGES, type Language } from '.'
import { languageOptions, searchLanguages, type LanguageOption } from './languageOptions'

/** A globe, so the picker reads as "language" in any script. */
const globeIcon = (
  <Svg>
    <circle cx={12} cy={12} r={9} />
    <path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z" />
  </Svg>
)

/** The viewer's country from the worker (GET /country), or undefined off ringon.app or on any failure. */
function useCountry() {
  const [country, setCountry] = useState<string>()
  useEffect(() => {
    fetch('/country')
      .then((r) => (r.ok ? r.text() : ''))
      // A dev or preview server answers with index.html instead; only a two-letter code counts.
      .then((text) => /^[A-Z]{2}$/.test(text) && setCountry(text))
      .catch(() => {})
  }, [])
  return country
}

/** A magnifier, so the empty box reads as "search" in any script. */
const searchIcon = (
  <Svg>
    <circle cx={11} cy={11} r={6} />
    <path d="m20 20-4.5-4.5" />
  </Svg>
)

const optionId = (lng: Language) => `language-${lng}`

/**
 * The language pill opens a dialog with a search box over every language (combobox + listbox pattern).
 * Typing a letter on the closed pill opens it with that letter, so a keyboard user just types the name.
 */
export function LanguagePicker() {
  const { t, i18n } = useTranslation()
  const resolved = i18n.resolvedLanguage ?? 'en'
  const current = isLanguage(resolved) ? resolved : 'en'
  const country = useCountry()
  const { suggested, all } = useMemo(() => languageOptions(LANGUAGES, current, navigator.languages ?? [], country), [current, country])
  const dialog = useRef<HTMLDialogElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const searching = query.trim() !== ''
  const results = useMemo(() => (searching ? searchLanguages([...suggested, ...all], query) : [...suggested, ...all]), [searching, query, suggested, all])
  const shown: LanguageOption | undefined = results[active] ?? results[0]

  useEffect(() => {
    if (shown) document.getElementById(optionId(shown.lng))?.scrollIntoView({ block: 'nearest' })
  }, [shown])

  const open = (typed = '') => {
    // The box is uncontrolled: React restoring a controlled value could drop a key typed before it re-renders.
    if (search.current) search.current.value = typed
    setQuery(typed)
    setActive(0)
    dialog.current?.showModal()
    // WebKit focuses the dialog, not its first field; the rest of what was typed must land in the search box.
    search.current?.focus()
    // WebKit puts the caret at the start; the next letters go after the first one.
    search.current?.setSelectionRange(typed.length, typed.length)
  }
  const pick = (lng: Language) => {
    dialog.current?.close()
    if (lng !== current) void i18n.changeLanguage(lng)
  }
  const onPillKey = (e: KeyboardEvent) => {
    if (e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault()
      open(e.key)
    }
  }
  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    const move = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
    if (move && results.length) {
      e.preventDefault()
      setActive((i) => (i + move + results.length) % results.length)
    } else if (e.key === 'Escape') {
      // A search box's own Escape only clears it; here it closes the picker, as the dialog promises.
      e.preventDefault()
      dialog.current?.close()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      // A fast typist can press Enter before the results for the last letter render; search the box itself.
      const typed = e.currentTarget.value
      const choice = typed === query ? shown : searchLanguages([...suggested, ...all], typed)[0]
      if (choice) pick(choice.lng)
    }
  }
  const option = (o: LanguageOption) => (
    <li
      key={o.lng}
      id={optionId(o.lng)}
      role="option"
      aria-selected={o.lng === shown?.lng}
      className={o.lng === current ? 'current' : undefined}
      onPointerMove={() => setActive(results.indexOf(o))}
      onClick={() => pick(o.lng)}
    >
      {o.label}
    </li>
  )
  const currentLabel = [...suggested, ...all].find((o) => o.lng === current)?.label

  return (
    <>
      <button type="button" className="language" aria-haspopup="dialog" aria-label={`${t('app.language')}: ${currentLabel}`} onClick={() => open()} onKeyDown={onPillKey}>
        {globeIcon}
        <span>{currentLabel}</span>
      </button>
      {/* A click on the backdrop lands on the dialog itself and closes it. */}
      <dialog ref={dialog} className="language-dialog" aria-label={t('app.language')} onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}>
        <div className="language-search">
          {searchIcon}
          <input
            ref={search}
            type="search"
            role="combobox"
            aria-label={t('app.language')}
            placeholder={`${t('app.language')}…`}
            aria-expanded="true"
            aria-controls="language-list"
            aria-activedescendant={shown ? optionId(shown.lng) : undefined}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={onSearchKey}
          />
          {/* Full screen on a phone there is no backdrop to tap and no Escape key. */}
          <button type="button" className="language-close" aria-label={t('tryon.close')} onClick={() => dialog.current?.close()}>
            ×
          </button>
        </div>
        <ul id="language-list" role="listbox" aria-label={t('app.language')}>
          {searching ? (
            results.map(option)
          ) : (
            <>
              <li role="group" aria-label={t('app.suggested')}>
                <span className="group-label" aria-hidden="true">
                  {t('app.suggested')}
                </span>
                <ul role="presentation">{suggested.map(option)}</ul>
              </li>
              {all.map(option)}
            </>
          )}
        </ul>
      </dialog>
    </>
  )
}
