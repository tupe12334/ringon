import { useTranslation } from 'react-i18next'
import type { useRecorder } from './recorder'

interface Props {
  recorder: ReturnType<typeof useRecorder>
  ready: boolean
  flip: boolean
  onFlip: () => void
}

/** The dock: flip and record on the sides, the round shutter (a photo) in the centre. */
export function CaptureDock({ recorder, ready, flip, onFlip }: Props) {
  const { t } = useTranslation()
  return (
    <div className="dock capture">
      <button type="button" className="dock-btn" onClick={onFlip} aria-pressed={flip}>
        {t('tryon.flip')}
      </button>
      <div className="shutter-wrap">
        <button type="button" className="shutter" onClick={recorder.snapshot} disabled={!ready} aria-label={t('tryon.photo')}>
          <i aria-hidden="true" />
        </button>
        <span className="shutter-label" aria-hidden="true">
          {t('tryon.photo')}
        </span>
      </div>
      <button type="button" className={recorder.recording ? 'dock-btn record on' : 'dock-btn record'} onClick={recorder.recording ? recorder.stop : recorder.start} disabled={!ready || !recorder.supported}>
        {recorder.recording ? t('tryon.stop', { seconds: recorder.seconds }) : t('tryon.record')}
      </button>
    </div>
  )
}
