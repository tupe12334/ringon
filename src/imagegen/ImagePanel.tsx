// Photo of the design on a hand: a prompt to copy into any image tool, or a direct request to
// an image service with the user's own key, the ring render and (optionally) a hand photo.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Chips, Field, Toggle } from '../customizer/controls'
import { useStore } from '../templates/store'
import { buildPrompt, FINGERS, HANDS, SHOTS, type Finger, type Hand, type Shot } from './prompt'
import { openRouterImageModels, PROVIDER_INFO, PROVIDERS, type ProviderId } from './providers'
import { loadSettings, modelFor, saveSettings } from './settings'

/** The 3D view as an image: the photoreal overlay when it is showing, else the live canvas. */
function captureRing(): Promise<Blob | null> {
  const canvases = [...document.querySelectorAll<HTMLCanvasElement>('[data-testid="preview"] canvas')]
  // The photoreal overlay stays in the DOM with visibility: hidden while the real-time view shows.
  const shown = canvases.filter((c) => c.width > 0 && c.checkVisibility?.({ visibilityProperty: true }) !== false)
  const canvas = shown.at(-1)
  return new Promise((resolve) => (canvas ? canvas.toBlob(resolve, 'image/png') : resolve(null)))
}

/** An image file picker with a thumbnail and a remove button. */
function ImageInput({ label, file, onChange }: { label: string; file: Blob | null; onChange: (f: Blob | null) => void }) {
  const { t } = useTranslation()
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url])
  return (
    <Field label={label}>
      <div className="row wrap">
        {url && <img src={url} alt="" width={64} height={64} style={{ objectFit: 'cover', borderRadius: 8 }} />}
        <input type="file" accept="image/*" aria-label={label} onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
        {file && (
          <button type="button" onClick={() => onChange(null)}>
            {t('imagegen.remove')}
          </button>
        )}
      </div>
    </Field>
  )
}

