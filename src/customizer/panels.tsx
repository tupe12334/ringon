// One panel per design area. Every field of RingSpec is editable from here.

import { useTranslation } from 'react-i18next'
import type { Translation } from '../i18n/en'
import { meleeCarat, stoneDimensions } from '../ring/catalog'
import { SIZE_SYSTEMS, nearestSize, sizeOptions } from '../ring/sizes'
import {
  ACCENTS,
  FINISHES,
  FONTS,
  GEMS,
  LIMITS,
  BEZEL_EDGES,
  DIRECTIONAL_SHAPES,
  HALF_BEZEL_WALLS,
  HALO_STYLES,
  SIDE_LAYOUTS,
  METALS,
  PRONG_TIPS,
  PROFILES,
  SETTINGS,
  SIDE_SETTINGS,
  STONE_SHAPES,
  type Gem,
  type StoneShape,
} from '../ring/spec'
import { useStore } from '../templates/store'
import { Chips, ColorInput, Field, Slider, Toggle } from './controls'
import {
  ShapeIcon,
  SidePresetIcon,
  TaperIcon,
  accentIcons,
  autoIcon,
  bezelEdgeIcons,
  fieldIcons as fi,
  finishIcons,
  fontIcons,
  gemIcons,
  haloRowIcons,
  haloStyleIcons,
  halfWallIcons,
  matchIcon,
  metalIcons,
  profileIcons,
  prongTipIcons,
  settingIcons,
  shapeIcons,
  sideCountIcons,
  sideLayoutIcons,
} from './icons'

/** Labels for every option of a group, e.g. labels('metal').platinum. */
const labels = <K extends 'metal' | 'finish' | 'profile' | 'gem' | 'shape' | 'setting' | 'prongTip' | 'accent' | 'sizeSystem' | 'font'>(
  t: ReturnType<typeof useTranslation>['t'],
  group: K,
) => t(group as 'metal', { returnObjects: true }) as unknown as Translation[K]

/** "2.0 mm", in the current language. */
function useMm() {
  const { t } = useTranslation()
  return (v: number) => t('mm', { v: v.toFixed(1) })
}

