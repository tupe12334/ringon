// Physically based materials for metals and gemstones.

import * as THREE from 'three'
import { FINISH_INFO, GEM_INFO, METAL_INFO, gemColor } from './catalog'
import type { Gem, Metal, RingSpec } from './spec'

export function metalMaterial(metal: Metal, finish: RingSpec['band']['finish']) {
  const info = METAL_INFO[metal]
  const brushed = finish === 'brushed' || finish === 'satin'
  return new THREE.MeshPhysicalMaterial({
    color: info.color,
    metalness: 1,
    roughness: Math.min(1, info.roughness + FINISH_INFO[finish].roughnessAdd),
    anisotropy: brushed ? 0.7 : 0,
    envMapIntensity: 1.2,
  })
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
