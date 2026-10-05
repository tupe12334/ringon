import { useRef, useState } from 'react'
import { ringTo3mf } from '../ring/export3mf'
import { DesignIcon } from '../customizer/icons'
import { BUILTIN_TEMPLATES } from './builtin'
import { parseImport, shareUrl } from './share'
import { useStore } from './store'

function download(name: string, data: string | Uint8Array<ArrayBuffer>, type = 'application/json') {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([data], { type }))
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
  const [name, setName] = useState(spec.name)
  const [message, setMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const share = async () => {
    const url = shareUrl(spec)
    try {
      if (navigator.share) await navigator.share({ title: `Ringon: ${spec.name}`, url })
      else {
        await navigator.clipboard.writeText(url)
        setMessage('Link copied')
      }
    } catch {
      setMessage(url)
    }
  }

  return (
    <>
      <div className="field">
        <div className="field-label">
          <span>Save this design as a template</span>
        </div>
        <div className="row">
          <input type="text" aria-label="Template name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          <button
            type="button"
            className="primary"
            onClick={() => {
              save(name.trim() || 'My ring')
              setMessage('Saved')
            }}
          >
            Save
          </button>
        </div>
      </div>
      <div className="row wrap">
        <button type="button" onClick={share}>Share link</button>
        <button type="button" onClick={() => download(`${spec.name || 'ring'}.ringon.json`, JSON.stringify(spec, null, 2))}>Export design</button>
        <button type="button" onClick={() => download(`${spec.name || 'ring'}.3mf`, ringTo3mf(spec), 'model/3mf')}>Export 3MF</button>
        {templates.length > 0 && (
          <button type="button" onClick={() => download('ringon-templates.json', JSON.stringify(templates.map((t) => t.spec), null, 2))}>Export my templates</button>
        )}
        <button type="button" onClick={() => fileRef.current?.click()}>Import</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            if (file.size > 1_000_000) return setMessage('That file is too large to be a Ringon design')
            try {
              const specs = parseImport(await file.text())
              addTemplates(specs)
              setMessage(`Imported ${specs.length} design${specs.length === 1 ? '' : 's'}`)
            } catch {
              setMessage('That file is not a Ringon design')
            }
          }}
        />
      </div>
      {message && (
        <p className="note" role="status">
          {message}
        </p>
      )}

      <h3>My templates</h3>
      {templates.length === 0 ? (
        <p className="note">Nothing saved yet. Your templates stay on this device.</p>
      ) : (
        <ul className="templates">
          {templates.map((t) => (
            <li key={t.id}>
              <button type="button" className="template" onClick={() => setSpec(t.spec)}>
                <DesignIcon spec={t.spec} />
                {t.spec.name}
              </button>
              <button type="button" className="icon" aria-label={`Delete ${t.spec.name}`} onClick={() => remove(t.id)}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <h3>Start from a classic</h3>
      <ul className="templates">
        {BUILTIN_TEMPLATES.map((t) => (
          <li key={t.name}>
            <button
              type="button"
              className="template"
              onClick={() => {
                setSpec({ ...t, innerDiameterMm: spec.innerDiameterMm })
                setName(t.name)
              }}
            >
              <DesignIcon spec={t} />
              {t.name}
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
