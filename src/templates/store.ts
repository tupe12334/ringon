// App state: the design being edited and the user's saved templates (kept in localStorage).

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SizeSystem } from '../ring/sizes'
import { DEFAULT_SPEC, sanitizeSpec, type RingSpec } from '../ring/spec'
import { BUILTIN_TEMPLATES } from './builtin'

export interface UserTemplate {
  id: string
  spec: RingSpec
  savedAt: number
}

interface State {
  spec: RingSpec
  sizeSystem: SizeSystem
  templates: UserTemplate[]
  setSpec: (spec: RingSpec) => void
  update: (patch: (draft: RingSpec) => void) => void
  setSizeSystem: (s: SizeSystem) => void
  saveTemplate: (name: string) => UserTemplate
  deleteTemplate: (id: string) => void
  renameTemplate: (id: string, name: string) => void
  addTemplates: (specs: RingSpec[]) => void
}

const newId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      spec: structuredClone(BUILTIN_TEMPLATES[0] ?? DEFAULT_SPEC),
      sizeSystem: 'us',
      templates: [],
      setSpec: (spec) => set({ spec: sanitizeSpec(spec) }),
      update: (patch) => {
        const draft = structuredClone(get().spec)
        patch(draft)
        set({ spec: sanitizeSpec(draft) })
      },
      setSizeSystem: (sizeSystem) => set({ sizeSystem }),
      saveTemplate: (name) => {
        const spec = sanitizeSpec({ ...get().spec, name })
        const t = { id: newId(), spec, savedAt: Date.now() }
        set({ templates: [t, ...get().templates], spec })
        return t
      },
      deleteTemplate: (id) => set({ templates: get().templates.filter((t) => t.id !== id) }),
      renameTemplate: (id, name) =>
        set({
          templates: get().templates.map((t) =>
            t.id === id ? { ...t, spec: sanitizeSpec({ ...t.spec, name }) } : t,
          ),
        }),
      addTemplates: (specs) =>
        set({
          templates: [
            ...specs.map((spec) => ({ id: newId(), spec: sanitizeSpec(spec), savedAt: Date.now() })),
            ...get().templates,
          ],
        }),
    }),
    {
      name: 'ringon',
      version: 1,
      // Stored data is untrusted (older versions, manual edits): re-validate on load.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>
        const templates = Array.isArray(p.templates)
          ? p.templates
              .filter((t) => t && typeof t.id === 'string')
              .map((t) => ({ id: t.id, spec: sanitizeSpec(t.spec), savedAt: Number(t.savedAt) || 0 }))
          : []
        const sizeSystem = (['us', 'eu', 'uk', 'jp'] as const).includes(p.sizeSystem as SizeSystem)
          ? (p.sizeSystem as SizeSystem)
          : current.sizeSystem
        return { ...current, spec: p.spec ? sanitizeSpec(p.spec) : current.spec, templates, sizeSystem }
      },
      partialize: (s) => ({ spec: s.spec, sizeSystem: s.sizeSystem, templates: s.templates }),
    },
  ),
)
