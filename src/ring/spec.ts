// The ring design document. Everything the customizer can change lives here, so a template,
// a share link and a saved design are all just a RingSpec.

import { MAX_DIAMETER_MM, MIN_DIAMETER_MM, usToDiameter } from './sizes'

export const PROFILES = ['flat', 'd-shape', 'court', 'half-round', 'knife-edge', 'square'] as const
export type Profile = (typeof PROFILES)[number]

export const METALS = [
  'yellow-gold-14k',
  'yellow-gold-18k',
  'yellow-gold-22k',
  'white-gold-14k',
  'white-gold-18k',
  'rose-gold-14k',
  'rose-gold-18k',
  'platinum',
  'palladium',
  'sterling-silver',
  'titanium',
  'tungsten',
  'black-rhodium',
] as const
export type Metal = (typeof METALS)[number]

export const FINISHES = ['polished', 'satin', 'brushed', 'hammered', 'matte', 'sandblasted'] as const
export type Finish = (typeof FINISHES)[number]

export const STONE_SHAPES = [
  'round',
  'princess',
  'oval',
  'cushion',
  'emerald',
  'asscher',
  'radiant',
  'pear',
  'marquise',
  'heart',
  'baguette',
  'tapered-baguette',
  'trapezoid',
  'half-moon',
  'trillion',
] as const
export type StoneShape = (typeof STONE_SHAPES)[number]

export const GEMS = [
  'diamond',
  'lab-diamond',
  'moissanite',
  'black-diamond',
  'sapphire',
  'pink-sapphire',
  'ruby',
  'emerald',
  'green-sapphire',
  'peridot',
  'tsavorite',
  'amethyst',
  'aquamarine',
  'morganite',
  'topaz',
  'custom',
] as const
export type Gem = (typeof GEMS)[number]

export const SETTINGS = ['prong-4', 'prong-6', 'bezel', 'half-bezel', 'tension'] as const
export type Setting = (typeof SETTINGS)[number]

/** Directional shapes have a "front" at +y: the point of a pear/heart, the wide end of a
 * tapered baguette, the long edge of a trapezoid, the flat edge of a half-moon or trillion. */
export const DIRECTIONAL_SHAPES: readonly StoneShape[] = ['pear', 'heart', 'tapered-baguette', 'trapezoid', 'half-moon', 'trillion']

export const BEZEL_EDGES = ['plain', 'rounded', 'milgrain'] as const
export type BezelEdge = (typeof BEZEL_EDGES)[number]

/** Half-bezel: which parts of the outline keep a wall. */
export const HALF_BEZEL_WALLS = ['sides', 'ends'] as const
export type HalfBezelWalls = (typeof HALF_BEZEL_WALLS)[number]

export const PRONG_TIPS = ['round', 'claw', 'v-tip'] as const
export type ProngTip = (typeof PRONG_TIPS)[number]

/** Stones set into the band. Side stones next to the centre are separate (accents.side). */
export const ACCENTS = ['none', 'pave', 'channel', 'eternity', 'half-eternity'] as const
export type Accent = (typeof ACCENTS)[number]

/** Side stones: matching on both sides of the centre, or one partner stone (toi et moi). */
export const SIDE_LAYOUTS = ['both', 'toi-et-moi'] as const
export type SideLayout = (typeof SIDE_LAYOUTS)[number]

export const HALO_STYLES = ['classic', 'hidden'] as const
export type HaloStyle = (typeof HALO_STYLES)[number]


export const SIDE_SETTINGS = ['prong-4', 'prong-6', 'bezel'] as const
export type SideSetting = (typeof SIDE_SETTINGS)[number]

export const FONTS = ['serif', 'sans', 'script'] as const
export type EngravingFont = (typeof FONTS)[number]

