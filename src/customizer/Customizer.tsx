import { useState, type ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import { LanguagePicker } from '../i18n/LanguagePicker'
import { useStore } from '../templates/store'
import { TemplatesPanel } from '../templates/TemplatesPanel'
import { useTheme, PREVIEW_BACKGROUND } from '../theme'
import { handIcon, tabIcons, themeIcons } from './icons'
import { Preview } from './Preview'
import { summary } from './summary'
import { ImagePanel } from '../imagegen/ImagePanel'
import { MetalPanel } from './MetalPanel'
import { AccentsPanel, BandPanel, EngravePanel, SettingPanel, SidesPanel, SizePanel, StonePanel } from './panels'

const TABS = [
  { id: 'templates', Panel: TemplatesPanel },
  { id: 'size', Panel: SizePanel },
  { id: 'band', Panel: BandPanel },
  { id: 'metal', Panel: MetalPanel },
  { id: 'stone', Panel: StonePanel },
  { id: 'setting', Panel: SettingPanel },
  { id: 'sides', Panel: SidesPanel },
  { id: 'accents', Panel: AccentsPanel },
  { id: 'engrave', Panel: EngravePanel },
  { id: 'image', Panel: ImagePanel },
] as const satisfies readonly { id: string; Panel: ComponentType }[]

type Tab = (typeof TABS)[number]['id']

export function Customizer({ onTryOn }: { onTryOn: () => void }) {
  const spec = useStore((s) => s.spec)
  const system = useStore((s) => s.sizeSystem)
  const [tab, setTab] = useState<Tab>('templates')
  const { t } = useTranslation()
  const [theme, nextTheme] = useTheme()
  const Panel = TABS.find((x) => x.id === tab)!.Panel

  return (
    <div className="customizer">
      <header className="topbar">
        <h1>Ringon</h1>
        <div className="row">
          <LanguagePicker />
          <button type="button" className="theme-btn" onClick={nextTheme} aria-label={t('theme.change', { name: t(`theme.${theme}`) })}>
            {theme === 'light' ? themeIcons.light : themeIcons.dark}
            <span>{t(`theme.${theme}`)}</span>
          </button>
        </div>
      </header>

      <div className="preview" data-testid="preview">
        <Preview spec={spec} background={PREVIEW_BACKGROUND[theme]} />
        <p className="summary" data-testid="summary">
          {summary(spec, system)}
        </p>
      </div>

      {/* The step rail: a column at the inline start (right in RTL). */}
      <nav className="tabs" role="tablist" aria-label={t('tabs.aria')} aria-orientation="vertical">
        {TABS.map((x) => (
          <button key={x.id} type="button" role="tab" aria-selected={x.id === tab} className={x.id === tab ? 'tab on' : 'tab'} onClick={() => setTab(x.id)}>
            {tabIcons[x.id]}
            <span>{t(`tabs.${x.id}`)}</span>
          </button>
        ))}
      </nav>
      <section className="panel" role="tabpanel" aria-label={t(`tabs.${tab}`)}>
        <Panel />
      </section>

      <div className="tryon-bar">
        <button type="button" className="primary tryon-btn" onClick={onTryOn}>
          {handIcon}
          {t('app.tryOn')}
        </button>
      </div>
    </div>
  )
}
