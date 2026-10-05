// Ring size conventions. The canonical unit everywhere is the inner diameter in millimetres.
//
// - US / Canada: diameter(mm) = 11.63 + 0.8128 × size, in quarter sizes (ANSI convention).
// - ISO 8653 / EU: size number = inner circumference in mm.
// - UK / Australia: letters A..Z, A = 37.83 mm circumference, each full letter +1.25 mm,
//   half sizes in between.
// - Japan: JP 1 = 13 mm diameter, each whole size +⅓ mm.

export type SizeSystem = 'us' | 'eu' | 'uk' | 'jp'

export const SIZE_SYSTEMS: { id: SizeSystem; label: string }[] = [
  { id: 'us', label: 'US / CA' },
  { id: 'eu', label: 'EU / ISO' },
  { id: 'uk', label: 'UK / AU' },
  { id: 'jp', label: 'JP' },
]

export const MIN_DIAMETER_MM = 12
export const MAX_DIAMETER_MM = 25

const UK_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const UK_A_CIRCUMFERENCE = 37.83
const UK_STEP = 1.25

export const usToDiameter = (us: number) => 11.63 + 0.8128 * us
export const diameterToUs = (d: number) => (d - 11.63) / 0.8128
export const euToDiameter = (eu: number) => eu / Math.PI
export const diameterToEu = (d: number) => d * Math.PI
export const jpToDiameter = (jp: number) => 13 + (jp - 1) / 3
export const diameterToJp = (d: number) => (d - 13) * 3 + 1

/** UK size index: 0 = A, 0.5 = A½, 1 = B ... */
export const ukIndexToDiameter = (i: number) => (UK_A_CIRCUMFERENCE + i * UK_STEP) / Math.PI
export const diameterToUkIndex = (d: number) => (d * Math.PI - UK_A_CIRCUMFERENCE) / UK_STEP

export const ukIndexLabel = (i: number) => {
  const whole = Math.floor(i)
  const letter = UK_LETTERS[Math.min(Math.max(whole, 0), UK_LETTERS.length - 1)]
  return i - whole >= 0.5 ? `${letter}½` : letter
}

export interface SizeOption {
  label: string
  diameterMm: number
}

const range = (from: number, to: number, step: number) => {
  const out: number[] = []
  for (let v = from; v <= to + 1e-9; v += step) out.push(Math.round(v * 100) / 100)
  return out
}

const inBounds = (o: SizeOption) => o.diameterMm >= MIN_DIAMETER_MM && o.diameterMm <= MAX_DIAMETER_MM

/** The size chart a jeweler would offer in each system. */
export function sizeOptions(system: SizeSystem): SizeOption[] {
  switch (system) {
    case 'us':
      return range(0, 16, 0.25)
        .map((s) => ({ label: formatQuarter(s), diameterMm: usToDiameter(s) }))
        .filter(inBounds)
    case 'eu':
      return range(38, 78, 1)
        .map((s) => ({ label: String(s), diameterMm: euToDiameter(s) }))
        .filter(inBounds)
    case 'uk':
      return range(0, 25, 0.5)
        .map((i) => ({ label: ukIndexLabel(i), diameterMm: ukIndexToDiameter(i) }))
        .filter(inBounds)
    case 'jp':
      return range(1, 36, 1)
        .map((s) => ({ label: String(s), diameterMm: jpToDiameter(s) }))
        .filter(inBounds)
  }
}

function formatQuarter(s: number) {
  const whole = Math.floor(s)
  const frac = s - whole
  const glyph = frac === 0.25 ? '¼' : frac === 0.5 ? '½' : frac === 0.75 ? '¾' : ''
  return whole === 0 && glyph ? glyph : `${whole}${glyph}`
}

/** Closest chart entry to a diameter. */
export function nearestSize(system: SizeSystem, diameterMm: number): SizeOption {
  const options = sizeOptions(system)
  return options.reduce((best, o) =>
    Math.abs(o.diameterMm - diameterMm) < Math.abs(best.diameterMm - diameterMm) ? o : best,
  )
}
