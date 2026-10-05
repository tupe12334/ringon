// Starting points that follow common jeweler designs. Each is a full, valid spec.

import { usToDiameter } from '../ring/sizes'
import { DEFAULT_SPEC, type RingSpec } from '../ring/spec'

const base = DEFAULT_SPEC
const make = (name: string, patch: (s: RingSpec) => void): RingSpec => {
  const s: RingSpec = structuredClone(base)
  s.name = name
  patch(s)
  return s
}

export const BUILTIN_TEMPLATES: RingSpec[] = [
  make('Classic solitaire', (s) => {
    s.band = { ...s.band, profile: 'court', widthMm: 2, metal: 'yellow-gold-18k', headMetal: 'white-gold-18k', taper: 0.85 }
    s.stone = { ...s.stone, shape: 'round', carat: 1, setting: 'prong-6' }
  }),
  make('Oval halo', (s) => {
    s.band = { ...s.band, profile: 'court', widthMm: 2, metal: 'platinum', headMetal: 'match', taper: 0.9 }
    s.stone = { ...s.stone, shape: 'oval', carat: 1.2, setting: 'prong-4', prongTip: 'claw' }
    s.halo = { ...s.halo, enabled: true, stoneMm: 1.1 }
    s.accents = { ...s.accents, style: 'pave', stoneMm: 1.2 }
  }),
  make('Emerald three stone', (s) => {
    s.band = { ...s.band, profile: 'd-shape', widthMm: 2.4, metal: 'white-gold-18k', headMetal: 'match' }
    s.stone = { ...s.stone, shape: 'emerald', carat: 1.5, setting: 'prong-4', prongTip: 'claw' }
    s.accents = { ...s.accents, style: 'three-stone', sideRatio: 0.65 }
  }),
  make('Pear trilogy', (s) => {
    s.band = { ...s.band, profile: 'court', widthMm: 2.2, metal: 'platinum', headMetal: 'match' }
    s.stone = { ...s.stone, shape: 'oval', carat: 1.2, setting: 'prong-4', prongTip: 'claw' }
    s.accents = { ...s.accents, style: 'three-stone', sideRatio: 0.6, side: { ...s.accents.side, shape: 'pear', rotationDeg: 90, mirror: true } }
  }),
  make('Vintage bezel', (s) => {
    s.band = { ...s.band, profile: 'half-round', widthMm: 2.5, metal: 'rose-gold-18k', headMetal: 'match', finish: 'satin' }
    s.stone = { ...s.stone, shape: 'cushion', carat: 1, gem: 'morganite', setting: 'bezel', settingHeightMm: 2.5 }
  }),
  make('Pear sapphire', (s) => {
    s.band = { ...s.band, profile: 'court', widthMm: 1.8, metal: 'rose-gold-14k', headMetal: 'match', taper: 0.8 }
    s.stone = { ...s.stone, shape: 'pear', carat: 1.1, gem: 'pink-sapphire', setting: 'prong-4', prongTip: 'v-tip' }
    s.accents = { ...s.accents, style: 'half-eternity', stoneMm: 1.1 }
  }),
  make('Modern tension', (s) => {
    s.band = { ...s.band, profile: 'square', widthMm: 4, thicknessMm: 2.4, metal: 'titanium', headMetal: 'match', finish: 'brushed', taper: 1, comfortFit: true }
    s.stone = { ...s.stone, shape: 'round', carat: 0.7, setting: 'tension' }
  }),
  make('Comfort-fit wedding band', (s) => {
    s.band = { ...s.band, profile: 'd-shape', widthMm: 5, thicknessMm: 1.8, metal: 'platinum', headMetal: 'match', taper: 1, comfortFit: true }
    s.stone = { ...s.stone, enabled: false }
  }),
  make('Eternity band', (s) => {
    s.band = { ...s.band, profile: 'court', widthMm: 2.6, thicknessMm: 1.8, metal: 'white-gold-18k', headMetal: 'match', taper: 1 }
    s.stone = { ...s.stone, enabled: false }
    s.accents = { ...s.accents, style: 'eternity', stoneMm: 2.2 }
  }),
  make('Hammered band', (s) => {
    s.innerDiameterMm = usToDiameter(10)
    s.band = { ...s.band, profile: 'flat', widthMm: 7, thicknessMm: 2, metal: 'sterling-silver', headMetal: 'match', finish: 'hammered', taper: 1, comfortFit: true }
    s.stone = { ...s.stone, enabled: false }
  }),
  make('Ruby channel band', (s) => {
    s.band = { ...s.band, profile: 'flat', widthMm: 4, thicknessMm: 2, metal: 'yellow-gold-22k', headMetal: 'match', taper: 1 }
    s.stone = { ...s.stone, enabled: false }
    s.accents = { ...s.accents, style: 'channel', stoneMm: 2.4, gem: 'ruby' }
  }),
]
