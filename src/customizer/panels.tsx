// One panel per design area. Every field of RingSpec is editable from here.

import {
  ACCENT_INFO,
  FINISH_INFO,
  GEM_INFO,
  METAL_INFO,
  PRONG_TIP_INFO,
  PROFILE_INFO,
  SETTING_INFO,
  SHAPE_INFO,
  meleeCarat,
  stoneDimensions,
} from '../ring/catalog'
import { SIZE_SYSTEMS, nearestSize, sizeOptions } from '../ring/sizes'
import {
  ACCENTS,
  FINISHES,
  FONTS,
  GEMS,
  LIMITS,
  MELEE_CUTS,
  METALS,
  PRONG_TIPS,
  PROFILES,
  SETTINGS,
  SIDE_SETTINGS,
  STONE_SHAPES,
  type Gem,
} from '../ring/spec'
import { useStore } from '../templates/store'
import { Chips, ColorInput, Field, Select, Slider, Toggle } from './controls'

const label = <T extends string>(info: Record<T, { label: string } | string>) =>
  Object.fromEntries(
    Object.entries(info).map(([k, v]) => [k, typeof v === 'string' ? v : (v as { label: string }).label]),
  ) as Record<T, string>

const metalLabels = label(METAL_INFO)
const gemLabels = label(GEM_INFO)
const mm = (v: number) => `${v.toFixed(1)} mm`

export function SizePanel() {
  const spec = useStore((s) => s.spec)
  const system = useStore((s) => s.sizeSystem)
  const setSystem = useStore((s) => s.setSizeSystem)
  const update = useStore((s) => s.update)
  const options = sizeOptions(system)
  const current = nearestSize(system, spec.innerDiameterMm)
  const others = SIZE_SYSTEMS.filter((s) => s.id !== system)
    .map((s) => `${s.label} ${nearestSize(s.id, spec.innerDiameterMm).label}`)
    .join(' · ')
  return (
    <>
      <Chips
        label="Size system"
        value={system}
        options={SIZE_SYSTEMS.map((s) => s.id)}
        labels={Object.fromEntries(SIZE_SYSTEMS.map((s) => [s.id, s.label]))}
        onChange={setSystem}
      />
      <Field label="Ring size" hint={`${mm(spec.innerDiameterMm)} inside · ${(spec.innerDiameterMm * Math.PI).toFixed(1)} mm around`}>
        <select
          aria-label="Ring size"
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
      <p className="note">Same size in: {others}</p>
      <p className="note">
        Measure a ring that fits: inner diameter in mm, or wrap a strip of paper around your finger for the
        circumference (EU size = circumference in mm).
      </p>
    </>
  )
}

export function BandPanel() {
  const band = useStore((s) => s.spec.band)
  const update = useStore((s) => s.update)
  return (
    <>
      <Chips label="Profile" value={band.profile} options={PROFILES} labels={PROFILE_INFO} onChange={(v) => update((d) => void (d.band.profile = v))} />
      <Slider label="Width" value={band.widthMm} min={LIMITS.widthMm[0]} max={LIMITS.widthMm[1]} step={0.1} format={mm} onChange={(v) => update((d) => void (d.band.widthMm = v))} />
      <Slider label="Thickness" value={band.thicknessMm} min={LIMITS.thicknessMm[0]} max={LIMITS.thicknessMm[1]} step={0.1} format={mm} onChange={(v) => update((d) => void (d.band.thicknessMm = v))} />
      <Slider
        label="Shank taper"
        value={band.taper}
        min={LIMITS.taper[0]}
        max={LIMITS.taper[1]}
        step={0.05}
        format={(v) => (v >= 1 ? 'none' : `${Math.round((1 - v) * 100)}% narrower underneath`)}
        onChange={(v) => update((d) => void (d.band.taper = v))}
      />
      <Toggle label="Comfort fit (domed inside)" value={band.comfortFit} onChange={(v) => update((d) => void (d.band.comfortFit = v))} />
    </>
  )
}

