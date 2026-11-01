// Which service, model and key to use. Keys stay in this browser: in memory only, or in
// localStorage when the user asks to remember them.

import { PROVIDERS, PROVIDER_INFO, type ProviderId } from './providers'

export interface ImageGenSettings {
  provider: ProviderId
  models: Partial<Record<ProviderId, string>>
  keys: Partial<Record<ProviderId, string>>
  remember: boolean
}

const STORAGE = 'ringon.imagegen'

export function loadSettings(): ImageGenSettings {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE) ?? '{}')
    return {
      provider: PROVIDERS.includes(s.provider) ? s.provider : 'openai',
      models: typeof s.models === 'object' && s.models ? s.models : {},
      keys: s.remember && typeof s.keys === 'object' && s.keys ? s.keys : {},
      remember: s.remember === true,
    }
  } catch {
    return { provider: 'openai', models: {}, keys: {}, remember: false }
  }
}

/** Keys are written only when `remember` is on; turning it off erases them. */
export function saveSettings(s: ImageGenSettings) {
  localStorage.setItem(STORAGE, JSON.stringify({ ...s, keys: s.remember ? s.keys : {} }))
}

export const modelFor = (s: ImageGenSettings, p: ProviderId = s.provider) => s.models[p]?.trim() || PROVIDER_INFO[p].defaultModel
