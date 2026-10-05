import { useState, type ComponentType } from 'react'
import { useStore } from '../templates/store'
import { TemplatesPanel } from '../templates/TemplatesPanel'
import { tabIcons } from './icons'
import { Preview } from './Preview'
import { summary } from './summary'
import { AccentsPanel, BandPanel, EngravePanel, MetalPanel, SettingPanel, SidesPanel, SizePanel, StonePanel } from './panels'

const TABS: { id: string; label: string; Panel: ComponentType }[] = [
  { id: 'templates', label: 'Templates', Panel: TemplatesPanel },
  { id: 'size', label: 'Size', Panel: SizePanel },
  { id: 'band', label: 'Band', Panel: BandPanel },
  { id: 'metal', label: 'Metal', Panel: MetalPanel },
  { id: 'stone', label: 'Stone', Panel: StonePanel },
  { id: 'setting', label: 'Setting', Panel: SettingPanel },
  { id: 'sides', label: 'Side stones', Panel: SidesPanel },
  { id: 'accents', label: 'Band stones', Panel: AccentsPanel },
  { id: 'engrave', label: 'Engrave', Panel: EngravePanel },
]

export function Customizer({ onTryOn }: { onTryOn: () => void }) {
  const spec = useStore((s) => s.spec)
  const system = useStore((s) => s.sizeSystem)
  const [tab, setTab] = useState('templates')
  const Panel = TABS.find((t) => t.id === tab)!.Panel

  return (
    <div className="customizer">
      <header className="topbar">
        <h1>Ringon</h1>
        <button type="button" className="primary tryon-btn" onClick={onTryOn}>
          Try on my hand
        </button>
      </header>

      <div className="preview" data-testid="preview">
        <Preview spec={spec} />
        <p className="summary" data-testid="summary">
          {summary(spec, system)}
        </p>
      </div>

      <nav className="tabs" role="tablist" aria-label="Design sections">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={t.id === tab} className={t.id === tab ? 'tab on' : 'tab'} onClick={() => setTab(t.id)}>
            {tabIcons[t.id]}
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
      <section className="panel" role="tabpanel" aria-label={TABS.find((t) => t.id === tab)!.label}>
        <Panel />
      </section>
    </div>
  )
}
