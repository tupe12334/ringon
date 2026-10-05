import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Customizer } from './customizer/Customizer'
import { DEFAULT_SPEC } from './ring/spec'
import { BUILTIN_TEMPLATES } from './templates/builtin'
import { isTryOnHash, specFromHash, specHash } from './templates/share'
import { useStore } from './templates/store'

// The camera view pulls in MediaPipe; load it only when the user opens it.
const TryOn = lazy(() => import('./tryon/TryOn').then((m) => ({ default: m.TryOn })))

type View = 'design' | 'tryon'

/** Opening someone's link replaces the design on screen: keep ours as a template first. */
function keepUnsavedDesign() {
  const { spec, templates, addTemplates } = useStore.getState()
  const same = (a: unknown) => JSON.stringify(a) === JSON.stringify(spec)
  if (templates.some((t) => same(t.spec)) || BUILTIN_TEMPLATES.some((t) => same(t)) || same(DEFAULT_SPEC)) return
  addTemplates([{ ...spec, name: `${spec.name} (before opening a link)`.slice(0, 60) }])
}

export default function App() {
  const [view, setView] = useState<View>(() => (isTryOnHash() ? 'tryon' : 'design'))
  const spec = useStore((s) => s.spec)
  const setSpec = useStore((s) => s.setSpec)
  const pushed = useRef(false)

  // Open a shared design (#r=... or an older #d=...), on load or when a link is followed in an open tab.
  useEffect(() => {
    const open = () => {
      const shared = specFromHash()
      if (!shared || JSON.stringify(shared) === JSON.stringify(useStore.getState().spec)) return
      keepUnsavedDesign()
      setSpec(shared)
      setView(isTryOnHash() ? 'tryon' : 'design')
    }
    open()
    addEventListener('hashchange', open)
    return () => removeEventListener('hashchange', open)
  }, [setSpec])

  // Keep the design on screen in the address bar, so the URL is always a link to this ring.
  useEffect(() => {
    history.replaceState(history.state, '', specHash(spec, view === 'tryon'))
  }, [spec, view])

  // The phone's back button leaves the camera view.
  useEffect(() => {
    const onPop = () => {
      const tryon = isTryOnHash()
      if (!tryon) pushed.current = false
      setView(tryon ? 'tryon' : 'design')
    }
    addEventListener('popstate', onPop)
    return () => removeEventListener('popstate', onPop)
  }, [])

  if (view === 'tryon')
    return (
      <Suspense fallback={<div className="tryon loading">Loading try-on…</div>}>
        <TryOn
          onBack={() => {
            if (pushed.current) return history.back()
            setView('design')
          }}
        />
      </Suspense>
    )
  return (
    <Customizer
      onTryOn={() => {
        history.pushState(null, '', specHash(spec, true))
        pushed.current = true
        setView('tryon')
      }}
    />
  )
}
