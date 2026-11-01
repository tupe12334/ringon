// Physically based materials for metals and gemstones.

import * as THREE from 'three'
import { CRUSHED_INFO, FINISH_INFO, GEM_INFO, METAL_INFO, gemColor } from './catalog'
import { isWood, type BandMaterial, type CrushedStone, type Gem, type InlayMaterial, type RingSpec } from './spec'

/** Material for any band surface: metal, wood, or crushed stone in resin. */
export function metalMaterial(material: InlayMaterial, finish: RingSpec['band']['finish']) {
  if (material in CRUSHED_INFO) return crushedMaterial(material as CrushedStone)
  const metal = material as BandMaterial
  const info = METAL_INFO[metal]
  if (isWood(metal)) return woodMaterial(info.color, info.grain!, info.roughness + FINISH_INFO[finish].roughnessAdd, finish === 'polished')
  const brushed = finish === 'brushed' || finish === 'satin'
  return new THREE.MeshPhysicalMaterial({
    color: info.color,
    metalness: 1,
    roughness: Math.min(1, info.roughness + FINISH_INFO[finish].roughnessAdd),
    anisotropy: brushed ? 0.7 : 0,
    envMapIntensity: 1.2,
  })
}

/**
 * Oiled or lacquered wood. Grain runs around the band (the band's u), so growth rings show as
 * stripes across its width (v) that wander a little along the way.
 */
function woodMaterial(color: string, grain: string, roughness: number, lacquered: boolean) {
  const w = 512
  const h = 128
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(w, h)
  const a = new THREE.Color(color)
  const b = new THREE.Color(grain)
  const c = new THREE.Color()
  const rgb = { r: 0, g: 0, b: 0 }
  for (let x = 0; x < w; x++) {
    const u = (x / w) * Math.PI * 2
    // Whole periods in u so the seam at u = 0/1 matches.
    const wander = 0.6 * Math.sin(u * 2 + 1) + 0.3 * Math.sin(u * 5 + 2) + 0.15 * Math.sin(u * 11)
    for (let y = 0; y < h; y++) {
      const ring = Math.sin(((y / h) * 7 + wander) * Math.PI * 2)
      const fibre = 0.5 + 0.5 * Math.sin(y * 1.7 + Math.sin(u * 37) * 2)
      c.copy(a).lerp(b, Math.max(0, ring) ** 3 * 0.85 + fibre * 0.1)
      // The canvas holds sRGB; THREE.Color works in linear.
      c.getRGB(rgb, THREE.SRGBColorSpace)
      const i = (y * w + x) * 4
      img.data[i] = rgb.r * 255
      img.data[i + 1] = rgb.g * 255
      img.data[i + 2] = rgb.b * 255
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.SRGBColorSpace
  map.wrapS = THREE.RepeatWrapping
  map.anisotropy = 8
  return new THREE.MeshPhysicalMaterial({
    map,
    metalness: 0,
    roughness: Math.min(1, roughness),
    clearcoat: lacquered ? 1 : 0,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1,
  })
}

/** Stone fragments set in resin and polished flush: random chips over a dark resin ground. */
function crushedMaterial(stone: CrushedStone) {
  const { fragments, resin } = CRUSHED_INFO[stone]
  const w = 2048
  const h = 256
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = resin
  ctx.fillRect(0, 0, w, h)
  // ponytail: fixed-seed LCG so a design looks the same every time it is opened.
  let seed = 7
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
  for (let k = 0; k < 2600; k++) {
    const x = rand() * w
    const y = rand() * h
    const r = 6 + rand() * 18
    ctx.fillStyle = fragments[Math.floor(rand() * fragments.length)]
    const corners = 4 + Math.floor(rand() * 3)
    const pts = Array.from({ length: corners }, (_, c) => {
      const a = (c / corners) * Math.PI * 2 + rand() * 0.8
      const rr = r * (0.6 + rand() * 0.5)
      return [x + Math.cos(a) * rr, y + Math.sin(a) * rr]
    })
    // Chips near the u seam are drawn on both sides of it, so the texture wraps without a cut.
    for (const dx of x < 40 ? [0, w] : x > w - 40 ? [0, -w] : [0]) {
      ctx.beginPath()
      for (const [px, py] of pts) ctx.lineTo(px + dx, py)
      ctx.fill()
    }
  }
  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.SRGBColorSpace
  map.wrapS = THREE.RepeatWrapping
  map.anisotropy = 8
  return new THREE.MeshPhysicalMaterial({ map, metalness: 0, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1 })
}

export function gemMaterial(gem: Gem, customColor: string, sizeMm: number) {
  const info = GEM_INFO[gem]
  const color = new THREE.Color(gemColor(gem, customColor))
  if (info.opaque)
    return new THREE.MeshPhysicalMaterial({ color, metalness: 0.2, roughness: 0.05, clearcoat: 1, envMapIntensity: 2 })
  const colourless = info.color === '#ffffff' || gem === 'moissanite'
  return new THREE.MeshPhysicalMaterial({
    color: colourless ? '#ffffff' : color,
    metalness: 0,
    roughness: 0,
    transmission: 1,
    thickness: sizeMm * 0.6,
    ior: info.ior,
    dispersion: info.dispersion * 60,
    attenuationColor: colourless ? new THREE.Color('#ffffff') : color,
    attenuationDistance: colourless ? Infinity : sizeMm * 0.6,
    specularIntensity: 1,
    envMapIntensity: 2.2,
  })
}