export interface StoneSpec {
  enabled: boolean
  shape: StoneShape
  carat: number
  gem: Gem
  /** Hex colour, used when gem is "custom". */
  customColor: string
  setting: Setting
  prongTip: ProngTip
  /** Height of the girdle above the band surface, mm. */
  settingHeightMm: number
  /** Rotate the stone on the finger, degrees (e.g. east–west oval = 90). */
  rotationDeg: number
  /** Bezel look; also used by bezel-set side stones. */
  bezel: {
    /** Wall thickness, mm. */
    wallMm: number
    /** How far the wall rises over the girdle, as a share of the crown height (0 = flush). */
    lip: number
    edge: BezelEdge
    halfWalls: HalfBezelWalls
  }
}

export interface RingSpec {
  version: 1
  name: string
  /** Canonical ring size: inner diameter, mm. */
  innerDiameterMm: number
  band: {
    profile: Profile
    widthMm: number
    thicknessMm: number
    /** Domed inside ("comfort fit"). */
    comfortFit: boolean
    /** Shank width under the finger relative to the top, 0.5 – 1 (1 = no taper). */
    taper: number
    metal: Metal
    finish: Finish
    /** Metal for prongs/bezel/halo; "match" uses the band metal (two-tone otherwise). */
    headMetal: Metal | 'match'
  }
  stone: StoneSpec
  halo: {
    enabled: boolean
    stoneMm: number
    gem: Gem
    customColor: string
    /** Classic frames the girdle; hidden sits under it, seen from the side. */
    style: HaloStyle
    /** 1 = single halo, 2 = double halo. */
    rows: number
  }
  accents: {
    style: Accent
    /** Band stone size across the band, mm. */
    stoneMm: number
    gem: Gem
    customColor: string
    /** Pavé / channel: how far the stones run down each side of the band, degrees from the top. */
    coverageDeg: number
    /** Pavé / eternity: rows across the band, capped by what fits; 0 = auto (two on a wide pavé band). */
    rows: number
    /** Band stone cut; "auto" = princess in a channel, round otherwise. Long axis runs across the band. */
    meleeCut: StoneShape | 'auto'
    /** Extra metal between band stones, mm (wide spacing = "stations" / "diamonds by the yard"). */
    spacingMm: number
    /** Each band stone in its own bezel cup instead of pavé beads. */
    bezelSet: boolean
    /** Side stones beside the centre stone (three-stone, five-stone, toi et moi). */
    side: {
      /** Stones on each side of the centre: 0 none, 1 three-stone, 2 five-stone, 3 seven-stone. */
      count: number
      layout: SideLayout
      shape: StoneShape | 'match'
      /** First side stone size relative to the centre stone (by face-up size). */
      ratio: number
      /** Each further stone out relative to the previous one. */
      graduation: number
      gem: Gem
      customColor: string
      /** Rotation of the right stone, degrees; 0 = long axis along the finger, 90 = across. */
      rotationDeg: number
      /** Left stone is the mirror image of the right (pears/hearts point the same way relative to the centre). */
      mirror: boolean
      setting: SideSetting
      /** Metal gap between the centre and each side stone, mm. */
      gapMm: number
      /** Side stone girdle height relative to the centre stone's, 0.4 – 1. */
      height: number
      /** Shift the side stones along the finger, mm (e.g. tuck them against a pear's round end;
       * for toi et moi this sets the pair diagonally). */
      offsetMm: number
    }
  }
  engraving: {
    text: string
    font: EngravingFont
  }
}