export function SizePanel() {
  const spec = useStore((s) => s.spec)
  const system = useStore((s) => s.sizeSystem)
  const setSystem = useStore((s) => s.setSizeSystem)
  const update = useStore((s) => s.update)
  const { t } = useTranslation()
  const mm = useMm()
  const systemLabels = labels(t, 'sizeSystem')
  const options = sizeOptions(system)
  const current = nearestSize(system, spec.innerDiameterMm)
  const others = SIZE_SYSTEMS.filter((s) => s !== system)
    .map((s) => `${systemLabels[s]} ${nearestSize(s, spec.innerDiameterMm).label}`)
    .join(' · ')
  return (
    <>
      <Chips label={t('size.system')} icon={fi.system} value={system} options={SIZE_SYSTEMS} labels={systemLabels} onChange={setSystem} />
      <Field label={t('size.ring')} icon={fi.size} hint={t('size.hint', { inside: mm(spec.innerDiameterMm), around: (spec.innerDiameterMm * Math.PI).toFixed(1) })}>
        <select
          aria-label={t('size.ring')}
          value={current.label}
          onChange={(e) => {
            const o = options.find((x) => x.label === e.target.value)
            if (o) update((d) => void (d.innerDiameterMm = o.diameterMm))
          }}
        >
          {options.map((o) => (
            <option key={o.label} value={o.label}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>
      <p className="note">{t('size.same', { others })}</p>
      <p className="note">{t('size.measure')}</p>
    </>
  )
}

export function BandPanel() {
  const band = useStore((s) => s.spec.band)
  const update = useStore((s) => s.update)
  const { t } = useTranslation()
  const mm = useMm()
  return (
    <>
      <Chips label={t('band.profile')} value={band.profile} options={PROFILES} labels={labels(t, 'profile')} icons={profileIcons} onChange={(v) => update((d) => void (d.band.profile = v))} />
      <Slider label={t('band.width')} icon={fi.width} value={band.widthMm} min={LIMITS.widthMm[0]} max={LIMITS.widthMm[1]} step={0.1} format={mm} onChange={(v) => update((d) => void (d.band.widthMm = v))} />
      <Slider label={t('band.thickness')} icon={fi.thickness} value={band.thicknessMm} min={LIMITS.thicknessMm[0]} max={LIMITS.thicknessMm[1]} step={0.1} format={mm} onChange={(v) => update((d) => void (d.band.thicknessMm = v))} />
      <Slider
        label={t('band.taper')}
        icon={<TaperIcon taper={band.taper} />}
        value={band.taper}
        min={LIMITS.taper[0]}
        max={LIMITS.taper[1]}
        step={0.05}
        format={(v) => (v >= 1 ? t('band.taperNone') : t('band.taperValue', { pct: Math.round((1 - v) * 100) }))}
        onChange={(v) => update((d) => void (d.band.taper = v))}
      />
      <Toggle label={t('band.comfortFit')} icon={fi.comfort} value={band.comfortFit} onChange={(v) => update((d) => void (d.band.comfortFit = v))} />
    </>
  )
}

export function MetalPanel() {
  const band = useStore((s) => s.spec.band)
  const update = useStore((s) => s.update)
  const { t } = useTranslation()
  const metalLabels = labels(t, 'metal')
  return (
    <>
      <Chips label={t('metalPanel.band')} value={band.metal} options={METALS} labels={metalLabels} icons={metalIcons} onChange={(v) => update((d) => void (d.band.metal = v))} />
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
    </>
  )
}

function GemPicker({ value, color, onGem, onColor, title }: { value: Gem; color: string; onGem: (g: Gem) => void; onColor: (c: string) => void; title?: string }) {
  const { t } = useTranslation()
  const label = title ?? t('gemPicker.title')
  return (
    <>
      <Chips label={label} value={value} options={GEMS} labels={labels(t, 'gem')} icons={gemIcons(color)} onChange={onGem} />
      {value === 'custom' && <ColorInput label={t('gemPicker.colour', { title: label })} value={color} onChange={onColor} />}
    </>
  )
}

export function StonePanel() {
  const stone = useStore((s) => s.spec.stone)
  const update = useStore((s) => s.update)
  const dims = stoneDimensions(stone.shape, stone.carat, stone.gem)
  const { t } = useTranslation()
  return (
    <>
      <Toggle label={t('stone.centre')} icon={fi.stone} value={stone.enabled} onChange={(v) => update((d) => void (d.stone.enabled = v))} />
      {stone.enabled && (
        <>
          <Chips label={t('stone.shape')} value={stone.shape} options={STONE_SHAPES} labels={labels(t, 'shape')} icons={shapeIcons} onChange={(v) => update((d) => void (d.stone.shape = v))} />
          <Slider
            label={t('stone.carat')}
            icon={<ShapeIcon shape={stone.shape} size={8 + 14 * Math.cbrt(stone.carat / LIMITS.carat[1])} rotate={stone.rotationDeg} />}
            value={stone.carat}
            min={LIMITS.carat[0]}
            max={LIMITS.carat[1]}
            step={0.05}
            format={(v) => t('stone.caratValue', { carat: v.toFixed(2), length: dims.length.toFixed(1), width: dims.width.toFixed(1) })}
            onChange={(v) => update((d) => void (d.stone.carat = v))}
          />
          <GemPicker
            value={stone.gem}
            color={stone.customColor}
            onGem={(v) => update((d) => void (d.stone.gem = v))}
            onColor={(v) => update((d) => void (d.stone.customColor = v))}
          />
          <Slider
            label={t('stone.orientation')}
            icon={<ShapeIcon shape={stone.shape} rotate={stone.rotationDeg} />}
            value={stone.rotationDeg}
            min={LIMITS.rotationDeg[0]}
            max={LIMITS.rotationDeg[1]}
            step={15}
            format={(v) => (v === 0 ? t('stone.northSouth') : v === 90 ? t('stone.eastWest') : `${v}°`)}
            onChange={(v) => update((d) => void (d.stone.rotationDeg = v))}
          />
        </>
      )}
    </>
  )
}

export function BezelControls() {
  const bz = useStore((s) => s.spec.stone.bezel)
  const half = useStore((s) => s.spec.stone.setting === 'half-bezel')
  const update = useStore((s) => s.update)
  const set = (patch: Partial<typeof bz>) => update((d) => void Object.assign(d.stone.bezel, patch))
  const { t } = useTranslation()
  const mm = useMm()
  return (
    <>
      {half && <Chips label={t('bezel.halfWalls')} value={bz.halfWalls} options={HALF_BEZEL_WALLS} icons={halfWallIcons} labels={{ sides: t('bezel.halfWallsSides'), ends: t('bezel.halfWallsEnds') }} onChange={(v) => set({ halfWalls: v })} />}
      <Slider
        label={t('bezel.wall')}
        icon={fi.wall}
        value={bz.wallMm}
        min={LIMITS.bezelWallMm[0]}
        max={LIMITS.bezelWallMm[1]}
        step={0.05}
        format={(v) => `${mm(v)} · ${t(v < 0.5 ? 'bezel.fine' : v < 0.9 ? 'bezel.classic' : 'bezel.chunky')}`}
        onChange={(v) => set({ wallMm: v })}
      />
      <Slider
        label={t('bezel.lip')}
        icon={fi.lip}
        value={bz.lip}
        min={LIMITS.bezelLip[0]}
        max={LIMITS.bezelLip[1]}
        step={0.05}
        format={(v) => (v === 0 ? t('bezel.lipFlush') : t('bezel.lipValue', { pct: Math.round(v * 100) }))}
        onChange={(v) => set({ lip: v })}
      />
      <Chips label={t('bezel.edge')} value={bz.edge} options={BEZEL_EDGES} icons={bezelEdgeIcons} labels={{ plain: t('bezel.plain'), rounded: t('bezel.rounded'), milgrain: t('bezel.milgrain') }} onChange={(v) => set({ edge: v })} />
    </>
  )
}

export function SettingPanel() {
  const stone = useStore((s) => s.spec.stone)
  const halo = useStore((s) => s.spec.halo)
  const sideBezel = useStore((s) => (s.spec.accents.side.count > 0 || s.spec.accents.side.layout === 'toi-et-moi') && s.spec.accents.side.setting === 'bezel')
  const bandBezel = useStore((s) => s.spec.accents.style !== 'none' && s.spec.accents.bezelSet)
  const update = useStore((s) => s.update)
  const { t } = useTranslation()
  const mm = useMm()
  if (!stone.enabled) return <p className="note">{t('settingPanel.needStone')}</p>
  const prongs = stone.setting === 'prong-4' || stone.setting === 'prong-6'
  const bezel = stone.setting === 'bezel' || stone.setting === 'half-bezel'
  return (
    <>
      <Chips label={t('settingPanel.setting')} value={stone.setting} options={SETTINGS} labels={labels(t, 'setting')} icons={settingIcons} onChange={(v) => update((d) => void (d.stone.setting = v))} />
      {prongs && <Chips label={t('settingPanel.prongTips')} value={stone.prongTip} options={PRONG_TIPS} labels={labels(t, 'prongTip')} icons={prongTipIcons} onChange={(v) => update((d) => void (d.stone.prongTip = v))} />}
      {(bezel || sideBezel || bandBezel) && <BezelControls />}
      {stone.setting !== 'tension' && (
        <Slider
          label={t('settingPanel.height')}
          icon={fi.height}
          value={stone.settingHeightMm}
          min={LIMITS.settingHeightMm[0]}
          max={LIMITS.settingHeightMm[1]}
          step={0.1}
          format={(v) => `${mm(v)} · ${t(v < 2.5 ? 'settingPanel.low' : v < 4 ? 'settingPanel.medium' : 'settingPanel.high')}`}
          onChange={(v) => update((d) => void (d.stone.settingHeightMm = v))}
        />
      )}
      <Toggle label={t('settingPanel.halo')} icon={fi.halo} value={halo.enabled} onChange={(v) => update((d) => void (d.halo.enabled = v))} />
      {halo.enabled && (
        <>
          <Chips label={t('settingPanel.haloStyle')} value={halo.style} options={HALO_STYLES} icons={haloStyleIcons} labels={{ classic: t('settingPanel.haloClassic'), hidden: t('settingPanel.haloHidden') }} onChange={(v) => update((d) => void (d.halo.style = v))} />
          {halo.style === 'classic' && (
            <Chips label={t('settingPanel.haloRows')} value={String(halo.rows)} options={['1', '2'] as const} icons={haloRowIcons} labels={{ '1': t('settingPanel.single'), '2': t('settingPanel.double') }} onChange={(v) => update((d) => void (d.halo.rows = Number(v)))} />
          )}
          <Slider label={t('settingPanel.haloStoneSize')} icon={fi.melee} value={halo.stoneMm} min={LIMITS.haloStoneMm[0]} max={LIMITS.haloStoneMm[1]} step={0.05} format={(v) => t('settingPanel.haloStoneValue', { size: mm(v), carat: meleeCarat(v).toFixed(3) })} onChange={(v) => update((d) => void (d.halo.stoneMm = v))} />
          <GemPicker title={t('settingPanel.haloGem')} value={halo.gem} color={halo.customColor} onGem={(v) => update((d) => void (d.halo.gem = v))} onColor={(v) => update((d) => void (d.halo.customColor = v))} />
        </>
      )}
    </>
  )
}

/** One-tap side-stone orientations: [label, rotation, mirror]. "Front" = a pear's point, a
 * tapered baguette's wide end, a half-moon's or trillion's flat edge (see DIRECTIONAL_SHAPES). */
const presetsFor = (shape: StoneShape, t: ReturnType<typeof useTranslation>['t']): [string, number, boolean][] => {
  if (!DIRECTIONAL_SHAPES.includes(shape))
    return [
      [t('sides.alongFinger'), 0, true],
      [t('sides.acrossFinger'), 90, true],
    ]
  const [front, fronts] =
    shape === 'pear' || shape === 'heart'
      ? [t('sides.point'), t('sides.points')]
      : shape === 'tapered-baguette'
        ? [t('sides.wideEnd'), t('sides.wideEnds')]
        : [t('sides.flatEdge'), t('sides.flatEdges')]
  return [
    [t('sides.toCentre', { front }), 90, true],
    [t('sides.outward', { front }), -90, true],
    [t('sides.upFinger', { front }), 0, true],
    [t('sides.bothOneWay', { fronts }), -90, false],
  ]
}

export function SidesPanel() {
  const side = useStore((s) => s.spec.accents.side)
  const stone = useStore((s) => s.spec.stone)
  const update = useStore((s) => s.update)
  const { t } = useTranslation()
  const mm = useMm()
  const shapeLabels = labels(t, 'shape')
  if (!stone.enabled) return <p className="note">{t('sides.needStone')}</p>
  const set = (patch: Partial<typeof side>) => update((d) => void Object.assign(d.accents.side, patch))
  const shape = side.shape === 'match' ? stone.shape : side.shape
  const toi = side.layout === 'toi-et-moi'
  const on = toi || side.count > 0
  const sizes = Array.from({ length: toi ? 1 : side.count }, (_, k) => {
    const carat = stone.carat * (side.ratio * side.graduation ** k) ** 3
    const d = stoneDimensions(shape, carat, side.gem)
    return t('sides.stone', { carat: carat.toFixed(2), length: d.length.toFixed(1), width: d.width.toFixed(1) })
  })
  return (
    <>
      <Chips label={t('sides.layout')} value={side.layout} options={SIDE_LAYOUTS} icons={sideLayoutIcons} labels={{ both: t('sides.both'), 'toi-et-moi': t('sides.toiEtMoi') }} onChange={(v) => set({ layout: v, count: v === 'both' && !side.count ? 1 : side.count })} />
      {!toi && (
        <Chips
          label={t('sides.count')}
          value={String(side.count)}
          options={['0', '1', '2', '3'] as const}
          labels={{ '0': t('sides.none'), '1': t('sides.three'), '2': t('sides.five'), '3': t('sides.seven') }}
          icons={Object.fromEntries(sideCountIcons.map((c, i) => [String(i), c]))}
          onChange={(v) => set({ count: Number(v) })}
        />
      )}
      {on && (
        <>
          <Chips
            label={t('sides.shape')}
            icons={{ match: <ShapeIcon shape={stone.shape} fill="currentColor" />, ...shapeIcons }}
            value={side.shape}
            options={['match', ...STONE_SHAPES] as const}
            labels={{ match: t('sides.sameAsCentre', { shape: shapeLabels[stone.shape] }), ...shapeLabels }}
            onChange={(v) => set({ shape: v })}
          />
          <GemPicker title={t('sides.gem')} value={side.gem} color={side.customColor} onGem={(v) => set({ gem: v })} onColor={(v) => set({ customColor: v })} />
          <Slider
            label={toi ? t('sides.partnerSize') : t('sides.size')}
            icon={fi.ratio}
            value={side.ratio}
            min={LIMITS.sideRatio[0]}
            max={LIMITS.sideRatio[1]}
            step={0.05}
            format={(v) => t('sides.sizeValue', { pct: Math.round(v * 100), size: sizes[0] })}
            onChange={(v) => set({ ratio: v })}
          />
          {!toi && side.count > 1 && (
            <Slider
              label={t('sides.graduation')}
              icon={fi.graduation}
              value={side.graduation}
              min={LIMITS.graduation[0]}
              max={LIMITS.graduation[1]}
              step={0.05}
              format={(v) => (v >= 1 ? t('sides.allSame') : t('sides.graduationValue', { pct: Math.round(v * 100), sizes: sizes.slice(1).join(', ') }))}
              onChange={(v) => set({ graduation: v })}
            />
          )}
          <Field label={t('sides.orientation')} icon={fi.orientation}>
            <div className="chips tiles" role="group" aria-label={t('sides.presetsAria')}>
              {/* A toi et moi has one partner stone, so "both one way" means nothing there. */}
              {presetsFor(shape, t).filter(([, , mirror]) => !toi || mirror).map(([name, rot, mirror]) => {
                const active = side.rotationDeg === rot && (toi || side.mirror === mirror)
                return (
                  <button key={name} type="button" aria-pressed={active} className={active ? 'chip on' : 'chip'} onClick={() => set({ rotationDeg: rot, mirror })}>
                    <SidePresetIcon shape={shape} rotate={rot} mirror={mirror} pair={toi} />
                    <span>{name}</span>
                  </button>
                )
              })}
            </div>
          </Field>
          <Slider label={t('sides.rotation')} icon={<ShapeIcon shape={shape} rotate={side.rotationDeg} />} value={side.rotationDeg} min={LIMITS.sideRotationDeg[0]} max={LIMITS.sideRotationDeg[1]} step={5} format={(v) => `${v}°`} onChange={(v) => set({ rotationDeg: v })} />
          {!toi && <Toggle label={t('sides.mirror')} icon={fi.mirror} value={side.mirror} onChange={(v) => set({ mirror: v })} />}
          <Chips label={t('sides.setting')} value={side.setting} options={SIDE_SETTINGS} labels={labels(t, 'setting')} icons={settingIcons} onChange={(v) => set({ setting: v })} />
          <Slider label={t('sides.gap')} icon={fi.gap} value={side.gapMm} min={LIMITS.sideGapMm[0]} max={LIMITS.sideGapMm[1]} step={0.05} format={mm} onChange={(v) => set({ gapMm: v })} />
          <Slider
            label={toi ? t('sides.offsetDiagonal') : t('sides.offsetAlong')}
            icon={fi.offset}
            value={side.offsetMm}
            min={LIMITS.sideOffsetMm[0]}
            max={LIMITS.sideOffsetMm[1]}
            step={0.1}
            format={(v) => (v === 0 ? t('sides.inLine') : mm(v))}
            onChange={(v) => set({ offsetMm: v })}
          />
          <Slider label={t('sides.height')} icon={fi.height} value={side.height} min={LIMITS.sideHeight[0]} max={LIMITS.sideHeight[1]} step={0.05} format={(v) => t('sides.heightValue', { pct: Math.round(v * 100) })} onChange={(v) => set({ height: v })} />
        </>
      )}
    </>
  )
}

export function AccentsPanel() {
  const accents = useStore((s) => s.spec.accents)
  const bandWidth = useStore((s) => s.spec.band.widthMm)
  const update = useStore((s) => s.update)
  const maxRows = Math.max(1, Math.min(LIMITS.rows[1], Math.floor(bandWidth / (Math.min(accents.stoneMm, bandWidth * 0.85) * 1.05))))
  const { t } = useTranslation()
  const mm = useMm()
  return (
    <>
      <Chips label={t('accents.style')} value={accents.style} options={ACCENTS} labels={labels(t, 'accent')} icons={accentIcons} onChange={(v) => update((d) => void (d.accents.style = v))} />
      {accents.style !== 'none' && (
        <>
          <Slider label={t('accents.stoneSize')} icon={fi.melee} value={accents.stoneMm} min={LIMITS.accentStoneMm[0]} max={LIMITS.accentStoneMm[1]} step={0.05} format={(v) => t('accents.stoneSizeValue', { size: mm(v) })} onChange={(v) => update((d) => void (d.accents.stoneMm = v))} />
          <Chips label={t('accents.cut')} value={accents.meleeCut} options={['auto', ...STONE_SHAPES] as const} icons={{ auto: autoIcon, ...shapeIcons }} labels={{ auto: t('accents.cutAuto'), ...labels(t, 'shape') }} onChange={(v) => update((d) => void (d.accents.meleeCut = v))} />
          <Toggle label={t('accents.bezelSet')} icon={fi.wall} value={accents.bezelSet} onChange={(v) => update((d) => void (d.accents.bezelSet = v))} />
          {accents.bezelSet && <BezelControls />}
          <Slider
            label={t('accents.spacing')}
            icon={fi.spacing}
            value={accents.spacingMm}
            min={LIMITS.spacingMm[0]}
            max={LIMITS.spacingMm[1]}
            step={0.1}
            format={(v) => (v === 0 ? t('accents.touching') : t(v >= 3 ? 'accents.stations' : 'accents.spacingValue', { size: mm(v) }))}
            onChange={(v) => update((d) => void (d.accents.spacingMm = v))}
          />
          {(accents.style === 'pave' || accents.style === 'channel') && (
            <Slider
              label={t('accents.coverage')}
              icon={fi.coverage}
              value={accents.coverageDeg}
              min={LIMITS.coverageDeg[0]}
              max={LIMITS.coverageDeg[1]}
              step={5}
              format={(v) => t('accents.coverageValue', { pct: Math.round((v / 180) * 100) })}
              onChange={(v) => update((d) => void (d.accents.coverageDeg = v))}
            />
          )}
          {accents.style !== 'channel' && (
            <Slider
              label={t('accents.rows')}
              icon={fi.rows}
              value={accents.rows}
              min={LIMITS.rows[0]}
              max={LIMITS.rows[1]}
              step={1}
              format={(v) => (v === 0 ? t('accents.auto') : v > maxRows ? t('accents.tooManyRows', { rows: v, max: maxRows }) : `${v}`)}
              onChange={(v) => update((d) => void (d.accents.rows = v))}
            />
          )}
          <GemPicker title={t('accents.gem')} value={accents.gem} color={accents.customColor} onGem={(v) => update((d) => void (d.accents.gem = v))} onColor={(v) => update((d) => void (d.accents.customColor = v))} />
        </>
      )}
    </>
  )
}

export function EngravePanel() {
  const engraving = useStore((s) => s.spec.engraving)
  const update = useStore((s) => s.update)
  const { t } = useTranslation()
  return (
    <>
      <Field label={t('engrave.inside')} icon={fi.engrave} hint={`${engraving.text.length}/${LIMITS.engravingLength[1]}`}>
        <input
          type="text"
          aria-label={t('engrave.inside')}
          maxLength={LIMITS.engravingLength[1]}
          placeholder={t('engrave.placeholder')}
          value={engraving.text}
          onChange={(e) => update((d) => void (d.engraving.text = e.target.value))}
        />
      </Field>
      <Chips label={t('engrave.font')} value={engraving.font} options={FONTS} labels={labels(t, 'font')} icons={fontIcons} onChange={(v) => update((d) => void (d.engraving.font = v))} />
    </>
  )
}
