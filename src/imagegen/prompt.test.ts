import { describe, expect, it } from 'vitest'
import { make } from '../templates/make'
import { buildPrompt, type PhotoOptions } from './prompt'

const opts: PhotoOptions = { hand: 'left', finger: 'ring', shot: 'close-up', handPhoto: false, notes: '' }

const woodBand = make('wood', (s) => {
  s.stone.enabled = false
  s.band.metal = 'titanium'
  s.band.widthMm = 8
  s.band.inlay = 'walnut'
  s.band.inlayWidth = 0.5
  s.band.liner = 'yellow-gold-18k'
})

const haloRing = make('halo', (s) => {
  s.stone.carat = 1.5
  s.stone.shape = 'oval'
  s.halo.enabled = true
  s.accents.side.count = 2
  s.engraving.text = 'forever'
})

describe('image prompt', () => {
  it('describes a wood inlay band with a liner, and no stone', () => {
    const p = buildPrompt(woodBand, { ...opts, hand: 'right', finger: 'index' })
    expect(p).toContain('on the index finger of the right hand')
    expect(p).toContain('8.0 mm wide')
    expect(p).toContain('titanium')
    expect(p).toContain('Inlay: a 4.0 mm wide strip of walnut wood set flush into the outside of the band, centred.')
    expect(p).toContain('18k yellow gold liner')
    expect(p).not.toMatch(/Centre stone|stone faces up/)
  })

  it('describes a centre stone with a halo, side stones and engraving', () => {
    const p = buildPrompt(haloRing, opts)
    expect(p).toMatch(/Centre stone: 1\.50 ct oval .*diamond/i)
    expect(p).toMatch(/Single halo of 1\.2 mm diamonds/i)
    expect(p).toMatch(/Side stones: 2 on each side of the centre stone/)
    expect(p).toContain('Engraved inside the band: "forever".')
    expect(p).toContain('The stone faces up on the back of the finger.')
    expect(p).toMatch(/Ring size US \d+\.\d/)
  })

  it('a product shot shows the ring alone: no hand, no finger', () => {
    const p = buildPrompt(haloRing, { ...opts, shot: 'product', handPhoto: true })
    expect(p).toContain('product photo of this ring alone')
    expect(p).not.toMatch(/hand|finger/)
    expect(p).not.toContain('Reference image 2')
  })

  it('a hand photo adds reference image 2, on the chosen hand', () => {
    expect(buildPrompt(haloRing, opts)).not.toContain('Reference image 2')
    const p = buildPrompt(haloRing, { ...opts, hand: 'right', handPhoto: true })
    expect(p).toContain("Reference image 2 is the wearer's own right hand")
  })

  it('says "thumb", not "thumb finger", and appends the notes', () => {
    const p = buildPrompt(haloRing, { ...opts, finger: 'thumb', notes: '  red nail polish ' })
    expect(p).toContain('on the thumb of the left hand')
    expect(p.split('\n').at(-1)).toBe('red nail polish')
  })
})