export const DEFAULT_SPEC: RingSpec = {
  version: 1,
  name: 'My ring',
  innerDiameterMm: usToDiameter(6),
  band: {
    profile: 'court',
    widthMm: 2.2,
    thicknessMm: 1.7,
    comfortFit: true,
    taper: 0.85,
    metal: 'yellow-gold-18k',
    finish: 'polished',
    headMetal: 'white-gold-18k',
  },
  stone: {
    enabled: true,
    shape: 'round',
    carat: 1,
    gem: 'diamond',
    customColor: '#7fd3ff',
    setting: 'prong-6',
    prongTip: 'round',
    settingHeightMm: 3,
    rotationDeg: 0,
    bezel: { wallMm: 0.5, lip: 0.3, edge: 'plain', halfWalls: 'sides' },
  },
  halo: { enabled: false, stoneMm: 1.2, gem: 'diamond', customColor: '#ffffff', style: 'classic', rows: 1 },
  accents: {
    style: 'none',
    stoneMm: 1.3,
    gem: 'diamond',
    customColor: '#ffffff',
    coverageDeg: 60,
    rows: 0,
    meleeCut: 'auto',
    spacingMm: 0,
    bezelSet: false,
    side: {
      count: 0,
      layout: 'both',
      shape: 'match',
      ratio: 0.6,
      graduation: 0.8,
      gem: 'diamond',
      customColor: '#ffffff',
      rotationDeg: 0,
      mirror: true,
      setting: 'prong-4',
      gapMm: 0.4,
      height: 0.7,
      offsetMm: 0,
    },
  },
  engraving: { text: '', font: 'script' },
}

/** Allowed numeric ranges. Shared by the UI sliders and import sanitisation. */
export const LIMITS = {
  innerDiameterMm: [MIN_DIAMETER_MM, MAX_DIAMETER_MM],
  widthMm: [1.2, 12],
  thicknessMm: [1, 3.5],
  taper: [0.5, 1],
  carat: [0.05, 5],
  settingHeightMm: [1, 6],
  rotationDeg: [0, 180],
  bezelWallMm: [0.25, 1.5],
  bezelLip: [0, 1],
  haloStoneMm: [0.8, 2],
  accentStoneMm: [0.8, 3],
  sideRatio: [0.3, 1.2],
  sideCount: [0, 3],
  graduation: [0.5, 1],
  sideOffsetMm: [-8, 8],
  spacingMm: [0, 12],
  haloRows: [1, 2],
  coverageDeg: [15, 175],
  rows: [0, 3],
  sideRotationDeg: [-180, 180],
  sideGapMm: [0.1, 3],
  sideHeight: [0.4, 1.2],
  engravingLength: [0, 40],
} as const

const clamp = (v: unknown, [lo, hi]: readonly [number, number], fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback

const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback

const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback)

const color = (v: unknown, fallback: string) =>
  typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : fallback

const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}

/**
 * Turn untrusted input (imported file, share link, old localStorage) into a valid spec.
 * Unknown values fall back to defaults; numbers are clamped to LIMITS.
 */
