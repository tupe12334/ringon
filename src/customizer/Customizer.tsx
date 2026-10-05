import { Bounds, ContactShadows, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useState, type ComponentType } from 'react'
import { RingModel, StudioEnvironment } from '../ring/RingModel'
import { useStore } from '../templates/store'
import { TemplatesPanel } from '../templates/TemplatesPanel'
import { summary } from './summary'
import { AccentsPanel, BandPanel, EngravePanel, MetalPanel, SettingPanel, SizePanel, StonePanel } from './panels'

const TABS: { id: string; label: string; Panel: ComponentType }[] = [
  { id: 'templates', label: 'Templates', Panel: TemplatesPanel },
  { id: 'size', label: 'Size', Panel: SizePanel },
  { id: 'band', label: 'Band', Panel: BandPanel },
  { id: 'metal', label: 'Metal', Panel: MetalPanel },
  { id: 'stone', label: 'Stone', Panel: StonePanel },
  { id: 'setting', label: 'Setting', Panel: SettingPanel },
  { id: 'accents', label: 'Accents', Panel: AccentsPanel },
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
        <Canvas dpr={[1, 2]} camera={{ fov: 35, position: [0, 32, 52], near: 1, far: 1000 }} gl={{ antialias: true, preserveDrawingBuffer: true }}>
          <StudioEnvironment background />
          <Bounds fit clip observe margin={1.25}>
            <group rotation={[-Math.PI / 2, 0, 0]}>
              <RingModel spec={spec} />
            </group>
          </Bounds>
          <ContactShadows position={[0, -12, 0]} opacity={0.35} scale={60} blur={2.5} far={20} />
          <OrbitControls makeDefault autoRotate autoRotateSpeed={0.6} enablePan={false} minDistance={15} maxDistance={150} />
        </Canvas>
        <p className="summary" data-testid="summary">
          {summary(spec, system)}
        </p>
      </div>

      <nav className="tabs" role="tablist" aria-label="Design sections">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={t.id === tab} className={t.id === tab ? 'tab on' : 'tab'} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      <section className="panel" role="tabpanel" aria-label={TABS.find((t) => t.id === tab)!.label}>
        <Panel />
      </section>
    </div>
  )
}
