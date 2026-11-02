// Physically based materials for metals and gemstones.

import * as THREE from 'three'
import { CRUSHED_INFO, FINISH_INFO, GEM_INFO, METAL_INFO, gemColor } from './catalog'
import { isWood, type BandMaterial, type CrushedStone, type Finish, type Gem, type InlayMaterial, type Wood } from './spec'

/**
 * Material for any band surface: metal, wood, or crushed stone in resin. `widthMm` is the band
 * width its UVs span across (v 0..1) and `circumferenceMm` the length round it (u 0..1). With a
 * width, metal gets its finish's real surface maps. Without one (the head, whose UVs follow each
 * prong) metal stays a smooth surface of the same roughness.
 */
export function metalMaterial(material: InlayMaterial, finish: Finish, widthMm?: number, circumferenceMm = DEFAULT_CIRCUMFERENCE_MM) {
  if (material in CRUSHED_INFO) return crushedMaterial(material as CrushedStone)
  const metal = material as BandMaterial
  const info = METAL_INFO[metal]
  if (isWood(metal)) return woodMaterial(metal, info.color, info.grain!, info.roughness + FINISH_INFO[finish].roughnessAdd, finish === 'polished')
  const brushed = finish === 'brushed' || finish === 'satin'
  const roughness = Math.min(1, info.roughness + FINISH_INFO[finish].roughnessAdd)
  // The catalog colour stays the base colour: the maps only shape the surface, never tint it.
  const m = new THREE.MeshPhysicalMaterial({
    color: info.color,
    metalness: 1,
    roughness,
    anisotropy: brushed ? 0.7 : 0,
    envMapIntensity: 1.2,
  })
  if (widthMm !== undefined) withFinishMaps(m, finish, roughness, widthMm, circumferenceMm)
  return m
}

/** Band circumference when none is given, mm (about a US 7 band). */
const DEFAULT_CIRCUMFERENCE_MM = 55

/** How many times a finish's tile goes round and across a band: whole tiles round, so u = 0/1 meets. */
export const finishMapRepeat = (finish: Finish, widthMm: number, circumferenceMm: number): [number, number] => {
  const { tileMm } = FINISH_MAPS[finish]
  return [Math.max(1, Math.round(circumferenceMm / tileMm[0])), widthMm / tileMm[1]]
}

/**
 * Real surface detail per finish (see public/textures/metal/ATTRIBUTION.md): a normal and a
 * roughness map made from photos of real metal, brushed lines running round the band (along u).
 * `tileMm` is the size one tile covers on the metal; `normal` how strongly it bends the light.
 */
export const FINISH_MAPS: Record<Finish, { file: string; tileMm: [number, number]; normal: number }> = {
  // Faint hairline scratches every polished piece has.
  polished: { file: 'polished', tileMm: [9, 9], normal: 0.04 },
  // Satin is a finer, softer brush: the brushed photo at half the size.
  satin: { file: 'brushed', tileMm: [13.75, 3.5], normal: 0.12 },
  brushed: { file: 'brushed', tileMm: [27.5, 7], normal: 0.2 },
  // The dents are in the geometry (band.ts); between them a hammered ring is polished metal.
  hammered: { file: 'polished', tileMm: [9, 9], normal: 0.04 },
  matte: { file: 'matte', tileMm: [5, 5], normal: 0.12 },
  sandblasted: { file: 'sandblasted', tileMm: [4, 4], normal: 0.2 },
}
/** The roughness maps average this value; material roughness is divided by it. */
const ROUGHNESS_MAP_MEAN = 0.75

export const finishMapUrls = (finish: Finish) =>
  (['normal', 'roughness'] as const).map((kind) => `${import.meta.env.BASE_URL}textures/metal/${FINISH_MAPS[finish].file}-${kind}.webp`)

// Shared by every material with that finish, so never disposed with a material (each material
// uses clones, which share the uploaded image).
const finishMaps = new Map<string, Promise<THREE.Texture[]>>()
const loadedFinishMaps = new Map<string, THREE.Texture[]>()

