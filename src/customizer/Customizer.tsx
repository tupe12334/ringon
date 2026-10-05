import { useState, type ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'
import { useStore } from '../templates/store'
import { TemplatesPanel } from '../templates/TemplatesPanel'
import { tabIcons } from './icons'
import { Preview } from './Preview'
import { summary } from './summary'
import { AccentsPanel, BandPanel, EngravePanel, MetalPanel, SettingPanel, SidesPanel, SizePanel, StonePanel } from './panels'

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
] as const satisfies readonly { id: string; Panel: ComponentType }[]

type Tab = (typeof TABS)[number]['id']

export function Customizer({ onTryOn }: { onTryOn: () => void }) {
  const spec = useStore((s) => s.spec)
  const system = useStore((s) => s.sizeSystem)
  const [tab, setTab] = useState<Tab>('templates')
  const { t } = useTranslation()
  const Panel = TABS.find((x) => x.id === tab)!.Panel

  return (
    <div className="customizer">
      <header className="topbar">
        <h1>Ringon</h1>
        <div className="row">
          <button
            type="button"
            lang={i18n.resolvedLanguage === 'he' ? 'en' : 'he'}
            aria-label={t('app.switchLanguage')}
            onClick={() => i18n.changeLanguage(i18n.resolvedLanguage === 'he' ? 'en' : 'he')}
          >
            {t('app.otherLanguage')}
          </button>
          <button type="button" className="primary tryon-btn" onClick={onTryOn}>
            {t('app.tryOn')}
          </button>
        </div>
      </header>

      <div className="preview" data-testid="preview">
        <Preview spec={spec} />
        <p className="summary" data-testid="summary">
          {summary(spec, system)}
        </p>
      </div>

      <nav className="tabs" role="tablist" aria-label={t('tabs.aria')}>
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
    </div>
  )
}
