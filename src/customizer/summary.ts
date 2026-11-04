import i18n from '../i18n'
import { nearestSize, type SizeSystem } from '../ring/sizes'
import type { RingSpec } from '../ring/spec'
import { num } from '../i18n/number'

/**
 * Languages whose gem and cut names keep their capitals inside a sentence: German and Luxembourgish capitalise
 * nouns, and Cherokee is written in capital syllabary (its lowercase letters are rare in fonts and in use).
 */
const KEEPS_CASE = new Set(['de', 'lb', 'chr'])
/** A name as it reads mid-sentence, e.g. "Oval" → "oval"; Turkish "I" → "ı" through the language's own rules. */
const inSentence = (name: string) => {
  const lng = i18n.resolvedLanguage ?? 'en'
  return KEEPS_CASE.has(lng) ? name : name.toLocaleLowerCase(lng)
}

/** One-line description of a design, e.g. "1.00 ct oval diamond · Platinum · US / CA 6". */
export function summary(spec: RingSpec, system: SizeSystem) {
  const t = i18n.t
  const size = `${t(`sizeSystem.${system}`)} ${nearestSize(system, spec.innerDiameterMm).label}`
  const stone = spec.stone.enabled
    ? t('summary.stone', {
        carat: num(spec.stone.carat, 2),
        shape: inSentence(t(`shape.${spec.stone.shape}`)),
        gem: inSentence(t(`gem.${spec.stone.gem}`)),
      })
    : t('summary.band', { width: num(spec.band.widthMm, 1) })
  return `${stone} · ${t(`metal.${spec.band.metal}`)} · ${size}`
}
