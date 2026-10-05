import i18n from '../i18n'
import { nearestSize, type SizeSystem } from '../ring/sizes'
import type { RingSpec } from '../ring/spec'

/** One-line description of a design, e.g. "1.00 ct oval diamond · Platinum · US / CA 6". */
export function summary(spec: RingSpec, system: SizeSystem) {
  const t = i18n.t
  const size = `${t(`sizeSystem.${system}`)} ${nearestSize(system, spec.innerDiameterMm).label}`
  const stone = spec.stone.enabled
    ? t('summary.stone', {
        carat: spec.stone.carat.toFixed(2),
        shape: t(`shape.${spec.stone.shape}`).toLowerCase(),
        gem: t(`gem.${spec.stone.gem}`).toLowerCase(),
      })
    : t('summary.band', { width: spec.band.widthMm.toFixed(1) })
  return `${stone} · ${t(`metal.${spec.band.metal}`)} · ${size}`
}
