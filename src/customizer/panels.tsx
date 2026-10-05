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

export function BezelControls() {
  const bz = useStore((s) => s.spec.stone.bezel)
  const half = useStore((s) => s.spec.stone.setting === 'half-bezel')
  const update = useStore((s) => s.update)
  const set = (patch: Partial<typeof bz>) => update((d) => void Object.assign(d.stone.bezel, patch))
  return (
    <>
      {half && <Chips label="Half-bezel walls" value={bz.halfWalls} options={HALF_BEZEL_WALLS} labels={{ sides: 'On the sides (open ends)', ends: 'On the ends (open sides)' }} onChange={(v) => set({ halfWalls: v })} />}
      <Slider
        label="Bezel wall"
        value={bz.wallMm}
        min={LIMITS.bezelWallMm[0]}
        max={LIMITS.bezelWallMm[1]}
        step={0.05}
        format={(v) => `${mm(v)} · ${v < 0.5 ? 'fine' : v < 0.9 ? 'classic' : 'chunky'}`}
        onChange={(v) => set({ wallMm: v })}
      />
      <Slider
        label="Bezel lip"
        value={bz.lip}
        min={LIMITS.bezelLip[0]}
        max={LIMITS.bezelLip[1]}
        step={0.05}
        format={(v) => (v === 0 ? 'flush with the girdle' : `${Math.round(v * 100)}% up the crown`)}
        onChange={(v) => set({ lip: v })}
      />
      <Chips label="Bezel edge" value={bz.edge} options={BEZEL_EDGES} labels={{ plain: 'Plain', rounded: 'Rounded', milgrain: 'Milgrain' }} onChange={(v) => set({ edge: v })} />
    </>
  )
}

export function SettingPanel() {
  const stone = useStore((s) => s.spec.stone)
  const halo = useStore((s) => s.spec.halo)
  const sideBezel = useStore((s) => (s.spec.accents.side.count > 0 || s.spec.accents.side.layout === 'toi-et-moi') && s.spec.accents.side.setting === 'bezel')
  const bandBezel = useStore((s) => s.spec.accents.style !== 'none' && s.spec.accents.bezelSet)
  const update = useStore((s) => s.update)
  if (!stone.enabled) return <p className="note">Turn on a centre stone to choose its setting.</p>
  const prongs = stone.setting === 'prong-4' || stone.setting === 'prong-6'
  const bezel = stone.setting === 'bezel' || stone.setting === 'half-bezel'
  return (
    <>
      <Chips label="Setting" value={stone.setting} options={SETTINGS} labels={SETTING_INFO} onChange={(v) => update((d) => void (d.stone.setting = v))} />
      {prongs && <Chips label="Prong tips" value={stone.prongTip} options={PRONG_TIPS} labels={PRONG_TIP_INFO} onChange={(v) => update((d) => void (d.stone.prongTip = v))} />}
      {(bezel || sideBezel || bandBezel) && <BezelControls />}
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
          <Chips label="Halo style" value={halo.style} options={HALO_STYLES} labels={{ classic: 'Classic (around the stone)', hidden: 'Hidden (under the stone)' }} onChange={(v) => update((d) => void (d.halo.style = v))} />
          {halo.style === 'classic' && (
            <Chips label="Halo rows" value={String(halo.rows)} options={['1', '2'] as const} labels={{ '1': 'Single', '2': 'Double' }} onChange={(v) => update((d) => void (d.halo.rows = Number(v)))} />
          )}
          <Slider label="Halo stone size" value={halo.stoneMm} min={LIMITS.haloStoneMm[0]} max={LIMITS.haloStoneMm[1]} step={0.05} format={(v) => `${mm(v)} · ${meleeCarat(v).toFixed(3)} ct each`} onChange={(v) => update((d) => void (d.halo.stoneMm = v))} />
          <GemPicker title="Halo gem" value={halo.gem} color={halo.customColor} onGem={(v) => update((d) => void (d.halo.gem = v))} onColor={(v) => update((d) => void (d.halo.customColor = v))} />
        </>
      )}
    </>
  )
}

