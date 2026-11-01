// A text prompt for image models that describes the design on screen, in English (image models
// follow English best), plus how the photo should look: which hand, which finger, what shot.

import { en } from '../i18n/en'
import { headMetalOf, type Gem, type RingSpec } from '../ring/spec'
import { diameterToUs } from '../ring/sizes'

export const HANDS = ['left', 'right'] as const
export type Hand = (typeof HANDS)[number]

export const FINGERS = ['thumb', 'index', 'middle', 'ring', 'pinky'] as const
export type Finger = (typeof FINGERS)[number]

/** close-up: the hand fills the frame; lifestyle: a natural scene; product: the ring alone. */
export const SHOTS = ['close-up', 'lifestyle', 'product'] as const
export type Shot = (typeof SHOTS)[number]

export interface PhotoOptions {
  hand: Hand
  finger: Finger
  shot: Shot
  /** A photo of the wearer's hand is sent along (reference image 2). */
  handPhoto: boolean
  /** Free text the user adds, e.g. "evening light, red nail polish". */
  notes: string
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
const material = (m: string) => lower(en.metal[m as keyof typeof en.metal])
const gem = (g: Gem, customColor: string) => (g === 'custom' ? `${customColor} coloured gemstone` : lower(en.gem[g]))
const mm = (v: number) => `${v.toFixed(1)} mm`

/** Where a strip sits across the band. */
const place = (offset: number, widthMm: number) =>
  Math.abs(offset) < 0.01 ? 'centred' : `${mm(Math.abs(offset) * widthMm)} off centre towards one edge`

/** The ring alone, one sentence per part. */
export function describeRing(spec: RingSpec): string[] {
  const b = spec.band
  const lines = [
    `Band: ${mm(b.widthMm)} wide, ${mm(b.thicknessMm)} thick, ${lower(en.profile[b.profile])} profile, ${material(b.metal)}, ${lower(en.finish[b.finish])} finish${b.taper < 0.99 ? ', narrower at the bottom of the band' : ''}.`,
  ]
  if (b.inlay !== 'none') {
    lines.push(`Inlay: a ${mm(b.inlayWidth * b.widthMm)} wide strip of ${material(b.inlay)} set flush into the outside of the band, ${place(b.inlayOffset, b.widthMm)}.`)
    if (b.inlay2 !== 'none')
      lines.push(`Second inlay: a ${mm(b.inlay2Width * b.widthMm)} wide strip of ${material(b.inlay2)}, ${place(b.inlay2Offset, b.widthMm)}.`)
  }
  if (b.liner !== 'none') lines.push(`Inside the band: a ${material(b.liner)} liner (sleeve), visible as a thin layer at the band edges.`)

  const s = spec.stone
  if (s.enabled) {
    const setting =
      s.setting === 'prong-4' || s.setting === 'prong-6'
        ? `${lower(en.setting[s.setting])} with ${lower(en.prongTip[s.prongTip])} tips`
        : lower(en.setting[s.setting])
    lines.push(
      `Centre stone: ${s.carat.toFixed(2)} ct ${lower(en.shape[s.shape])} ${gem(s.gem, s.customColor)}, ${setting} setting in ${material(headMetalOf(b))}${s.rotationDeg >= 45 && s.rotationDeg <= 135 ? ', set east–west across the finger' : ''}.`,
    )
    if (spec.halo.enabled)
      lines.push(`${spec.halo.rows === 2 ? 'Double' : 'Single'} ${spec.halo.style === 'hidden' ? 'hidden halo (under the stone, seen from the side)' : 'halo'} of ${mm(spec.halo.stoneMm)} ${gem(spec.halo.gem, spec.halo.customColor)}s.`)
    const side = spec.accents.side
    if (side.layout === 'toi-et-moi') lines.push('Toi et moi: a second stone of the same kind sits beside the centre stone.')
    else if (side.count > 0) {
      const shape = side.shape === 'match' ? en.shape[s.shape] : en.shape[side.shape]
      lines.push(`Side stones: ${side.count} on each side of the centre stone, ${lower(shape)} ${gem(side.gem, side.customColor)}s, ${lower(en.setting[side.setting])} set.`)
    }
  }
  const a = spec.accents
  if (a.style !== 'none')
    lines.push(`Band stones: ${lower(en.accent[a.style])}${a.style === 'pave' || a.style === 'channel' ? '-set' : ''} ${mm(a.stoneMm)} ${gem(a.gem, a.customColor)}s${a.bezelSet ? ', each in its own bezel' : ''}.`)
  if (spec.engraving.text.trim()) lines.push(`Engraved inside the band: "${spec.engraving.text.trim()}".`)
  const us = diameterToUs(spec.innerDiameterMm)
  lines.push(`Ring size US ${us.toFixed(1)} (${mm(spec.innerDiameterMm)} inside diameter): keep the ring true to scale.`)
  return lines
}

/** The full prompt. Reference image 1 is always the ring; image 2 (optional) the wearer's hand. */
export function buildPrompt(spec: RingSpec, o: PhotoOptions): string {
  const where = `on the ${o.finger === 'thumb' ? 'thumb' : `${o.finger} finger`} of the ${o.hand} hand`
  const shot =
    o.shot === 'product'
      ? 'A professional jewellery product photo of this ring alone, on a neutral background, soft studio light.'
      : o.shot === 'lifestyle'
        ? `A natural lifestyle photo of a person wearing this ring ${where}, in a real-world setting.`
        : `A photorealistic close-up photo of a hand wearing this ring ${where}, the back of the hand towards the camera.`
  const refs = [
    'Reference image 1 shows the exact ring design: reproduce its shape, materials, colours and stones faithfully; do not invent extra stones or details.',
    o.handPhoto && o.shot !== 'product'
      ? `Reference image 2 is the wearer's own ${o.hand} hand: keep the hand, skin, nails, pose, background and lighting as they are, and add the ring ${where} as if it was photographed there.`
      : '',
  ]
  return [
    shot,
    ...refs.filter(Boolean),
    ...describeRing(spec),
    o.shot === 'product'
      ? ''
      : `${spec.stone.enabled ? 'The stone faces up on the back of the finger. ' : ''}Natural fit, realistic contact shadows and reflections; no other rings or jewellery.`,
    o.notes.trim(),
  ]
    .filter(Boolean)
    .join('\n')
}
