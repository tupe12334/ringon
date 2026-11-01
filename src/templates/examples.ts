// Real rings from jewelers' sites, rebuilt with the designer. Each one doubles as a check that
// the customizer can express the design (see templates.test.ts). Sizes are read from the
// listing where it gives them; the rest follows the listing's photos and common practice.

import { type RingSpec } from '../ring/spec'
import { make } from './make'

/** Size of side stones relative to the centre for a given carat weight of each. */
const ratioFor = (centreCt: number, sideCt: number) => Math.cbrt(sideCt / centreCt)

export const EXAMPLE_TEMPLATES: RingSpec[] = [
  // https://www.bluenile.com/engagement-rings/design-your-own-ring/three-stone-tapered-baguette-diamond-engagement-ring-in-platinum-5-8-ct-tw-item-191941
  make('Tapered baguette trio', (s) => {
    s.band = { ...s.band, profile: 'court', widthMm: 2, metal: 'platinum', headMetal: 'match' }
    s.stone = { ...s.stone, shape: 'oval', carat: 1.5, setting: 'prong-4' }
    s.accents.side = { ...s.accents.side, count: 1, shape: 'tapered-baguette', ratio: ratioFor(1.5, 0.31), rotationDeg: 90, gapMm: 0.3 }
  }),
  // https://www.bluenile.com/engagement-rings/design-your-own-ring/three-stone-trillion-diamond-engagement-ring-in-platinum-1-3-ct-tw-item-192950
  make('Trillion trio', (s) => {
    s.band = { ...s.band, profile: 'court', widthMm: 1.7, metal: 'platinum', headMetal: 'match' }
    s.stone = { ...s.stone, shape: 'round', carat: 1, setting: 'prong-6' }
    s.accents.side = { ...s.accents.side, count: 1, shape: 'trillion', ratio: ratioFor(1, 0.15), rotationDeg: 90, gapMm: 0.3 }
  }),
  // https://www.goodstoneinc.com/products/three-stone-engagement-ring-with-pear-side-stones-and-oval-cut
  make('Oval with pear sides', (s) => {
    s.band = { ...s.band, profile: 'court', widthMm: 2.4, metal: 'white-gold-18k', headMetal: 'match' }
    s.stone = { ...s.stone, shape: 'oval', carat: 1.5, setting: 'prong-4', prongTip: 'claw' }
    s.accents.side = { ...s.accents.side, count: 1, shape: 'pear', ratio: 0.55, rotationDeg: -90, gapMm: 0.3 }
  }),
  // https://rusticandmain.com/products/the-harriet-oval-diamond-three-stone-engagement-ring-half-moon-side-stones
  make('Oval with half moons', (s) => {
    s.band = { ...s.band, profile: 'court', widthMm: 2.2, thicknessMm: 1.7, taper: 0.9, metal: 'yellow-gold-14k', headMetal: 'match' }
    s.stone = { ...s.stone, shape: 'oval', carat: 3.5, gem: 'lab-diamond', setting: 'prong-4' }
    s.accents.side = { ...s.accents.side, count: 1, shape: 'half-moon', gem: 'lab-diamond', ratio: ratioFor(3.5, 0.75), rotationDeg: 90, gapMm: 0.25 }
  }),
  // https://frankdarling.com/engagement-rings/the-nouveau-emerald/
  make('Emerald with trapezoids', (s) => {
    s.band = { ...s.band, profile: 'd-shape', widthMm: 2, metal: 'platinum', headMetal: 'match' }
    s.stone = { ...s.stone, shape: 'emerald', carat: 1.5, setting: 'prong-4', prongTip: 'claw', settingHeightMm: 2.2 }
    s.accents.side = { ...s.accents.side, count: 1, shape: 'trapezoid', ratio: 0.5, rotationDeg: 90, gapMm: 0.25, height: 0.85 }
  }),
  // https://frankdarling.com/engagement-rings/the-triple-bezel-rounds/
  make('Triple bezel rounds', (s) => {
    s.band = { ...s.band, profile: 'court', widthMm: 2, metal: 'yellow-gold-18k', headMetal: 'match' }
    s.stone = { ...s.stone, shape: 'round', carat: 1, setting: 'bezel', settingHeightMm: 2.5 }
    s.accents.side = { ...s.accents.side, count: 1, shape: 'match', ratio: 0.7, setting: 'bezel', gapMm: 0.2, height: 0.85 }
  }),
  // https://frankdarling.com/engagement-rings/e-ovewhbz3ps-lu/
  make('East-west half bezel with baguettes', (s) => {
    s.band = { ...s.band, profile: 'court', widthMm: 2, metal: 'yellow-gold-14k', headMetal: 'match' }
    s.stone = { ...s.stone, shape: 'oval', carat: 1.5, setting: 'half-bezel', rotationDeg: 90, settingHeightMm: 2.4, bezel: { ...s.stone.bezel, halfWalls: 'ends' } }
    s.accents.side = { ...s.accents.side, count: 1, shape: 'tapered-baguette', ratio: 0.5, rotationDeg: 90, setting: 'bezel', gapMm: 0.2, height: 0.9 }
  }),
  // https://shop.kenanddanadesign.com/pages/meghan-markle-engagement-ring (the Duchess of Sussex's ring)
  make('Cushion trilogy on pavé', (s) => {
    s.band = { ...s.band, profile: 'court', widthMm: 2, metal: 'yellow-gold-18k', headMetal: 'match' }
    s.stone = { ...s.stone, shape: 'cushion', carat: 3, setting: 'prong-4', prongTip: 'claw' }
    s.accents = { ...s.accents, style: 'pave', stoneMm: 1.1, coverageDeg: 80, side: { ...s.accents.side, count: 1, shape: 'round', ratio: ratioFor(3, 1), gapMm: 0.3 } }
  }),
  // https://www.bluenile.com/engagement-rings/design-your-own-ring/graduated-oval-diamond-engagement-ring-in-platinum-7-8-ct-tw-item-192956
  make('Graduated oval five stone', (s) => {
    s.band = { ...s.band, profile: 'court', widthMm: 2, metal: 'platinum', headMetal: 'match' }
    s.stone = { ...s.stone, shape: 'oval', carat: 1, setting: 'prong-4' }
    s.accents.side = { ...s.accents.side, count: 2, shape: 'match', ratio: 0.62, graduation: 0.78, gapMm: 0.25 }
  }),
  // https://www.bluenile.com/engagement-rings/design-your-own-ring/demi-cluster-round-diamond-engagement-ring-in-platinum-item-148796
  make('Seven stone cluster', (s) => {
    s.band = { ...s.band, profile: 'court', widthMm: 2, metal: 'platinum', headMetal: 'match' }
    s.stone = { ...s.stone, shape: 'round', carat: 1, setting: 'prong-6' }
    s.accents.side = { ...s.accents.side, count: 3, shape: 'round', ratio: 0.32, graduation: 0.85, gapMm: 0.15, height: 0.6 }
  }),
  // https://www.bluenile.com/wedding-rings/eternal-five-stone-diamond-ring-in-platinum-1-ct-tw-item-194492
  make('Five stone band', (s) => {
    s.band = { ...s.band, profile: 'court', widthMm: 2.2, metal: 'platinum', headMetal: 'match', taper: 1 }
    s.stone = { ...s.stone, shape: 'round', carat: 0.2, setting: 'prong-4', settingHeightMm: 1.2 }
    s.accents.side = { ...s.accents.side, count: 2, shape: 'match', ratio: 1, graduation: 1, gapMm: 0.2, height: 1 }
  }),
  // https://www.brilliantearth.com/Viridian-Toi-et-Moi-Diamond-Ring-Gold-BE1LCE500-16843262/
  make('Toi et moi with emerald pear', (s) => {
    s.band = { ...s.band, profile: 'court', widthMm: 1.8, metal: 'yellow-gold-18k', headMetal: 'match' }
    s.stone = { ...s.stone, shape: 'oval', carat: 1, setting: 'prong-4', rotationDeg: 20 }
    s.accents.side = { ...s.accents.side, layout: 'toi-et-moi', shape: 'pear', gem: 'emerald', ratio: 0.7, rotationDeg: 200 - 360, gapMm: 0.3, offsetMm: 2.5, height: 1 }
  }),
  // https://hiholden.com/products/the-bezel-toi-et-moi-pear-oval
  make('Bezel pear and oval pair', (s) => {
    s.band = { ...s.band, profile: 'court', widthMm: 2, metal: 'yellow-gold-14k', headMetal: 'match' }
    s.stone = { ...s.stone, shape: 'oval', carat: 1.5, gem: 'lab-diamond', setting: 'prong-4' }
    s.accents.side = { ...s.accents.side, layout: 'toi-et-moi', shape: 'pear', gem: 'lab-diamond', ratio: 1, rotationDeg: -180, setting: 'bezel', gapMm: 0.3, offsetMm: 3, height: 1 }
  }),
  // https://rusticandmain.com/products/the-soren-east-west-oval-diamond-solitaire-engagement-ring-modern-half-bezel-setting
  make('East-west half bezel oval', (s) => {
    s.band = { ...s.band, profile: 'court', widthMm: 2, thicknessMm: 1.8, metal: 'yellow-gold-14k', headMetal: 'match', taper: 1 }
    s.stone = { ...s.stone, shape: 'oval', carat: 1, gem: 'lab-diamond', setting: 'half-bezel', rotationDeg: 90, settingHeightMm: 2.4, bezel: { ...s.stone.bezel, halfWalls: 'ends', wallMm: 0.7 } }
  }),
  // https://frankdarling.com/engagement-rings/golden-bathtub-ew-oval/
  make('Chunky bathtub bezel', (s) => {
    s.band = { ...s.band, profile: 'court', widthMm: 2.6, thicknessMm: 2, metal: 'yellow-gold-18k', headMetal: 'match', taper: 1 }
    s.stone = { ...s.stone, shape: 'oval', carat: 1.5, setting: 'bezel', rotationDeg: 90, settingHeightMm: 1.6, bezel: { ...s.stone.bezel, wallMm: 1.4, lip: 0.6, edge: 'rounded' } }
  }),
  // https://hiholden.com/products/the-low-set-bezel-solitaire-round
  make('Low set bezel', (s) => {
    s.band = { ...s.band, profile: 'court', widthMm: 2, metal: 'yellow-gold-14k', headMetal: 'match' }
    s.stone = { ...s.stone, shape: 'round', carat: 1.5, setting: 'bezel', settingHeightMm: 1.3, bezel: { ...s.stone.bezel, wallMm: 0.6 } }
  }),
  // https://www.goodstoneinc.com/products/split-shank-milgrain-bezel-engagement-ring-with-oval-cut-diamond
  make('Milgrain bezel oval', (s) => {
    s.band = { ...s.band, profile: 'court', widthMm: 2.5, metal: 'white-gold-14k', headMetal: 'match', taper: 0.72 }
    s.stone = { ...s.stone, shape: 'oval', carat: 1.5, setting: 'bezel', settingHeightMm: 2, bezel: { ...s.stone.bezel, edge: 'milgrain', wallMm: 0.6 } }
  }),
  // https://jrdunn.com/products/two-tone-bezel-emerald-cut-engagement-ring-setting
  make('Two-tone bezel emerald', (s) => {
    s.band = { ...s.band, profile: 'court', widthMm: 2, metal: 'yellow-gold-18k', headMetal: 'white-gold-18k' }
    s.stone = { ...s.stone, shape: 'emerald', carat: 1.5, setting: 'bezel', settingHeightMm: 2.5, bezel: { ...s.stone.bezel, wallMm: 0.5 } }
  }),
  // https://www.catbirdnyc.com/diamond-tomboy-ring.html
  make('Tiny bezel tomboy', (s) => {
    s.band = { ...s.band, profile: 'flat', widthMm: 3.2, thicknessMm: 1.4, metal: 'yellow-gold-14k', headMetal: 'match', taper: 1 }
    s.stone = { ...s.stone, shape: 'round', carat: 0.09, setting: 'bezel', settingHeightMm: 1, bezel: { ...s.stone.bezel, wallMm: 0.4, lip: 0.1 } }
  }),
  // https://www.bluenile.com/wedding-rings/bezel-set-diamond-eternity-ring-in-14k-white-gold-1-ct-tw-item-147751
  make('Bezel eternity', (s) => {
    s.band = { ...s.band, profile: 'court', widthMm: 3, thicknessMm: 1.6, metal: 'white-gold-14k', headMetal: 'match', taper: 1 }
    s.stone = { ...s.stone, enabled: false }
    s.accents = { ...s.accents, style: 'eternity', meleeCut: 'round', stoneMm: 2.5, bezelSet: true }
  }),
  // https://www.bluenile.com/wedding-rings/bezel-emerald-diamond-eternity-ring-in-14k-yellow-gold-2-3-4-ct-tw-item-149213
  make('Emerald bezel eternity', (s) => {
    s.band = { ...s.band, profile: 'court', widthMm: 3.6, thicknessMm: 1.6, metal: 'yellow-gold-14k', headMetal: 'match', taper: 1 }
    s.stone = { ...s.stone, enabled: false }
    s.accents = { ...s.accents, style: 'eternity', meleeCut: 'emerald', stoneMm: 3, bezelSet: true }
  }),
  // https://www.etsy.com/market/bezel_set_diamond ("diamonds by the yard")
  make('Bezel stations', (s) => {
    s.band = { ...s.band, profile: 'half-round', widthMm: 1.4, thicknessMm: 1.3, metal: 'yellow-gold-14k', headMetal: 'match', taper: 1 }
    s.stone = { ...s.stone, enabled: false }
    s.accents = { ...s.accents, style: 'pave', meleeCut: 'round', stoneMm: 1.8, bezelSet: true, coverageDeg: 120, spacingMm: 5, rows: 1 }
  }),
  // https://www.bluenile.com/engagement-rings/design-your-own-ring/crown-pave-hidden-halo-diamond-engagement-ring-in-platinum-by-james-allen-item-315147
  make('Hidden halo oval', (s) => {
    s.band = { ...s.band, profile: 'court', widthMm: 1.8, metal: 'platinum', headMetal: 'match' }
    s.stone = { ...s.stone, shape: 'oval', carat: 1, setting: 'prong-4' }
    s.halo = { ...s.halo, enabled: true, style: 'hidden', stoneMm: 0.9 }
    s.accents = { ...s.accents, style: 'pave', stoneMm: 1.1, coverageDeg: 70 }
  }),
  // https://www.tiffany.com/engagement/engagement-rings/tiffany-soleste-cushion-cut-double-halo-engagement-ring-with-a-diamond-platinum-GRP10869/
  make('Double halo cushion', (s) => {
    s.band = { ...s.band, profile: 'court', widthMm: 2, metal: 'platinum', headMetal: 'match' }
    s.stone = { ...s.stone, shape: 'cushion', carat: 1, setting: 'prong-4' }
    s.halo = { ...s.halo, enabled: true, rows: 2, stoneMm: 0.9 }
    s.accents = { ...s.accents, style: 'pave', stoneMm: 1.2, coverageDeg: 175 }
  }),
  // https://www.brilliantearth.com/Channel-Set-Baguette-Diamond-Ring-(1-ct.-tw.)-White-Gold-BE2D17CB/
  make('Baguette channel band', (s) => {
    s.band = { ...s.band, profile: 'flat', widthMm: 3.7, thicknessMm: 1.8, metal: 'white-gold-14k', headMetal: 'match', taper: 1 }
    s.stone = { ...s.stone, enabled: false }
    s.accents = { ...s.accents, style: 'channel', meleeCut: 'baguette', stoneMm: 3, coverageDeg: 55 }
  }),
  // Wood rings. Inlay widths and positions follow the listing's description and photos where
  // the page gives no millimetres.
  // https://cirellijewelers.com/products/thorsten-narra-tungsten-wood-ring-with-polished-bevels-and-padauk-real-wood-inlay4-8mm-w1897-pdwi
  make('Padauk inlay tungsten', (s) => {
    s.band = { ...s.band, profile: 'flat', widthMm: 8, thicknessMm: 2.3, metal: 'tungsten', taper: 1, comfortFit: true, inlay: 'padauk', inlayWidth: 0.6 }
    s.stone = { ...s.stone, enabled: false }
  }),
  // https://foreveringsjewelry.com/products/whiskey-barrel-ring-men-wood-wedding-band-silver-tungsten-band-domed-beveled-wood-anniversary-gift-for-him-unique-ring-men-engagement
  make('Whiskey barrel lined tungsten', (s) => {
    s.band = { ...s.band, profile: 'd-shape', widthMm: 8, thicknessMm: 2.4, metal: 'tungsten', finish: 'brushed', taper: 1, comfortFit: true, liner: 'whiskey-barrel-oak' }
    s.stone = { ...s.stone, enabled: false }
  }),
  // https://foreveringsjewelry.com/products/8mm-wenge-wood-ring-hammered-tungsten-wedding-band-dark-wood-ring-black-matte-brushed-flat-hammer-comfort-fit
  make('Hammered black tungsten, wenge lined', (s) => {
    s.band = { ...s.band, profile: 'flat', widthMm: 8, thicknessMm: 2.4, metal: 'black-tungsten', finish: 'hammered', taper: 1, comfortFit: true, liner: 'wenge' }
    s.stone = { ...s.stone, enabled: false }
  }),
  // https://www.larsonjewelers.com/daring-off-set-koa-wood-inlaid-black-titanium-men-s-wedding-band-with-flat-brushed-finish-8mm
  make('Offset koa black titanium', (s) => {
    s.band = { ...s.band, profile: 'flat', widthMm: 8, thicknessMm: 2, metal: 'black-titanium', finish: 'brushed', taper: 1, comfortFit: true, inlay: 'koa', inlayWidth: 0.35, inlayOffset: 0.2 }
    s.stone = { ...s.stone, enabled: false }
  }),
  // https://jewelrybyjohan.com/en-ca/products/koa-wood-wedding-band-in-titanium-size-9-rs11352 — 2 mm titanium, 2 mm koa, 4 mm titanium.
  make('Koa stripe titanium', (s) => {
    s.band = { ...s.band, profile: 'flat', widthMm: 8, thicknessMm: 2, metal: 'titanium', taper: 1, comfortFit: true, inlay: 'koa', inlayWidth: 0.25, inlayOffset: -0.125 }
    s.stone = { ...s.stone, enabled: false }
  }),
  // https://www.justmensrings.com/products/jtg3239-tungsten-turquoise-and-koa-wood-inlay-ring
  make('Koa and turquoise tungsten', (s) => {
    s.band = {
      ...s.band, profile: 'flat', widthMm: 8, thicknessMm: 2.3, metal: 'tungsten', taper: 1, comfortFit: true,
      inlay: 'koa', inlayWidth: 0.45, inlayOffset: -0.1, inlay2: 'turquoise', inlay2Width: 0.25, inlay2Offset: 0.25,
    }
    s.stone = { ...s.stone, enabled: false }
  }),
  // https://www.happylaulea.com/collections/create-your-couples-ring/products/titanium-wedding-ring-with-hawaiian-koa-wood-and-opal-offset-inlay-8mm-width-flat-style
  make('Koa and opal offset titanium', (s) => {
    s.band = {
      ...s.band, profile: 'flat', widthMm: 8, thicknessMm: 2, metal: 'titanium', taper: 1, comfortFit: true,
      inlay: 'koa', inlayWidth: 0.4, inlayOffset: -0.15, inlay2: 'opal', inlay2Width: 0.15, inlay2Offset: 0.2,
    }
    s.stone = { ...s.stone, enabled: false }
  }),
  // https://acceptance.reach.dog/shop/peacefield-titanium/products/titanium-ring-with-koa-and-turquoise-pinstripe
  make('Koa with turquoise pinstripe', (s) => {
    s.band = {
      ...s.band, profile: 'flat', widthMm: 8, thicknessMm: 2, metal: 'titanium', taper: 1, comfortFit: true,
      inlay: 'koa', inlayWidth: 0.7, inlay2: 'turquoise', inlay2Width: 0.15, inlay2Offset: 0,
    }
    s.stone = { ...s.stone, enabled: false }
  }),
  // https://acceptance.reach.dog/shop/peacefield-titanium/products/koa-wood-ring-with-titanium-and-turquoise-inlay — bentwood koa over a titanium band.
  make('Koa bentwood, turquoise, titanium core', (s) => {
    s.band = { ...s.band, profile: 'court', widthMm: 8, thicknessMm: 2.4, metal: 'koa', taper: 1, comfortFit: true, liner: 'titanium', inlay: 'turquoise', inlayWidth: 0.3 }
    s.stone = { ...s.stone, enabled: false }
  }),
  // https://atelierdubonbouleau.patternbyetsy.com/listing/796569990/zebrawood-men-ring-from-canada
  make('Zebrawood bentwood', (s) => {
    s.band = { ...s.band, profile: 'court', widthMm: 6, thicknessMm: 2.2, metal: 'zebrawood', finish: 'satin', taper: 1, comfortFit: true }
    s.stone = { ...s.stone, enabled: false }
  }),
  // https://jewelrybyjohan.com/products/solitaire-diamond-ring-wood-2175 — Honduran rosewood in a 14k white gold band, four-prong diamond.
  make('Rosewood diamond solitaire', (s) => {
    s.band = { ...s.band, profile: 'flat', widthMm: 4, thicknessMm: 1.8, metal: 'white-gold-14k', headMetal: 'match', taper: 1, inlay: 'rosewood', inlayWidth: 0.5 }
    s.stone = { ...s.stone, shape: 'round', carat: 0.5, setting: 'prong-4' }
  }),
  // https://jewelrybyjohan.com/products/moissanite-solitaire-engagement-ring-2418 — 6 mm moissanite, 14k yellow gold, aspen inlay.
  make('Aspen moissanite solitaire', (s) => {
    s.band = { ...s.band, profile: 'flat', widthMm: 4, thicknessMm: 1.8, metal: 'yellow-gold-14k', headMetal: 'match', taper: 1, inlay: 'aspen', inlayWidth: 0.5 }
    s.stone = { ...s.stone, shape: 'round', gem: 'moissanite', carat: 0.72, setting: 'prong-4' }
  }),
]
