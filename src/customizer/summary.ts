import i18n from '../i18n'
import { nearestSize, type SizeSystem } from '../ring/sizes'
import type { RingSpec } from '../ring/spec'
import { num } from '../i18n/number'

/** One-line description of a design, e.g. "1.00 ct oval diamond · Platinum · US / CA 6". */
export function summary(spec: RingSpec, system: SizeSystem) {
  const t = i18n.t
  const size = `${t(`sizeSystem.${system}`)} ${nearestSize(system, spec.innerDiameterMm).label}`
  const stone = spec.stone.enabled
    ? t('summary.stone', {
        carat: num(spec.stone.carat, 2),
        shape: t(`shape.${spec.stone.shape}`).toLowerCase(),
        gem: t(`gem.${spec.stone.gem}`).toLowerCase(),
      })
    : t('summary.band', { width: num(spec.band.widthMm, 1) })
  return `${stone} · ${t(`metal.${spec.band.metal}`)} · ${size}`
}
