import { describe, expect, it } from 'vitest'
import { FINISH_MAPS, finishMapRepeat, finishMapUrls } from './materials'
import { FINISHES } from './spec'

describe('metal finish maps', () => {
  const files = Object.keys(import.meta.glob('/public/textures/metal/*.webp'))
  const attribution = Object.values(
    import.meta.glob<string>('/public/textures/metal/ATTRIBUTION.md', { query: '?raw', import: 'default', eager: true }),
  )[0]
  const used = new Set(FINISHES.flatMap((f) => finishMapUrls(f).map((url) => url.replace(import.meta.env.BASE_URL, '/public/'))))

  it.each(FINISHES)('%s has a normal and a roughness map, with their source credited', (finish) => {
    for (const url of finishMapUrls(finish)) {
      const file = url.replace(import.meta.env.BASE_URL, '/public/')
      expect(files).toContain(file)
      expect(attribution).toContain(`\`${file.split('/').pop()}\``)
    }
  })

  it('ships no map the designer does not use', () => {
    expect(files.toSorted()).toEqual([...used].toSorted())
  })
})

describe('finish map repeat', () => {
  it('keeps the brushed tile near its real size on small and large rings', () => {
    for (const circumference of [44, 55, 70, 80]) {
      const [round] = finishMapRepeat('brushed', 6, circumference)
      expect(Math.abs(circumference / round - FINISH_MAPS.brushed.tileMm[0])).toBeLessThan(FINISH_MAPS.brushed.tileMm[0] / 2)
    }
  })

  it('goes round in whole tiles, at least once', () => {
    expect(Number.isInteger(finishMapRepeat('matte', 6, 52)[0])).toBe(true)
    expect(finishMapRepeat('brushed', 6, 10)[0]).toBe(1)
  })
})