export function sanitizeSpec(input: unknown): RingSpec {
  const d = DEFAULT_SPEC
  const i = obj(input)
  const band = obj(i.band)
  const stone = obj(i.stone)
  const bz = obj(stone.bezel)
  const dbz = d.stone.bezel
  const halo = obj(i.halo)
  const accents = obj(i.accents)
  const side = obj(accents.side)
  const ds = d.accents.side
  const threeStone = accents.style === 'three-stone'
  const engraving = obj(i.engraving)
  const text = typeof engraving.text === 'string' ? engraving.text : ''
  const name = typeof i.name === 'string' && i.name.trim() ? i.name.trim().slice(0, 60) : d.name

  return {
    version: 1,
    name,
    innerDiameterMm: clamp(i.innerDiameterMm, LIMITS.innerDiameterMm, d.innerDiameterMm),
    band: {
      profile: pick(band.profile, PROFILES, d.band.profile),
      widthMm: clamp(band.widthMm, LIMITS.widthMm, d.band.widthMm),
      thicknessMm: clamp(band.thicknessMm, LIMITS.thicknessMm, d.band.thicknessMm),
      comfortFit: bool(band.comfortFit, d.band.comfortFit),
      taper: clamp(band.taper, LIMITS.taper, d.band.taper),
      metal: pick(band.metal, METALS, d.band.metal),
      finish: pick(band.finish, FINISHES, d.band.finish),
      headMetal: pick(band.headMetal, [...METALS, 'match' as const], d.band.headMetal),
    },
    stone: {
      enabled: bool(stone.enabled, d.stone.enabled),
      shape: pick(stone.shape, STONE_SHAPES, d.stone.shape),
      carat: clamp(stone.carat, LIMITS.carat, d.stone.carat),
      gem: pick(stone.gem, GEMS, d.stone.gem),
      customColor: color(stone.customColor, d.stone.customColor),
      setting: pick(stone.setting, SETTINGS, d.stone.setting),
      prongTip: pick(stone.prongTip, PRONG_TIPS, d.stone.prongTip),
      settingHeightMm: clamp(stone.settingHeightMm, LIMITS.settingHeightMm, d.stone.settingHeightMm),
      rotationDeg: clamp(stone.rotationDeg, LIMITS.rotationDeg, d.stone.rotationDeg),
      bezel: {
        wallMm: clamp(bz.wallMm, LIMITS.bezelWallMm, dbz.wallMm),
        lip: clamp(bz.lip, LIMITS.bezelLip, dbz.lip),
        edge: pick(bz.edge, BEZEL_EDGES, dbz.edge),
        halfWalls: pick(bz.halfWalls, HALF_BEZEL_WALLS, dbz.halfWalls),
      },
    },
    halo: {
      enabled: bool(halo.enabled, d.halo.enabled),
      stoneMm: clamp(halo.stoneMm, LIMITS.haloStoneMm, d.halo.stoneMm),
      gem: pick(halo.gem, GEMS, d.halo.gem),
      customColor: color(halo.customColor, d.halo.customColor),
      style: pick(halo.style, HALO_STYLES, d.halo.style),
      rows: Math.round(clamp(halo.rows, LIMITS.haloRows, d.halo.rows)),
    },
    accents: {
      style: pick(accents.style, ACCENTS, d.accents.style),
      stoneMm: clamp(accents.stoneMm, LIMITS.accentStoneMm, d.accents.stoneMm),
      gem: pick(accents.gem, GEMS, d.accents.gem),
      customColor: color(accents.customColor, d.accents.customColor),
      coverageDeg: clamp(accents.coverageDeg, LIMITS.coverageDeg, d.accents.coverageDeg),
      rows: Math.round(clamp(accents.rows, LIMITS.rows, d.accents.rows)),
      // Older designs had round/princess/baguette plus "auto".
      meleeCut: pick(accents.meleeCut, [...STONE_SHAPES, 'auto' as const], d.accents.meleeCut),
      spacingMm: clamp(accents.spacingMm, LIMITS.spacingMm, d.accents.spacingMm),
      bezelSet: bool(accents.bezelSet, d.accents.bezelSet),
      side: {
        // Designs from before side stones were separate used style "three-stone".
        count: Math.round(clamp(side.count, LIMITS.sideCount, threeStone ? 1 : ds.count)),
        layout: pick(side.layout, SIDE_LAYOUTS, ds.layout),
        shape: pick(side.shape, [...STONE_SHAPES, 'match' as const], ds.shape),
        ratio: clamp(side.ratio ?? accents.sideRatio, LIMITS.sideRatio, ds.ratio),
        graduation: clamp(side.graduation, LIMITS.graduation, ds.graduation),
        gem: pick(side.gem ?? (threeStone ? accents.gem : undefined), GEMS, ds.gem),
        customColor: color(side.customColor ?? (threeStone ? accents.customColor : undefined), ds.customColor),
        // Angles wrap (190° is −170°) rather than clamp.
        rotationDeg: typeof side.rotationDeg === 'number' && Number.isFinite(side.rotationDeg) ? ((((side.rotationDeg + 180) % 360) + 360) % 360) - 180 : ds.rotationDeg,
        mirror: bool(side.mirror, ds.mirror),
        setting: pick(side.setting, SIDE_SETTINGS, ds.setting),
        gapMm: clamp(side.gapMm, LIMITS.sideGapMm, ds.gapMm),
        height: clamp(side.height, LIMITS.sideHeight, ds.height),
        offsetMm: clamp(side.offsetMm, LIMITS.sideOffsetMm, ds.offsetMm),
      },
    },
    engraving: {
      text: text.slice(0, LIMITS.engravingLength[1]),
      font: pick(engraving.font, FONTS, d.engraving.font),
    },
  }
}
