// Real-world reference data: metal colours, gem optics, stone proportions.
// Display names live in the translations (src/i18n).

import type { Finish, Gem, Metal, StoneShape } from './spec'

export const METAL_INFO: Record<Metal, { color: string; roughness: number }> = {
  'yellow-gold-14k': { color: '#ddb866', roughness: 0.08 },
  'yellow-gold-18k': { color: '#e6c46a', roughness: 0.07 },
  'yellow-gold-22k': { color: '#edc25e', roughness: 0.07 },
  'white-gold-14k': { color: '#e6e4de', roughness: 0.07 },
  'white-gold-18k': { color: '#ecebe7', roughness: 0.06 },
  'rose-gold-14k': { color: '#e7b39e', roughness: 0.08 },
  'rose-gold-18k': { color: '#e0a58e', roughness: 0.07 },
  platinum: { color: '#e5e4e2', roughness: 0.1 },
  palladium: { color: '#d2d3d1', roughness: 0.1 },
  'sterling-silver': { color: '#eeeeee', roughness: 0.09 },
  titanium: { color: '#aaa59e', roughness: 0.18 },
  tungsten: { color: '#6f6f70', roughness: 0.12 },
  'black-rhodium': { color: '#2b2b2e', roughness: 0.1 },
}

export const FINISH_INFO: Record<Finish, { roughnessAdd: number }> = {
  polished: { roughnessAdd: 0 },
  satin: { roughnessAdd: 0.25 },
  brushed: { roughnessAdd: 0.3 },
  hammered: { roughnessAdd: 0.04 },
  matte: { roughnessAdd: 0.45 },
  sandblasted: { roughnessAdd: 0.55 },
}

/**
 * density g/cm³ (size for a carat weight), refractive index, dispersion (fire),
 * and a display colour.
 */
export const GEM_INFO: Record<
  Gem,
  { color: string; density: number; ior: number; dispersion: number; opaque?: boolean }
> = {
  diamond: { color: '#ffffff', density: 3.52, ior: 2.42, dispersion: 0.044 },
  'lab-diamond': { color: '#ffffff', density: 3.52, ior: 2.42, dispersion: 0.044 },
  moissanite: { color: '#fbfdf6', density: 3.21, ior: 2.65, dispersion: 0.104 },
  'black-diamond': { color: '#1a1a1d', density: 3.52, ior: 2.42, dispersion: 0.044, opaque: true },
  sapphire: { color: '#1f4fd1', density: 4.0, ior: 1.77, dispersion: 0.018 },
  'pink-sapphire': { color: '#f27fb3', density: 4.0, ior: 1.77, dispersion: 0.018 },
  ruby: { color: '#c4122f', density: 4.0, ior: 1.77, dispersion: 0.018 },
  emerald: { color: '#13a05a', density: 2.72, ior: 1.58, dispersion: 0.014 },
  'green-sapphire': { color: '#7da857', density: 4.0, ior: 1.77, dispersion: 0.018 },
  peridot: { color: '#a3c43a', density: 3.34, ior: 1.67, dispersion: 0.02 },
  tsavorite: { color: '#2fa85a', density: 3.61, ior: 1.74, dispersion: 0.028 },
  amethyst: { color: '#8d4fc7', density: 2.65, ior: 1.54, dispersion: 0.013 },
  aquamarine: { color: '#7fd3e8', density: 2.7, ior: 1.58, dispersion: 0.014 },
  morganite: { color: '#f4b9a4', density: 2.8, ior: 1.59, dispersion: 0.014 },
  topaz: { color: '#4fb6e8', density: 3.53, ior: 1.62, dispersion: 0.014 },
  custom: { color: '#7fd3ff', density: 3.52, ior: 2.0, dispersion: 0.03 },
}

/** Face-up length × width (mm) of a 1 ct diamond, from common cutting proportions. */
export const SHAPE_INFO: Record<StoneShape, { length1ct: number; width1ct: number }> = {
  round: { length1ct: 6.5, width1ct: 6.5 },
  princess: { length1ct: 5.5, width1ct: 5.5 },
  oval: { length1ct: 7.7, width1ct: 5.7 },
  cushion: { length1ct: 6.0, width1ct: 5.5 },
  emerald: { length1ct: 7.0, width1ct: 5.0 },
  asscher: { length1ct: 5.5, width1ct: 5.5 },
  radiant: { length1ct: 6.5, width1ct: 5.3 },
  pear: { length1ct: 8.5, width1ct: 5.5 },
  marquise: { length1ct: 10.0, width1ct: 5.0 },
  heart: { length1ct: 6.5, width1ct: 6.5 },
  baguette: { length1ct: 8.0, width1ct: 4.0 },
  'tapered-baguette': { length1ct: 8.0, width1ct: 4.5 },
  // Trapezoid, half-moon and trillion are wider than long: width is the front edge.
  trapezoid: { length1ct: 5.0, width1ct: 8.0 },
  'half-moon': { length1ct: 4.5, width1ct: 9.0 },
  trillion: { length1ct: 6.5, width1ct: 7.5 },
}

/** Stone face-up size for a carat weight. Mass ∝ volume ∝ size³, corrected for density. */
export function stoneDimensions(shape: StoneShape, carat: number, gem: Gem) {
  const s = SHAPE_INFO[shape]
  const scale = Math.cbrt(carat) * Math.cbrt(GEM_INFO.diamond.density / GEM_INFO[gem].density)
  const length = s.length1ct * scale
  const width = s.width1ct * scale
  // Ideal round: total depth ≈ 61% of diameter, crown ≈ 15%, pavilion ≈ 43%.
  return { length, width, crown: width * 0.15, pavilion: width * 0.43 }
}

/** Approximate carat weight of a round melee stone of a given diameter. */
export const meleeCarat = (diameterMm: number) => (diameterMm / 6.5) ** 3

export function gemColor(gem: Gem, customColor: string) {
  return gem === 'custom' ? customColor : GEM_INFO[gem].color
}

export function metalColor(metal: Metal) {
  return METAL_INFO[metal].color
}
