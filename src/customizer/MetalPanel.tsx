// Band, inlay and liner materials, finish and head metal.

import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { BAND_MATERIALS, FINISHES, INLAY_MATERIALS, LIMITS, METALS, type InlayMaterial } from '../ring/spec'
import { useStore } from '../templates/store'
import { Chips, Slider } from './controls'
import { accentIcons, fieldIcons as fi, finishIcons, matchIcon, metalIcons } from './icons'
import { labels, useMm } from './panels'

/** Width and position of an inlay strip, both as shares of the band width. */
function StripSliders({ width, offset, onWidth, onOffset }: { width: number; offset: number; onWidth: (v: number) => void; onOffset: (v: number) => void }) {
  const bandWidth = useStore((s) => s.spec.band.widthMm)
  const { t } = useTranslation()
  const mm = useMm()
  return (
    <>
      <Slider label={t('metalPanel.inlayWidth')} value={width} min={LIMITS.inlayWidth[0]} max={LIMITS.inlayWidth[1]} step={0.05} format={(v) => mm(v * bandWidth)} onChange={onWidth} />
      <Slider
        label={t('metalPanel.inlayOffset')}
        value={offset}
        min={LIMITS.inlayOffset[0]}
        max={LIMITS.inlayOffset[1]}
        step={0.05}
        format={(v) => (Math.abs(v) < 0.01 ? t('metalPanel.centred') : t('metalPanel.offset', { mm: mm(Math.abs(v) * bandWidth) }))}
        onChange={onOffset}
      />
    </>
  )
}

export function MetalPanel() {
  const band = useStore((s) => s.spec.band)
  const update = useStore((s) => s.update)
  const { t } = useTranslation()
  const metalLabels = labels(t, 'metal')
  const optional = <T extends InlayMaterial>(label: string, value: 'none' | T, options: readonly T[], onChange: (v: 'none' | T) => void) => (
    <Chips
      label={label}
      value={value}
      options={['none', ...options] as const}
      labels={{ none: t('metalPanel.none'), ...metalLabels } as Record<'none' | T, string>}
      icons={{ none: accentIcons.none, ...metalIcons } as Record<'none' | T, ReactNode>}
      onChange={onChange}
    />
  )
  const nonMetal = [band.metal, band.inlay, band.inlay2, band.liner].some((m) => m !== 'none' && !(METALS as readonly string[]).includes(m))
  return (
    <>
      <Chips label={t('metalPanel.band')} value={band.metal} options={BAND_MATERIALS} labels={metalLabels} icons={metalIcons} onChange={(v) => update((d) => void (d.band.metal = v))} />
      {optional(t('metalPanel.inlay'), band.inlay, INLAY_MATERIALS, (v) => update((d) => void (d.band.inlay = v)))}
      {band.inlay !== 'none' && (
        <>
          <StripSliders
            width={band.inlayWidth}
            offset={band.inlayOffset}
            onWidth={(v) => update((d) => void (d.band.inlayWidth = v))}
            onOffset={(v) => update((d) => void (d.band.inlayOffset = v))}
          />
          {optional(t('metalPanel.inlay2'), band.inlay2, INLAY_MATERIALS, (v) => update((d) => void (d.band.inlay2 = v)))}
          {band.inlay2 !== 'none' && (
            <StripSliders
              width={band.inlay2Width}
              offset={band.inlay2Offset}
              onWidth={(v) => update((d) => void (d.band.inlay2Width = v))}
              onOffset={(v) => update((d) => void (d.band.inlay2Offset = v))}
            />
          )}
        </>
      )}
      {optional(t('metalPanel.liner'), band.liner, BAND_MATERIALS, (v) => update((d) => void (d.band.liner = v)))}
      <Chips label={t('metalPanel.finish')} value={band.finish} options={FINISHES} labels={labels(t, 'finish')} icons={finishIcons} onChange={(v) => update((d) => void (d.band.finish = v))} />
      <Chips
        label={t('metalPanel.head')}
        icon={fi.headMetal}
        icons={{ match: matchIcon, ...metalIcons }}
        value={band.headMetal}
        options={['match', ...METALS] as const}
        labels={{ match: t('metalPanel.sameAsBand'), ...metalLabels }}
        onChange={(v) => update((d) => void (d.band.headMetal = v))}
      />
      <p className="note">{t('metalPanel.note')}</p>
      {nonMetal && <p className="note">{t('metalPanel.woodNote')}</p>}
    </>
  )
}