const SIDE_SETTING_LABELS = { 'prong-4': '4 prongs', 'prong-6': '6 prongs', bezel: 'Bezel' }
const SIDE_COUNT_LABELS = ['None', 'Three stone', 'Five stone', 'Seven stone']
const shapeLabels = label(SHAPE_INFO)

/** One-tap side-stone orientations: [label, rotation, mirror]. "Front" = a pear's point, a
 * tapered baguette's wide end, a half-moon's or trillion's flat edge (see DIRECTIONAL_SHAPES). */
const presetsFor = (shape: StoneShape): [string, number, boolean][] => {
  if (!DIRECTIONAL_SHAPES.includes(shape))
    return [
      ['Along finger', 0, true],
      ['Across finger', 90, true],
    ]
  const front = shape === 'pear' || shape === 'heart' ? ['Point', 'point'] : shape === 'tapered-baguette' ? ['Wide end', 'wide ends'] : ['Flat edge', 'flat edges']
  return [
    [`${front[0]} to centre`, 90, true],
    [`${front[0]} outward`, -90, true],
    [`${front[0]} up the finger`, 0, true],
    [`Both ${front[1]} one way`, -90, false],
  ]
}

export function SidesPanel() {
  const side = useStore((s) => s.spec.accents.side)
  const stone = useStore((s) => s.spec.stone)
  const update = useStore((s) => s.update)
  if (!stone.enabled) return <p className="note">Turn on a centre stone to add side stones.</p>
  const set = (patch: Partial<typeof side>) => update((d) => void Object.assign(d.accents.side, patch))
  const shape = side.shape === 'match' ? stone.shape : side.shape
  const toi = side.layout === 'toi-et-moi'
  const on = toi || side.count > 0
  const sizes = Array.from({ length: toi ? 1 : side.count }, (_, k) => {
    const carat = stone.carat * (side.ratio * side.graduation ** k) ** 3
    const d = stoneDimensions(shape, carat, side.gem)
    return `${carat.toFixed(2)} ct ${d.length.toFixed(1)}×${d.width.toFixed(1)}`
  })
  return (
    <>
      <Chips label="Layout" value={side.layout} options={SIDE_LAYOUTS} labels={{ both: 'Both sides', 'toi-et-moi': 'Toi et moi (pair)' }} onChange={(v) => set({ layout: v, count: v === 'both' && !side.count ? 1 : side.count })} />
      {!toi && (
        <Chips
          label="Side stones"
          value={String(side.count)}
          options={['0', '1', '2', '3'] as const}
          labels={Object.fromEntries(SIDE_COUNT_LABELS.map((l, i) => [String(i), l]))}
          onChange={(v) => set({ count: Number(v) })}
        />
      )}
      {on && (
        <>
          <Select
            label="Side stone shape"
            value={side.shape}
            options={['match', ...STONE_SHAPES] as const}
            labels={{ match: `Same as centre (${shapeLabels[stone.shape]})`, ...shapeLabels }}
            onChange={(v) => set({ shape: v })}
          />
          <GemPicker title="Side stone gem" value={side.gem} color={side.customColor} onGem={(v) => set({ gem: v })} onColor={(v) => set({ customColor: v })} />
          <Slider
            label={toi ? 'Partner stone size' : 'Side stone size'}
            value={side.ratio}
            min={LIMITS.sideRatio[0]}
            max={LIMITS.sideRatio[1]}
            step={0.05}
            format={(v) => `${Math.round(v * 100)}% of centre · ${sizes[0]} mm`}
            onChange={(v) => set({ ratio: v })}
          />
          {!toi && side.count > 1 && (
            <Slider
              label="Graduation"
              value={side.graduation}
              min={LIMITS.graduation[0]}
              max={LIMITS.graduation[1]}
              step={0.05}
              format={(v) => (v >= 1 ? 'all the same size' : `each next ${Math.round(v * 100)}% · ${sizes.slice(1).join(', ')} mm`)}
              onChange={(v) => set({ graduation: v })}
            />
          )}
          <Field label="Orientation">
            <div className="chips" role="group" aria-label="Side stone orientation presets">
              {/* A toi et moi has one partner stone, so "both one way" means nothing there. */}
              {presetsFor(shape).filter(([, , mirror]) => !toi || mirror).map(([name, rot, mirror]) => {
                const active = side.rotationDeg === rot && (toi || side.mirror === mirror)
                return (
                  <button key={name} type="button" aria-pressed={active} className={active ? 'chip on' : 'chip'} onClick={() => set({ rotationDeg: rot, mirror })}>
                    {name}
                  </button>
                )
              })}
            </div>
          </Field>
          <Slider label="Side stone rotation" value={side.rotationDeg} min={LIMITS.sideRotationDeg[0]} max={LIMITS.sideRotationDeg[1]} step={5} format={(v) => `${v}°`} onChange={(v) => set({ rotationDeg: v })} />
          {!toi && <Toggle label="Mirror left stones" value={side.mirror} onChange={(v) => set({ mirror: v })} />}
          <Chips label="Side stone setting" value={side.setting} options={SIDE_SETTINGS} labels={SIDE_SETTING_LABELS} onChange={(v) => set({ setting: v })} />
          <Slider label="Gap" value={side.gapMm} min={LIMITS.sideGapMm[0]} max={LIMITS.sideGapMm[1]} step={0.05} format={mm} onChange={(v) => set({ gapMm: v })} />
          <Slider
            label={toi ? 'Diagonal offset' : 'Offset along finger'}
            value={side.offsetMm}
            min={LIMITS.sideOffsetMm[0]}
            max={LIMITS.sideOffsetMm[1]}
            step={0.1}
            format={(v) => (v === 0 ? 'in line' : mm(v))}
            onChange={(v) => set({ offsetMm: v })}
          />
          <Slider label="Side stone height" value={side.height} min={LIMITS.sideHeight[0]} max={LIMITS.sideHeight[1]} step={0.05} format={(v) => `${Math.round(v * 100)}% of centre`} onChange={(v) => set({ height: v })} />
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
  return (
    <>
      <Chips label="Band stones" value={accents.style} options={ACCENTS} labels={ACCENT_INFO} onChange={(v) => update((d) => void (d.accents.style = v))} />
      {accents.style !== 'none' && (
        <>
          <Slider label="Stone size" value={accents.stoneMm} min={LIMITS.accentStoneMm[0]} max={LIMITS.accentStoneMm[1]} step={0.05} format={(v) => `${mm(v)} across the band`} onChange={(v) => update((d) => void (d.accents.stoneMm = v))} />
          <Select label="Cut" value={accents.meleeCut} options={['auto', ...STONE_SHAPES] as const} labels={{ auto: 'Auto (round, princess in a channel)', ...shapeLabels }} onChange={(v) => update((d) => void (d.accents.meleeCut = v))} />
          <Toggle label="Bezel-set (each stone in its own rim)" value={accents.bezelSet} onChange={(v) => update((d) => void (d.accents.bezelSet = v))} />
          {accents.bezelSet && <BezelControls />}
          <Slider
            label="Spacing"
            value={accents.spacingMm}
            min={LIMITS.spacingMm[0]}
            max={LIMITS.spacingMm[1]}
            step={0.1}
            format={(v) => (v === 0 ? 'touching' : `${mm(v)} apart${v >= 3 ? ' · stations' : ''}`)}
            onChange={(v) => update((d) => void (d.accents.spacingMm = v))}
          />
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
          <GemPicker title="Band stone gem" value={accents.gem} color={accents.customColor} onGem={(v) => update((d) => void (d.accents.gem = v))} onColor={(v) => update((d) => void (d.accents.customColor = v))} />
        </>
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
