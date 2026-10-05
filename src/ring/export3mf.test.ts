import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { ringTo3mf } from './export3mf'
import { DEFAULT_SPEC } from './spec'

describe('3MF export', () => {
  it('packages band, head and stones as closed, coloured meshes in mm', () => {
    const files = unzipSync(ringTo3mf(DEFAULT_SPEC))
    expect(Object.keys(files).sort()).toEqual(['3D/3dmodel.model', '[Content_Types].xml', '_rels/.rels'])
    const model = strFromU8(files['3D/3dmodel.model'])
    expect(model).toContain('unit="millimeter"')
    const objects = [...model.matchAll(/<object id="(\d+)" name="([^"]+)"[^>]*>(.*?)<\/object>/g)]
    const names = objects.map((o) => o[2])
    expect(names.slice(0, 2)).toEqual(['Band', 'Head'])
    expect(names.some((n) => n.startsWith('Stone'))).toBe(true)
    expect(model.match(/<item /g)).toHaveLength(objects.length)
    expect(model.match(/displaycolor="#[0-9A-F]{6}"/g)).toHaveLength(objects.length)

    // Printable: the band is watertight, every edge shared by exactly two triangles.
    const edges = new Map<string, number>()
    for (const [, a, b, c] of objects[0][3].matchAll(/v1="(\d+)" v2="(\d+)" v3="(\d+)"/g))
      for (const [p, q] of [[a, b], [b, c], [c, a]]) {
        const k = +p < +q ? `${p}-${q}` : `${q}-${p}`
        edges.set(k, (edges.get(k) ?? 0) + 1)
      }
    expect(edges.size).toBeGreaterThan(100)
    expect([...edges.values()].every((n) => n === 2)).toBe(true)
  })
})
