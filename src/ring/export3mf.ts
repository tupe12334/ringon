// 3MF export for 3D printing / casting: band, head and stones as separate coloured objects, in mm.
// ponytail: the engraving is a texture, not geometry, so it isn't in the file.

import { strToU8, zipSync } from 'fflate'
import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { METAL_INFO, gemColor } from './catalog'
import { buildRing } from './geometry'
import type { RingSpec } from './spec'

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>`

const RELS = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`

const esc = (s: string) => s.replace(/[<>&"]/g, (c) => `&#${c.charCodeAt(0)};`)

/** Finger along +Y in the app; in a slicer +Z is up, so this lays the ring flat on the bed. */
const LAY_FLAT = new THREE.Matrix4().makeRotationX(Math.PI / 2)

/** Shared vertices (welded), so slicers see a closed mesh rather than loose triangles. */
function meshXml(geometry: THREE.BufferGeometry) {
  const plain = new THREE.BufferGeometry().setAttribute('position', geometry.getAttribute('position').clone())
  if (geometry.index) plain.setIndex(geometry.index)
  plain.applyMatrix4(LAY_FLAT)
  const g = mergeVertices(plain, 1e-4)
  const p = g.getAttribute('position')
  const idx = g.index!
  const verts: string[] = []
  for (let i = 0; i < p.count; i++) verts.push(`<vertex x="${p.getX(i)}" y="${p.getY(i)}" z="${p.getZ(i)}"/>`)
  const tris: string[] = []
  for (let i = 0; i < idx.count; i += 3) {
    const [a, b, c] = [idx.getX(i), idx.getX(i + 1), idx.getX(i + 2)]
    if (a !== b && b !== c && a !== c) tris.push(`<triangle v1="${a}" v2="${b}" v3="${c}"/>`)
  }
  g.dispose()
  return `<mesh><vertices>${verts.join('')}</vertices><triangles>${tris.join('')}</triangles></mesh>`
}

export function ringTo3mf(spec: RingSpec): Uint8Array<ArrayBuffer> {
  const parts = buildRing(spec)
  const headMetal = spec.band.headMetal === 'match' ? spec.band.metal : spec.band.headMetal
  const items: { name: string; color: string; geometry: THREE.BufferGeometry }[] = [
    { name: 'Band', color: METAL_INFO[spec.band.metal].color, geometry: parts.band },
  ]
  if (parts.head) items.push({ name: 'Head', color: METAL_INFO[headMetal].color, geometry: parts.head })
  for (const s of parts.stones)
    s.matrices.forEach((m, i) =>
      items.push({ name: `Stone ${s.key} ${i + 1}`, color: gemColor(s.gem, s.customColor), geometry: s.geometry.clone().applyMatrix4(m) }),
    )

  // 3MF colours are #RRGGBB(AA) in sRGB, which is how the catalog stores them.
  const materials = items.map((it) => `<base name="${esc(it.name)}" displaycolor="#${new THREE.Color(it.color).getHexString().toUpperCase()}"/>`)
  const objects = items.map(
    (it, i) => `<object id="${i + 2}" name="${esc(it.name)}" type="model" pid="1" pindex="${i}">${meshXml(it.geometry)}</object>`,
  )
  const build = items.map((_, i) => `<item objectid="${i + 2}"/>`)
  const model = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
<metadata name="Title">${esc(spec.name || 'Ring')}</metadata>
<metadata name="Application">Ringon</metadata>
<resources><basematerials id="1">${materials.join('')}</basematerials>${objects.join('')}</resources>
<build>${build.join('')}</build>
</model>`

  parts.band.dispose()
  parts.head?.dispose()
  parts.stones.forEach((s) => s.geometry.dispose())
  items.slice(parts.head ? 2 : 1).forEach((it) => it.geometry.dispose())

  // fflate always allocates a plain ArrayBuffer; Blob wants that spelled out.
  return zipSync({
    '[Content_Types].xml': strToU8(CONTENT_TYPES),
    '_rels/.rels': strToU8(RELS),
    '3D/3dmodel.model': strToU8(model),
  }) as Uint8Array<ArrayBuffer>
}