function loadFinishMaps(finish: Finish) {
  const { file } = FINISH_MAPS[finish]
  let maps = finishMaps.get(file)
  if (!maps) {
    const loader = new THREE.TextureLoader()
    maps = Promise.all(finishMapUrls(finish).map((url) => loader.loadAsync(url))).then((textures) => {
      for (const t of textures) {
        t.wrapS = t.wrapT = THREE.RepeatWrapping
        t.anisotropy = 8
      }
      loadedFinishMaps.set(file, textures)
      return textures
    })
    // Offline before it was cached: forget the failure so a later design can try again.
    maps.catch(() => finishMaps.delete(file))
    finishMaps.set(file, maps)
  }
  return maps
}

/** Adds the finish's maps now if loaded, else when they arrive; until then the smooth look shows. */
function withFinishMaps(m: THREE.MeshPhysicalMaterial, finish: Finish, roughness: number, widthMm: number, circumferenceMm: number) {
  const { file, normal } = FINISH_MAPS[finish]
  let disposed = false
  const apply = ([normalMap, roughnessMap]: THREE.Texture[]) => {
    if (disposed) return
    const repeat = new THREE.Vector2(...finishMapRepeat(finish, widthMm, circumferenceMm))
    m.normalMap = normalMap.clone()
    m.roughnessMap = roughnessMap.clone()
    m.normalMap.repeat.copy(repeat)
    m.roughnessMap.repeat.copy(repeat)
    m.normalScale.setScalar(normal)
    m.roughness = Math.min(1, roughness / ROUGHNESS_MAP_MEAN)
    m.needsUpdate = true
  }
  m.addEventListener('dispose', () => {
    disposed = true
    m.normalMap?.dispose()
    m.roughnessMap?.dispose()
  })
  const loaded = loadedFinishMaps.get(file)
  if (loaded) apply(loaded)
  else loadFinishMaps(finish).then(apply, () => {})
}

/** Photo of each wood's face grain, grain along u (see public/textures/wood/ATTRIBUTION.md). */
export const woodTextureUrl = (wood: Wood) => `${import.meta.env.BASE_URL}textures/wood/${wood}.webp`

// Shared by every material of that wood, so never disposed with a material.
const woodPhotos = new Map<Wood, Promise<THREE.Texture>>()
const loadedWoodPhotos = new Map<Wood, THREE.Texture>()

function woodPhoto(wood: Wood) {
  let photo = woodPhotos.get(wood)
  if (!photo) {
    photo = new THREE.TextureLoader().loadAsync(woodTextureUrl(wood)).then((map) => {
      map.colorSpace = THREE.SRGBColorSpace
      map.wrapS = THREE.RepeatWrapping
      // The strip is 4:1 and the band about 9:1 (55 mm round, ~6 mm wide): twice round keeps
      // the grain near its true proportions.
      map.repeat.x = 2
      map.anisotropy = 8
      loadedWoodPhotos.set(wood, map)
      return map
    })
    // Offline before it was cached: forget the failure so a later design can try again.
    photo.catch(() => woodPhotos.delete(wood))
    woodPhotos.set(wood, photo)
  }
  return photo
}

/**
 * Oiled or lacquered wood: a real photo of the species. Until it has loaded (or if it cannot),
 * a drawn stand-in of the same colours shows instead.
 */
function woodMaterial(wood: Wood, color: string, grain: string, roughness: number, lacquered: boolean) {
  const material = new THREE.MeshPhysicalMaterial({
    map: loadedWoodPhotos.get(wood),
    metalness: 0,
    roughness: Math.min(1, roughness),
    clearcoat: lacquered ? 1 : 0,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1,
  })
  if (material.map) return material
  const drawn = drawnWood(color, grain)
  material.map = drawn
  let disposed = false
  material.addEventListener('dispose', () => {
    disposed = true
    drawn.dispose()
  })
  woodPhoto(wood).then(
    (map) => {
      if (disposed) return
      material.map = map
      material.needsUpdate = true
      drawn.dispose()
    },
    () => {},
  )
  return material
}

/**
 * Stand-in grain: growth rings as stripes across the band's width (v) that wander a little
 * along the way round (u).
 */
function drawnWood(color: string, grain: string) {
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
  return map
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
