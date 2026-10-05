import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Customizer } from './customizer/Customizer'
import { specFromHash } from './templates/share'
import { useStore } from './templates/store'

// The camera view pulls in MediaPipe; load it only when the user opens it.
const TryOn = lazy(() => import('./tryon/TryOn').then((m) => ({ default: m.TryOn })))

type View = 'design' | 'tryon'

export default function App() {
  const [view, setView] = useState<View>(() => (location.hash === '#try' ? 'tryon' : 'design'))
  const setSpec = useStore((s) => s.setSpec)
  const pushed = useRef(false)

  // Open a shared design (#d=...), on load or when a link is followed in an open tab,
  // then drop it from the URL.
  useEffect(() => {
    const open = () => {
      const shared = specFromHash()
      if (!shared) return
      setSpec(shared)
      setView('design')
      history.replaceState(null, '', location.pathname + location.search)
    }
    open()
    addEventListener('hashchange', open)
    return () => removeEventListener('hashchange', open)
  }, [setSpec])

  // The phone's back button leaves the camera view.
  useEffect(() => {
    const onPop = () => {
      const tryon = location.hash === '#try'
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
            history.replaceState(null, '', location.pathname + location.search)
            setView('design')
          }}
        />
      </Suspense>
    )
  return (
    <Customizer
      onTryOn={() => {
        history.pushState(null, '', '#try')
        pushed.current = true
        setView('tryon')
      }}
    />
  )
}
