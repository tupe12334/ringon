import { GEM_INFO, METAL_INFO, SHAPE_INFO } from '../ring/catalog'
import { nearestSize, SIZE_SYSTEMS, type SizeSystem } from '../ring/sizes'
import type { RingSpec } from '../ring/spec'

/** One-line description of a design, e.g. "1.00 ct oval diamond · Platinum · US / CA 6". */
export function summary(spec: RingSpec, system: SizeSystem) {
  const size = `${SIZE_SYSTEMS.find((s) => s.id === system)?.label} ${nearestSize(system, spec.innerDiameterMm).label}`
  const metal = METAL_INFO[spec.band.metal].label
  const stone = spec.stone.enabled
    ? `${spec.stone.carat.toFixed(2)} ct ${SHAPE_INFO[spec.stone.shape].label.toLowerCase()} ${GEM_INFO[spec.stone.gem].label.toLowerCase()}`
    : `${spec.band.widthMm.toFixed(1)} mm band`
  return `${stone} · ${metal} · ${size}`
}
