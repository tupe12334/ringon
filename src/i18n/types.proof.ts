// Compile-time proof of the i18n types. Every line under @ts-expect-error must fail to type-check;
// if one ever compiles, `tsc -b` fails with "Unused '@ts-expect-error' directive". Never imported at runtime.

import i18n from '.'
import type { Translation } from './en'

type Is<T extends true> = T
type Not<T extends boolean> = T extends true ? false : true

export function keysAndParams() {
  // @ts-expect-error a key that does not exist
  i18n.t('no.such.key')
  // @ts-expect-error defaultValue cannot hide a missing key
  i18n.t('no.such.key', { defaultValue: 'x' })
  // @ts-expect-error a placeholder param with the wrong name
  i18n.t('mm', { w: '2.0' })
  // @ts-expect-error a group of options is not a string
  const label: string = i18n.t('metal')
  return label
}

export type Proofs = [
  // A language must keep every {{placeholder}} of the English text…
  Is<'{{v}} mm' extends Translation['mm'] ? true : false>,
  Is<Not<'mm' extends Translation['mm'] ? true : false>>,
  // …in any order, with any words around them.
  Is<'{{gem}} {{shape}} {{carat}} ct' extends Translation['summary']['stone'] ? true : false>,
  Is<Not<'{{gem}} {{carat}} ct' extends Translation['summary']['stone'] ? true : false>>,
  // A language cannot drop a section or a key.
  Is<Not<Omit<Translation, 'crash'> extends Translation ? true : false>>,
  Is<Not<Omit<Translation['crash'], 'reload'> extends Translation['crash'] ? true : false>>,
  // Plurals: "other" is required, the language's other CLDR categories are optional.
  Is<Not<Omit<Translation['templates'], 'imported_other'> extends Translation['templates'] ? true : false>>,
  Is<Omit<Translation['templates'], 'imported_one' | 'imported_two' | 'imported_few' | 'imported_many' | 'imported_zero'> extends Translation['templates'] ? true : false>,
]