export function MetalPanel() {
  const band = useStore((s) => s.spec.band)
  const update = useStore((s) => s.update)
  return (
    <>
      <Select label="Band metal" value={band.metal} options={METALS} labels={metalLabels} onChange={(v) => update((d) => void (d.band.metal = v))} />
      <Chips label="Finish" value={band.finish} options={FINISHES} labels={label(FINISH_INFO)} onChange={(v) => update((d) => void (d.band.finish = v))} />
      <Select
        label="Head metal (prongs, bezel, halo)"
        value={band.headMetal}
        options={['match', ...METALS] as const}
        labels={{ match: 'Same as band', ...metalLabels }}
        onChange={(v) => update((d) => void (d.band.headMetal = v))}
      />
      <p className="note">White metal prongs on a yellow band are a classic way to make a diamond look whiter.</p>
    </>
  )
}

function GemPicker({ value, color, onGem, onColor, title = 'Gem' }: { value: Gem; color: string; onGem: (g: Gem) => void; onColor: (c: string) => void; title?: string }) {
  return (
    <>
      <Select label={title} value={value} options={GEMS} labels={gemLabels} onChange={onGem} />
      {value === 'custom' && <ColorInput label={`${title} colour`} value={color} onChange={onColor} />}
    </>
  )
}

export function StonePanel() {
  const stone = useStore((s) => s.spec.stone)
  const update = useStore((s) => s.update)
  const dims = stoneDimensions(stone.shape, stone.carat, stone.gem)
  return (
    <>
      <Toggle label="Centre stone" value={stone.enabled} onChange={(v) => update((d) => void (d.stone.enabled = v))} />
      {stone.enabled && (
        <>
          <Chips label="Shape" value={stone.shape} options={STONE_SHAPES} labels={label(SHAPE_INFO)} onChange={(v) => update((d) => void (d.stone.shape = v))} />
          <Slider
            label="Carat"
            value={stone.carat}
            min={LIMITS.carat[0]}
            max={LIMITS.carat[1]}
            step={0.05}
            format={(v) => `${v.toFixed(2)} ct · ${dims.length.toFixed(1)}×${dims.width.toFixed(1)} mm`}
            onChange={(v) => update((d) => void (d.stone.carat = v))}
          />
          <GemPicker
            value={stone.gem}
            color={stone.customColor}
            onGem={(v) => update((d) => void (d.stone.gem = v))}
            onColor={(v) => update((d) => void (d.stone.customColor = v))}
          />
          <Slider
            label="Orientation"
            value={stone.rotationDeg}
            min={LIMITS.rotationDeg[0]}
            max={LIMITS.rotationDeg[1]}
            step={15}
            format={(v) => (v === 0 ? 'north–south' : v === 90 ? 'east–west' : `${v}°`)}
            onChange={(v) => update((d) => void (d.stone.rotationDeg = v))}
          />
        </>
      )}
    </>
  )
}

export function SettingPanel() {
  const stone = useStore((s) => s.spec.stone)
  const halo = useStore((s) => s.spec.halo)
  const update = useStore((s) => s.update)
  if (!stone.enabled) return <p className="note">Turn on a centre stone to choose its setting.</p>
  const prongs = stone.setting === 'prong-4' || stone.setting === 'prong-6'
  return (
    <>
      <Chips label="Setting" value={stone.setting} options={SETTINGS} labels={SETTING_INFO} onChange={(v) => update((d) => void (d.stone.setting = v))} />
      {prongs && <Chips label="Prong tips" value={stone.prongTip} options={PRONG_TIPS} labels={PRONG_TIP_INFO} onChange={(v) => update((d) => void (d.stone.prongTip = v))} />}
      {stone.setting !== 'tension' && (
        <Slider
          label="Setting height"
          value={stone.settingHeightMm}
          min={LIMITS.settingHeightMm[0]}
          max={LIMITS.settingHeightMm[1]}
          step={0.1}
          format={(v) => `${mm(v)} · ${v < 2.5 ? 'low' : v < 4 ? 'medium' : 'high'}`}
          onChange={(v) => update((d) => void (d.stone.settingHeightMm = v))}
        />
      )}
      <Toggle label="Halo" value={halo.enabled} onChange={(v) => update((d) => void (d.halo.enabled = v))} />
      {halo.enabled && (
        <>
          <Slider label="Halo stone size" value={halo.stoneMm} min={LIMITS.haloStoneMm[0]} max={LIMITS.haloStoneMm[1]} step={0.05} format={(v) => `${mm(v)} · ${meleeCarat(v).toFixed(3)} ct each`} onChange={(v) => update((d) => void (d.halo.stoneMm = v))} />
          <GemPicker title="Halo gem" value={halo.gem} color={halo.customColor} onGem={(v) => update((d) => void (d.halo.gem = v))} onColor={(v) => update((d) => void (d.halo.customColor = v))} />
        </>
      )}
    </>
  )
}

