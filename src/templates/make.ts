import { DEFAULT_SPEC, type RingSpec } from '../ring/spec'

/** A template: the default design with `patch` applied. */
export const make = (name: string, patch: (s: RingSpec) => void): RingSpec => {
  const s: RingSpec = structuredClone(DEFAULT_SPEC)
  s.name = name
  patch(s)
  return s
}
