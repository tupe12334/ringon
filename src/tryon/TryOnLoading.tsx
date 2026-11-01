// What covers the camera until the ring can be shown: an opaque start-up screen, a full-screen
// error, and the coaching shown over the video while no hand is in view. Kept free of three.js
// and MediaPipe so the app shell can show it while the try-on chunk downloads.

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

/** Back to the designer, in words: the screen has nothing else to explain it. */
function BackButton({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation()
  return (
    <button type="button" onClick={onBack}>
      {t('tryon.backToDesigner')}
    </button>
  )
}

/** Opaque full-screen start-up: the camera never shows before the ring is ready to go on it. */
export function TryOnLoading({ text, hint, onBack }: { text: string; hint?: string; onBack: () => void }) {
  return (
    <div className="tryon-screen" data-testid="tracking-status" data-status="loading">
      <div className="spinner" aria-hidden="true" />
      <div role="status" aria-live="polite">
        <p className="tryon-screen-title">{text}</p>
        {hint && <p className="tryon-screen-hint">{hint}</p>}
      </div>
      <BackButton onBack={onBack} />
    </div>
  )
}

/** The camera or hand tracking failed: say why, and offer another go or the way back. */
export function TryOnError({ error, onRetry, onBack }: { error: string; onRetry: () => void; onBack: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="tryon-screen" data-testid="tracking-status" data-status="error">
      <div role="alert">
        <p className="tryon-screen-title">{t('tryon.errorTitle')}</p>
        <p className="tryon-screen-hint">{t('tryon.error', { error })}</p>
      </div>
      <div className="row">
        <button type="button" className="primary" onClick={onRetry}>
          {t('tryon.retry')}
        </button>
        <BackButton onBack={onBack} />
      </div>
    </div>
  )
}

/** How long the hand may be gone before the coaching comes back (no flicker on dropped frames). */
const LOST_MS = 1000

/** "Hold up your hand": shown over the video while no hand is tracked, so plain video is never a mystery. */
export function Coaching({ tracking, hand }: { tracking: boolean; hand: 'auto' | 'Left' | 'Right' }) {
  const { t } = useTranslation()
  // Shown at the start; hidden the moment a hand is tracked, back once it has been gone a while.
  const [lost, setLost] = useState(true)
  useEffect(() => {
    const id = setTimeout(() => setLost(!tracking), tracking ? 0 : LOST_MS)
    return () => clearTimeout(id)
  }, [tracking])
  if (tracking || !lost) return null
  return (
    <div className="coaching" data-testid="coaching" role="status" aria-live="polite">
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {/* An open hand, fingers up. */}
        <path d="M22 34V14a3 3 0 0 1 6 0v16M28 30V9a3 3 0 0 1 6 0v21M34 30V11a3 3 0 0 1 6 0v20M40 31V17a3 3 0 0 1 6 0v19c0 12-6 20-15 20-6 0-10-3-13-8l-7-11a3 3 0 0 1 5-4l4 5" />
      </svg>
      <p>{t(`tryon.coach.${hand}`)}</p>
    </div>
  )
}
