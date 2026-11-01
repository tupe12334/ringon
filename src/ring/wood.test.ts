import { describe, expect, it } from 'vitest'
import { woodTextureUrl } from './materials'
import { WOODS } from './spec'

describe('wood textures', () => {
  const files = Object.keys(import.meta.glob('/public/textures/wood/*.webp'))
  const attribution = Object.values(
    import.meta.glob<string>('/public/textures/wood/ATTRIBUTION.md', { query: '?raw', import: 'default', eager: true }),
  )[0]

  it.each(WOODS)('%s has a photo with its source credited', (wood) => {
    expect(files).toContain(woodTextureUrl(wood).replace(import.meta.env.BASE_URL, '/public/'))
    expect(attribution).toContain(`\`${wood}.webp\``)
  })

  it('ships no photo the designer does not use', () => {
    expect(files).toHaveLength(WOODS.length)
  })
})
