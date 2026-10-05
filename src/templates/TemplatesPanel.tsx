import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DesignIcon } from '../customizer/icons'
import { BUILTIN_TEMPLATES } from './builtin'
import { parseImport, shareUrl } from './share'
import { useStore } from './store'

function download(name: string, text: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export function TemplatesPanel() {
  const spec = useStore((s) => s.spec)
  const templates = useStore((s) => s.templates)
  const setSpec = useStore((s) => s.setSpec)
  const save = useStore((s) => s.saveTemplate)
  const remove = useStore((s) => s.deleteTemplate)
  const addTemplates = useStore((s) => s.addTemplates)
  const { t } = useTranslation()
  const builtinName = (name: string) => t(`builtin.${name}`, { defaultValue: name })
  const [name, setName] = useState(() => builtinName(spec.name))
  const [message, setMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const share = async () => {
    const url = shareUrl(spec)
    try {
      if (navigator.share) await navigator.share({ title: t('templates.shareTitle', { name: spec.name }), url })
      else {
        await navigator.clipboard.writeText(url)
        setMessage(t('templates.linkCopied'))
      }
    } catch {
      setMessage(url)
    }
  }

  return (
    <>
      <div className="field">
        <div className="field-label">
          <span>{t('templates.saveAs')}</span>
        </div>
        <div className="row">
          <input type="text" aria-label={t('templates.name')} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          <button
            type="button"
            className="primary"
            onClick={() => {
              save(name.trim() || t('templates.defaultName'))
              setMessage(t('templates.saved'))
            }}
          >
            {t('templates.save')}
          </button>
        </div>
      </div>
      <div className="row wrap">
        <button type="button" onClick={share}>{t('templates.share')}</button>
        <button type="button" onClick={() => download(`${spec.name || 'ring'}.ringon.json`, JSON.stringify(spec, null, 2))}>{t('templates.exportDesign')}</button>
        {templates.length > 0 && (
          <button type="button" onClick={() => download('ringon-templates.json', JSON.stringify(templates.map((x) => x.spec), null, 2))}>{t('templates.exportMine')}</button>
        )}
        <button type="button" onClick={() => fileRef.current?.click()}>{t('templates.import')}</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            if (file.size > 1_000_000) return setMessage(t('templates.tooLarge'))
            try {
              const specs = parseImport(await file.text())
              addTemplates(specs)
              setMessage(t('templates.imported', { count: specs.length }))
            } catch {
              setMessage(t('templates.notDesign'))
            }
          }}
        />
      </div>
      {message && (
        <p className="note" role="status">
          {message}
        </p>
      )}

      <h3>{t('templates.mine')}</h3>
      {templates.length === 0 ? (
        <p className="note">{t('templates.empty')}</p>
      ) : (
        <ul className="templates">
          {templates.map((x) => (
            <li key={x.id}>
              <button type="button" className="template" onClick={() => setSpec(x.spec)}>
                <DesignIcon spec={x.spec} />
                {x.spec.name}
              </button>
              <button type="button" className="icon" aria-label={t('templates.delete', { name: x.spec.name })} onClick={() => remove(x.id)}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <h3>{t('templates.classics')}</h3>
      <ul className="templates">
        {BUILTIN_TEMPLATES.map((b) => (
          <li key={b.name}>
            <button
              type="button"
              className="template"
              onClick={() => {
                setSpec({ ...b, innerDiameterMm: spec.innerDiameterMm })
                setName(builtinName(b.name))
              }}
            >
              <DesignIcon spec={b} />
              {builtinName(b.name)}
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