const SIDE_SETTING_LABELS = { 'prong-4': '4 prongs', 'prong-6': '6 prongs', bezel: 'Bezel' }
const MELEE_CUT_LABELS = { auto: 'Auto', round: 'Round', princess: 'Princess', baguette: 'Baguette' }

/** Common side-stone orientations: [label, rotation, mirror, for pointed shapes (pear/heart)?]. */
const SIDE_PRESETS: [string, number, boolean, boolean][] = [
  ['Along finger', 0, true, false],
  ['Across finger', 90, true, false],
  ['Point up the finger', 0, true, true],
  ['Point to centre', 90, true, true],
  ['Point outward', -90, true, true],
  ['Both point one way', -90, false, true],
]

export function AccentsPanel() {
  const accents = useStore((s) => s.spec.accents)
  const stone = useStore((s) => s.spec.stone)
  const bandWidth = useStore((s) => s.spec.band.widthMm)
  const update = useStore((s) => s.update)
  const styles = stone.enabled ? ACCENTS : ACCENTS.filter((a) => a !== 'three-stone')
  const side = accents.side
  const sideShape = side.shape === 'match' ? stone.shape : side.shape
  const sideCarat = stone.carat * accents.sideRatio ** 3
  const sd = stoneDimensions(sideShape, sideCarat, accents.gem)
  const pointed = sideShape === 'pear' || sideShape === 'heart'
  const bandStyle = accents.style !== 'none' && accents.style !== 'three-stone'
  const maxRows = Math.max(1, Math.min(LIMITS.rows[1], Math.floor(bandWidth / (Math.min(accents.stoneMm, bandWidth * 0.85) * 1.05))))
  return (
    <>
      <Chips label="Accent stones" value={accents.style} options={styles} labels={ACCENT_INFO} onChange={(v) => update((d) => void (d.accents.style = v))} />
      {accents.style === 'three-stone' && (
        <>
          <Select
            label="Side stone shape"
            value={side.shape}
            options={['match', ...STONE_SHAPES] as const}
            labels={{ match: `Same as centre (${label(SHAPE_INFO)[stone.shape]})`, ...label(SHAPE_INFO) }}
            onChange={(v) => update((d) => void (d.accents.side.shape = v))}
          />
          <Slider
            label="Side stone size"
            value={accents.sideRatio}
            min={LIMITS.sideRatio[0]}
            max={LIMITS.sideRatio[1]}
            step={0.05}
            format={(v) => `${Math.round(v * 100)}% of centre · ${sideCarat.toFixed(2)} ct · ${sd.length.toFixed(1)}×${sd.width.toFixed(1)} mm`}
            onChange={(v) => update((d) => void (d.accents.sideRatio = v))}
          />
          <Field label="Side stone orientation">
            <div className="chips" role="group" aria-label="Side stone orientation presets">
              {SIDE_PRESETS.filter((p) => p[3] === pointed).map(([name, rot, mirror]) => (
                <button
                  key={name}
                  type="button"
                  aria-pressed={side.rotationDeg === rot && side.mirror === mirror}
                  className={side.rotationDeg === rot && side.mirror === mirror ? 'chip on' : 'chip'}
                  onClick={() => update((d) => void Object.assign(d.accents.side, { rotationDeg: rot, mirror }))}
                >
                  {name}
                </button>
              ))}
            </div>
          </Field>
          <Slider
            label="Side stone rotation"
            value={side.rotationDeg}
            min={LIMITS.sideRotationDeg[0]}
            max={LIMITS.sideRotationDeg[1]}
            step={5}
            format={(v) => `${v}°`}
            onChange={(v) => update((d) => void (d.accents.side.rotationDeg = v))}
          />
          <Toggle label="Mirror left stone" value={side.mirror} onChange={(v) => update((d) => void (d.accents.side.mirror = v))} />
          <Chips label="Side stone setting" value={side.setting} options={SIDE_SETTINGS} labels={SIDE_SETTING_LABELS} onChange={(v) => update((d) => void (d.accents.side.setting = v))} />
          <Slider label="Gap to centre" value={side.gapMm} min={LIMITS.sideGapMm[0]} max={LIMITS.sideGapMm[1]} step={0.05} format={mm} onChange={(v) => update((d) => void (d.accents.side.gapMm = v))} />
          <Slider
            label="Side stone height"
            value={side.height}
            min={LIMITS.sideHeight[0]}
            max={LIMITS.sideHeight[1]}
            step={0.05}
            format={(v) => `${Math.round(v * 100)}% of centre`}
            onChange={(v) => update((d) => void (d.accents.side.height = v))}
          />
        </>
      )}
      {bandStyle && (
        <>
          <Slider label="Stone size" value={accents.stoneMm} min={LIMITS.accentStoneMm[0]} max={LIMITS.accentStoneMm[1]} step={0.05} format={(v) => `${mm(v)} · ${meleeCarat(v).toFixed(3)} ct each`} onChange={(v) => update((d) => void (d.accents.stoneMm = v))} />
          <Chips label="Cut" value={accents.meleeCut} options={MELEE_CUTS} labels={MELEE_CUT_LABELS} onChange={(v) => update((d) => void (d.accents.meleeCut = v))} />
          {(accents.style === 'pave' || accents.style === 'channel') && (
            <Slider
              label="Coverage"
              value={accents.coverageDeg}
              min={LIMITS.coverageDeg[0]}
              max={LIMITS.coverageDeg[1]}
              step={5}
              format={(v) => `${Math.round((v / 180) * 100)}% down each side`}
              onChange={(v) => update((d) => void (d.accents.coverageDeg = v))}
            />
          )}
          {accents.style !== 'channel' && (
            <Slider
              label="Rows"
              value={accents.rows}
              min={LIMITS.rows[0]}
              max={LIMITS.rows[1]}
              step={1}
              format={(v) => (v === 0 ? 'auto' : v > maxRows ? `${v} · only ${maxRows} fit this band` : `${v}`)}
              onChange={(v) => update((d) => void (d.accents.rows = v))}
            />
          )}
        </>
      )}
      {accents.style !== 'none' && (
        <GemPicker title="Accent gem" value={accents.gem} color={accents.customColor} onGem={(v) => update((d) => void (d.accents.gem = v))} onColor={(v) => update((d) => void (d.accents.customColor = v))} />
      )}
    </>
  )
}

export function EngravePanel() {
  const engraving = useStore((s) => s.spec.engraving)
  const update = useStore((s) => s.update)
  return (
    <>
      <Field label="Inside engraving" hint={`${engraving.text.length}/${LIMITS.engravingLength[1]}`}>
        <input
          type="text"
          aria-label="Inside engraving"
          maxLength={LIMITS.engravingLength[1]}
          placeholder="e.g. Forever · 10.05.2026"
          value={engraving.text}
          onChange={(e) => update((d) => void (d.engraving.text = e.target.value))}
        />
      </Field>
      <Chips label="Font" value={engraving.font} options={FONTS} labels={{ serif: 'Serif', sans: 'Sans', script: 'Script' }} onChange={(v) => update((d) => void (d.engraving.font = v))} />
    </>
  )
}
