// The ring design document. Everything the customizer can change lives here, so a template,
// a share link and a saved design are all just a RingSpec.

import { z } from 'zod/mini'
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

// Every field falls back to its default instead of failing, so untrusted input (imported file,
// share link, old localStorage) always yields a valid spec. The fallbacks are the defaults.

/** A finite number clamped to `range`; anything else is `fallback`. */
const num = ([lo, hi]: readonly [number, number], fallback: number) =>
  z.pipe(z.catch(z.number(), fallback), z.transform((v: number) => Math.min(hi, Math.max(lo, v))))

const int = (range: readonly [number, number], fallback: number) => z.pipe(num(range, fallback), z.transform(Math.round))

const pick = <const T extends readonly [string, ...string[]]>(allowed: T, fallback: T[number]) => z.catch(z.enum(allowed), fallback)

const bool = (fallback: boolean) => z.catch(z.boolean(), fallback)

const color = (fallback: string) => z.catch(z.string().check(z.regex(/^#[0-9a-f]{6}$/i)), fallback)

const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}

/** A nested object; a missing or non-object value becomes all defaults. */
const section = <S extends z.core.$ZodShape>(shape: S) => z.pipe(z.transform(obj), z.object(shape))

const StoneSchema = section({
  enabled: bool(true),
  shape: pick(STONE_SHAPES, 'round'),
  carat: num(LIMITS.carat, 1),
  gem: pick(GEMS, 'diamond'),
  /** Hex colour, used when gem is "custom". */
  customColor: color('#7fd3ff'),
  setting: pick(SETTINGS, 'prong-6'),
  prongTip: pick(PRONG_TIPS, 'round'),
  /** Height of the girdle above the band surface, mm. */
  settingHeightMm: num(LIMITS.settingHeightMm, 3),
  /** Rotate the stone on the finger, degrees (e.g. east–west oval = 90). */
  rotationDeg: num(LIMITS.rotationDeg, 0),
  /** Bezel look; also used by bezel-set side stones. */
  bezel: section({
    /** Wall thickness, mm. */
    wallMm: num(LIMITS.bezelWallMm, 0.5),
    /** How far the wall rises over the girdle, as a share of the crown height (0 = flush). */
    lip: num(LIMITS.bezelLip, 0.3),
    edge: pick(BEZEL_EDGES, 'plain'),
    halfWalls: pick(HALF_BEZEL_WALLS, 'sides'),
  }),
})

const SideSchema = section({
  /** Stones on each side of the centre: 0 none, 1 three-stone, 2 five-stone, 3 seven-stone. */
  count: int(LIMITS.sideCount, 0),
  layout: pick(SIDE_LAYOUTS, 'both'),
  shape: pick([...STONE_SHAPES, 'match'], 'match'),
  /** First side stone size relative to the centre stone (by face-up size). */
  ratio: num(LIMITS.sideRatio, 0.6),
  /** Each further stone out relative to the previous one. */
  graduation: num(LIMITS.graduation, 0.8),
  gem: pick(GEMS, 'diamond'),
  customColor: color('#ffffff'),
  /** Rotation of the right stone, degrees; 0 = long axis along the finger, 90 = across.
   * Angles wrap (190° is −170°) rather than clamp. */
  rotationDeg: z.pipe(z.catch(z.number(), 0), z.transform((v: number) => ((((v + 180) % 360) + 360) % 360) - 180)),
  /** Left stone is the mirror image of the right (pears/hearts point the same way relative to the centre). */
  mirror: bool(true),
  setting: pick(SIDE_SETTINGS, 'prong-4'),
  /** Metal gap between the centre and each side stone, mm. */
  gapMm: num(LIMITS.sideGapMm, 0.4),
  /** Side stone girdle height relative to the centre stone's, 0.4 – 1. */
  height: num(LIMITS.sideHeight, 0.7),
  /** Shift the side stones along the finger, mm (e.g. tuck them against a pear's round end;
   * for toi et moi this sets the pair diagonally). */
  offsetMm: num(LIMITS.sideOffsetMm, 0),
})

/** Designs from before side stones were separate used accent style "three-stone" with
 * accents.sideRatio/gem/customColor; move those onto accents.side. */
function migrateAccents(v: unknown): Record<string, unknown> {
  const a = obj(v)
  const side = obj(a.side)
  const threeStone = a.style === 'three-stone'
  return {
    ...a,
    side: {
      ...side,
      count: threeStone && !(typeof side.count === 'number' && Number.isFinite(side.count)) ? 1 : side.count,
      ratio: side.ratio ?? a.sideRatio,
      gem: side.gem ?? (threeStone ? a.gem : undefined),
      customColor: side.customColor ?? (threeStone ? a.customColor : undefined),
    },
  }
}

export const RingSpecSchema = z.object({
  version: z.catch(z.literal(1), 1),
  name: z.pipe(z.catch(z.string().check(z.trim(), z.minLength(1)), 'My ring'), z.transform((s: string) => s.slice(0, 60))),
  /** Canonical ring size: inner diameter, mm. */
  innerDiameterMm: num(LIMITS.innerDiameterMm, usToDiameter(6)),
  band: section({
    profile: pick(PROFILES, 'court'),
    widthMm: num(LIMITS.widthMm, 2.2),
    thicknessMm: num(LIMITS.thicknessMm, 1.7),
    /** Domed inside ("comfort fit"). */
    comfortFit: bool(true),
    /** Shank width under the finger relative to the top, 0.5 – 1 (1 = no taper). */
    taper: num(LIMITS.taper, 0.85),
    metal: pick(METALS, 'yellow-gold-18k'),
    finish: pick(FINISHES, 'polished'),
    /** Metal for prongs/bezel/halo; "match" uses the band metal (two-tone otherwise). */
    headMetal: pick([...METALS, 'match'], 'white-gold-18k'),
  }),
  stone: StoneSchema,
  halo: section({
    enabled: bool(false),
    stoneMm: num(LIMITS.haloStoneMm, 1.2),
    gem: pick(GEMS, 'diamond'),
    customColor: color('#ffffff'),
    /** Classic frames the girdle; hidden sits under it, seen from the side. */
    style: pick(HALO_STYLES, 'classic'),
    /** 1 = single halo, 2 = double halo. */
    rows: int(LIMITS.haloRows, 1),
  }),
  accents: z.pipe(
    z.transform(migrateAccents),
    z.object({
      style: pick(ACCENTS, 'none'),
      /** Band stone size across the band, mm. */
      stoneMm: num(LIMITS.accentStoneMm, 1.3),
      gem: pick(GEMS, 'diamond'),
      customColor: color('#ffffff'),
      /** Pavé / channel: how far the stones run down each side of the band, degrees from the top. */
      coverageDeg: num(LIMITS.coverageDeg, 60),
      /** Pavé / eternity: rows across the band, capped by what fits; 0 = auto (two on a wide pavé band). */
      rows: int(LIMITS.rows, 0),
      /** Band stone cut; "auto" = princess in a channel, round otherwise. Long axis runs across the band.
       * Older designs had round/princess/baguette plus "auto". */
      meleeCut: pick([...STONE_SHAPES, 'auto'], 'auto'),
      /** Extra metal between band stones, mm (wide spacing = "stations" / "diamonds by the yard"). */
      spacingMm: num(LIMITS.spacingMm, 0),
      /** Each band stone in its own bezel cup instead of pavé beads. */
      bezelSet: bool(false),
      /** Side stones beside the centre stone (three-stone, five-stone, toi et moi). */
      side: SideSchema,
    }),
  ),
  engraving: section({
    text: z.pipe(z.catch(z.string(), ''), z.transform((s: string) => s.slice(0, LIMITS.engravingLength[1]))),
    font: pick(FONTS, 'script'),
  }),
})

export type RingSpec = z.output<typeof RingSpecSchema>
export type StoneSpec = RingSpec['stone']

/**
 * Turn untrusted input (imported file, share link, old localStorage) into a valid spec.
 * Unknown values fall back to defaults; numbers are clamped to LIMITS.
 */
export const sanitizeSpec = (input: unknown): RingSpec => RingSpecSchema.parse(obj(input))

export const DEFAULT_SPEC: RingSpec = sanitizeSpec({})
