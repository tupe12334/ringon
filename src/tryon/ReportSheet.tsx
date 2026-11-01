// The "Report a problem" sheet: what is wrong, an optional comment, what the file holds, and
// ways to send it (download, share sheet, a prefilled GitHub issue). See report.ts.

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CATEGORIES, finishReport, issueUrl, reportFileName, reportJson, type Category, type ReportDraft } from './report'

const CONTENTS = ['photo', 'tracking', 'settings', 'device'] as const

export function ReportSheet({ draft, onClose }: { draft: ReportDraft; onClose: () => void }) {
  const { t } = useTranslation()
  const [category, setCategory] = useState<Category | null>(null)
  const [comment, setComment] = useState('')
  const report = useMemo(() => category && finishReport(draft, category, comment), [draft, category, comment])
  const canShare = useMemo(() => !!navigator.canShare?.({ files: [new File(['{}'], 'r.json', { type: 'application/json' })] }), [])
  // Built on click: the file is ~1 MB of JSON, too much to redo on every keystroke.
  const file = () => report && new File([reportJson(report)], reportFileName(report), { type: 'application/json' })

  const download = () => {
    const f = file()
    if (!f) return
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(f), download: f.name })
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
  }
  const share = () => {
    const f = file()
    if (f) navigator.share({ files: [f], title: t('report.title') }).catch(() => {}) // closed or refused
  }

  return (
    <div className="capture-result report" role="dialog" aria-label={t('report.title')}>
      <h2>{t('report.title')}</h2>
      {draft.images.composite && <img src={draft.images.composite.dataUrl} alt={t('report.preview')} />}
      <div className="chips" role="radiogroup" aria-label={t('report.what')}>
        {CATEGORIES.map((c) => (
          <button key={c} type="button" role="radio" aria-checked={c === category} className={c === category ? 'chip on' : 'chip'} onClick={() => setCategory(c)}>
            {t(`report.categories.${c}`)}
          </button>
        ))}
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t('report.commentHint')} aria-label={t('report.comment')} rows={2} maxLength={2000} />
      <div className="report-contents">
        <p>{t('report.contains')}</p>
        <ul>
          {CONTENTS.map((c) => (
            <li key={c}>{t(`report.contents.${c}`)}</li>
          ))}
        </ul>
        <p>{t('report.private')}</p>
      </div>
      <div className="row wrap">
        <button type="button" className="primary" onClick={download} disabled={!report}>
          {t('report.download')}
        </button>
        {canShare && report && (
          <button type="button" onClick={share}>
            {t('report.share')}
          </button>
        )}
        <button type="button" onClick={onClose}>
          {t('tryon.close')}
        </button>
      </div>
      {report ? (
        <a href={issueUrl(report)} target="_blank" rel="noopener noreferrer">
          {t('report.issue')}
        </a>
      ) : (
        <p className="hint">{t('report.pick')}</p>
      )}
    </div>
  )
}