export function ImagePanel() {
  const spec = useStore((s) => s.spec)
  const { t } = useTranslation()
  const [hand, setHand] = useState<Hand>('left')
  const [finger, setFinger] = useState<Finger>('ring')
  const [shot, setShot] = useState<Shot>('close-up')
  const [notes, setNotes] = useState('')
  const [handPhoto, setHandPhoto] = useState<Blob | null>(null)
  const [ringPhoto, setRingPhoto] = useState<Blob | null>(null)
  const [settings, setSettings] = useState(loadSettings)
  const [models, setModels] = useState<string[]>([])
  const [state, setState] = useState<{ busy?: boolean; error?: string; result?: string; copied?: boolean }>({})
  const abort = useRef<AbortController | null>(null)

  const prompt = buildPrompt(spec, { hand, finger, shot, notes, handPhoto: !!handPhoto })
  const provider = settings.provider
  const info = PROVIDER_INFO[provider]
  const key = settings.keys[provider] ?? ''
  const update = (patch: Partial<typeof settings>) =>
    setSettings((s) => {
      const next = { ...s, ...patch }
      saveSettings(next)
      return next
    })

  useEffect(() => {
    if (provider !== 'openrouter' || models.length) return
    const ctrl = new AbortController()
    openRouterImageModels(ctrl.signal).then(setModels, () => {})
    return () => ctrl.abort()
  }, [provider, models.length])
  useEffect(() => () => abort.current?.abort(), [])
  useEffect(() => () => void (state.result && URL.revokeObjectURL(state.result)), [state.result])

  const copy = async () => {
    await navigator.clipboard.writeText(prompt)
    setState((s) => ({ ...s, copied: true }))
  }

  const generate = async () => {
    abort.current?.abort()
    const ctrl = (abort.current = new AbortController())
    setState({ busy: true })
    try {
      const ring = ringPhoto ?? (await captureRing())
      if (!ring) throw new Error(t('imagegen.noRender'))
      const images = handPhoto && shot !== 'product' ? [ring, handPhoto] : [ring]
      const blob = await info.generate({ key: key.trim(), model: modelFor(settings), prompt, images, signal: ctrl.signal })
      setState({ result: URL.createObjectURL(blob) })
    } catch (e) {
      if (!ctrl.signal.aborted) setState({ error: e instanceof Error ? e.message : String(e) })
    }
  }

  return (
    <>
      <Chips label={t('imagegen.shot')} value={shot} options={SHOTS} labels={t('imagegen.shots', { returnObjects: true })} onChange={setShot} />
      {shot !== 'product' && (
        <>
          <Chips label={t('imagegen.hand')} value={hand} options={HANDS} labels={t('imagegen.hands', { returnObjects: true })} onChange={setHand} />
          <Chips label={t('imagegen.finger')} value={finger} options={FINGERS} labels={t('tryon.fingers', { returnObjects: true })} onChange={setFinger} />
          <ImageInput label={t('imagegen.handPhoto')} file={handPhoto} onChange={setHandPhoto} />
        </>
      )}
      <ImageInput label={t('imagegen.ringPhoto')} file={ringPhoto} onChange={setRingPhoto} />
      <p className="note">{t('imagegen.ringPhotoNote')}</p>
      <Field label={t('imagegen.notes')}>
        <textarea rows={2} aria-label={t('imagegen.notes')} value={notes} maxLength={500} placeholder={t('imagegen.notesPlaceholder')} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      <Field label={t('imagegen.prompt')}>
        <textarea rows={8} readOnly dir="ltr" aria-label={t('imagegen.prompt')} value={prompt} data-testid="imagegen-prompt" />
      </Field>
      <button type="button" onClick={copy}>
        {state.copied ? t('imagegen.copied') : t('imagegen.copy')}
      </button>

      <h3>{t('imagegen.generateTitle')}</h3>
      <Chips
        label={t('imagegen.service')}
        value={provider}
        options={PROVIDERS}
        labels={Object.fromEntries(PROVIDERS.map((p) => [p, PROVIDER_INFO[p].name])) as Record<ProviderId, string>}
        onChange={(p) => update({ provider: p })}
      />
      <Field label={t('imagegen.model')} hint={t('imagegen.modelDefault', { model: info.defaultModel })}>
        <input
          type="text"
          dir="ltr"
          aria-label={t('imagegen.model')}
          list={provider === 'openrouter' ? 'imagegen-models' : undefined}
          value={settings.models[provider] ?? ''}
          placeholder={info.defaultModel}
          onChange={(e) => update({ models: { ...settings.models, [provider]: e.target.value } })}
        />
        <datalist id="imagegen-models">{models.map((m) => <option key={m} value={m} />)}</datalist>
      </Field>
      <Field label={t('imagegen.key', { service: info.name })}>
        <input type="password" dir="ltr" aria-label={t('imagegen.key', { service: info.name })} autoComplete="off" spellCheck={false} value={key} onChange={(e) => update({ keys: { ...settings.keys, [provider]: e.target.value } })} />
      </Field>
      <a href={info.keyUrl} target="_blank" rel="noreferrer">
        {t('imagegen.getKey', { service: info.name })}
      </a>
      <Toggle label={t('imagegen.remember')} value={settings.remember} onChange={(remember) => update({ remember })} />
      <p className="note">{t('imagegen.privacy', { service: info.name })}</p>
      <button type="button" className="primary" disabled={!key.trim() || state.busy} onClick={generate}>
        {state.busy ? t('imagegen.generating') : t('imagegen.generate')}
      </button>
      {state.error && (
        <p className="note" role="alert">
          {t('imagegen.failed', { error: state.error })}
        </p>
      )}
      {state.result && (
        <figure>
          <img src={state.result} alt={t('imagegen.resultAlt')} style={{ width: '100%', borderRadius: 12 }} />
          <a href={state.result} download={`${spec.name || 'ring'}.png`}>
            {t('imagegen.download')}
          </a>
        </figure>
      )}
    </>
  )
}
