// Real-world reference data: metal colours, gem optics, stone proportions.

import type { Finish, Gem, Metal, Profile, Setting, StoneShape, Accent, ProngTip } from './spec'

export const METAL_INFO: Record<Metal, { label: string; color: string; roughness: number }> = {
  'yellow-gold-14k': { label: '14k yellow gold', color: '#ddb866', roughness: 0.08 },
  'yellow-gold-18k': { label: '18k yellow gold', color: '#e6c46a', roughness: 0.07 },
  'yellow-gold-22k': { label: '22k yellow gold', color: '#edc25e', roughness: 0.07 },
  'white-gold-14k': { label: '14k white gold', color: '#e6e4de', roughness: 0.07 },
  'white-gold-18k': { label: '18k white gold', color: '#ecebe7', roughness: 0.06 },
  'rose-gold-14k': { label: '14k rose gold', color: '#e7b39e', roughness: 0.08 },
  'rose-gold-18k': { label: '18k rose gold', color: '#e0a58e', roughness: 0.07 },
  platinum: { label: 'Platinum', color: '#e5e4e2', roughness: 0.1 },
  palladium: { label: 'Palladium', color: '#d2d3d1', roughness: 0.1 },
  'sterling-silver': { label: 'Sterling silver', color: '#eeeeee', roughness: 0.09 },
  titanium: { label: 'Titanium', color: '#aaa59e', roughness: 0.18 },
  tungsten: { label: 'Tungsten carbide', color: '#6f6f70', roughness: 0.12 },
  'black-rhodium': { label: 'Black rhodium', color: '#2b2b2e', roughness: 0.1 },
}

export const FINISH_INFO: Record<Finish, { label: string; roughnessAdd: number }> = {
  polished: { label: 'High polish', roughnessAdd: 0 },
  satin: { label: 'Satin', roughnessAdd: 0.25 },
  brushed: { label: 'Brushed', roughnessAdd: 0.3 },
  hammered: { label: 'Hammered', roughnessAdd: 0.04 },
  matte: { label: 'Matte', roughnessAdd: 0.45 },
  sandblasted: { label: 'Sandblasted', roughnessAdd: 0.55 },
}

export const PROFILE_INFO: Record<Profile, string> = {
  flat: 'Flat',
  'd-shape': 'D-shape',
  court: 'Court',
  'half-round': 'Half round',
  'knife-edge': 'Knife edge',
  square: 'Square / Euro',
}

/**
 * density g/cm³ (size for a carat weight), refractive index, dispersion (fire),
 * and a display colour.
 */
export const GEM_INFO: Record<
  Gem,
  { label: string; color: string; density: number; ior: number; dispersion: number }
> = {
  diamond: { label: 'Diamond', color: '#ffffff', density: 3.52, ior: 2.42, dispersion: 0.044 },
  'lab-diamond': { label: 'Lab diamond', color: '#ffffff', density: 3.52, ior: 2.42, dispersion: 0.044 },
  moissanite: { label: 'Moissanite', color: '#fbfdf6', density: 3.21, ior: 2.65, dispersion: 0.104 },
  'black-diamond': { label: 'Black diamond', color: '#1a1a1d', density: 3.52, ior: 2.42, dispersion: 0.044 },
  sapphire: { label: 'Blue sapphire', color: '#1f4fd1', density: 4.0, ior: 1.77, dispersion: 0.018 },
  'pink-sapphire': { label: 'Pink sapphire', color: '#f27fb3', density: 4.0, ior: 1.77, dispersion: 0.018 },
  ruby: { label: 'Ruby', color: '#c4122f', density: 4.0, ior: 1.77, dispersion: 0.018 },
  emerald: { label: 'Emerald', color: '#13a05a', density: 2.72, ior: 1.58, dispersion: 0.014 },
  amethyst: { label: 'Amethyst', color: '#8d4fc7', density: 2.65, ior: 1.54, dispersion: 0.013 },
  aquamarine: { label: 'Aquamarine', color: '#7fd3e8', density: 2.7, ior: 1.58, dispersion: 0.014 },
  morganite: { label: 'Morganite', color: '#f4b9a4', density: 2.8, ior: 1.59, dispersion: 0.014 },
  topaz: { label: 'Topaz', color: '#4fb6e8', density: 3.53, ior: 1.62, dispersion: 0.014 },
  custom: { label: 'Custom colour', color: '#7fd3ff', density: 3.52, ior: 2.0, dispersion: 0.03 },
}

/** Face-up length × width (mm) of a 1 ct diamond, from common cutting proportions. */
export const SHAPE_INFO: Record<StoneShape, { label: string; length1ct: number; width1ct: number }> = {
  round: { label: 'Round brilliant', length1ct: 6.5, width1ct: 6.5 },
  princess: { label: 'Princess', length1ct: 5.5, width1ct: 5.5 },
  oval: { label: 'Oval', length1ct: 7.7, width1ct: 5.7 },
  cushion: { label: 'Cushion', length1ct: 6.0, width1ct: 5.5 },
  emerald: { label: 'Emerald', length1ct: 7.0, width1ct: 5.0 },
  asscher: { label: 'Asscher', length1ct: 5.5, width1ct: 5.5 },
  radiant: { label: 'Radiant', length1ct: 6.5, width1ct: 5.3 },
  pear: { label: 'Pear', length1ct: 8.5, width1ct: 5.5 },
  marquise: { label: 'Marquise', length1ct: 10.0, width1ct: 5.0 },
  heart: { label: 'Heart', length1ct: 6.5, width1ct: 6.5 },
}

export const SETTING_INFO: Record<Setting, string> = {
  'prong-4': '4 prongs',
  'prong-6': '6 prongs',
  bezel: 'Bezel',
  'half-bezel': 'Half bezel',
  tension: 'Tension',
}

export const PRONG_TIP_INFO: Record<ProngTip, string> = {
  round: 'Round',
  claw: 'Claw',
  'v-tip': 'V-tip',
}

export const ACCENT_INFO: Record<Accent, string> = {
  none: 'None',
  pave: 'Pavé',
  channel: 'Channel',
  'three-stone': 'Three stone',
  eternity: 'Full eternity',
  'half-eternity': 'Half eternity',
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
