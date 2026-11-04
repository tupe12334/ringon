// Image generation services the browser can call directly with the user's own API key.
// Each sends the prompt plus reference images (the ring, optionally the hand) and returns one
// image. Requests go straight from this browser to the service; Ringon has no server.

import i18n from '../i18n'

export const PROVIDERS = ['openai', 'gemini', 'openrouter', 'fal'] as const
export type ProviderId = (typeof PROVIDERS)[number]

export interface GenerateRequest {
  key: string
  model: string
  prompt: string
  /** Reference images in prompt order: the ring first, then the hand. */
  images: Blob[]
  signal?: AbortSignal
}

interface Provider {
  name: string
  /** Where to create a key. */
  keyUrl: string
  /** Current at the time of writing; the user can type any model the service offers. */
  defaultModel: string
  generate: (r: GenerateRequest) => Promise<Blob>
}

const toBase64 = async (b: Blob) => {
  const bytes = new Uint8Array(await b.arrayBuffer())
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}
const toDataUrl = async (b: Blob) => `data:${b.type || 'image/png'};base64,${await toBase64(b)}`
const fromBase64 = (b64: string, type = 'image/png') => new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type })
/** Fetches http(s) and data: URLs alike. */
const fromUrl = async (url: string, signal?: AbortSignal) => (await fetch(url, { signal })).blob()

/** JSON body of a response, throwing the service's own error message when it failed. */
async function json(res: Response): Promise<any> {
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const e = body?.error
    throw new Error((typeof e === 'string' ? e : e?.message) ?? body?.detail ?? body?.message ?? `HTTP ${res.status}`)
  }
  return body
}

const noImage = (detail?: string) => new Error(detail ? i18n.t('imagegen.noImageDetail', { detail }) : i18n.t('imagegen.noImage'))

export const PROVIDER_INFO: Record<ProviderId, Provider> = {
  openai: {
    name: 'OpenAI',
    keyUrl: 'https://platform.openai.com/api-keys',
    defaultModel: 'gpt-image-2',
    async generate({ key, model, prompt, images, signal }) {
      const form = new FormData()
      form.append('model', model)
      form.append('prompt', prompt)
      images.forEach((img, i) => form.append('image[]', img, `reference-${i + 1}.${img.type === 'image/jpeg' ? 'jpg' : 'png'}`))
      const res = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form, signal })
      const d = (await json(res))?.data?.[0]
      if (d?.b64_json) return fromBase64(d.b64_json)
      if (d?.url) return fromUrl(d.url, signal)
      throw noImage()
    },
  },
  gemini: {
    name: 'Google Gemini',
    keyUrl: 'https://aistudio.google.com/apikey',
    defaultModel: 'gemini-3.1-flash-image-preview',
    async generate({ key, model, prompt, images, signal }) {
      const parts = [{ text: prompt }, ...(await Promise.all(images.map(async (b) => ({ inline_data: { mime_type: b.type || 'image/png', data: await toBase64(b) } }))))]
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } }),
        signal,
      })
      const out: any[] = (await json(res))?.candidates?.[0]?.content?.parts ?? []
      const img = out.map((p) => p.inlineData ?? p.inline_data).find(Boolean)
      if (img) return fromBase64(img.data, img.mimeType ?? img.mime_type)
      throw noImage(out.find((p) => p.text)?.text)
    },
  },
  openrouter: {
    name: 'OpenRouter (many models, one key)',
    keyUrl: 'https://openrouter.ai/settings/keys',
    defaultModel: 'openai/gpt-image-2',
    async generate({ key, model, prompt, images, signal }) {
      const content = [{ type: 'text', text: prompt }, ...(await Promise.all(images.map(async (b) => ({ type: 'image_url', image_url: { url: await toDataUrl(b) } }))))]
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'X-Title': 'Ringon' },
        body: JSON.stringify({ model, modalities: ['image', 'text'], messages: [{ role: 'user', content }] }),
        signal,
      })
      const msg = (await json(res))?.choices?.[0]?.message
      const url = msg?.images?.[0]?.image_url?.url
      if (url) return fromUrl(url, signal)
      throw noImage(typeof msg?.content === 'string' ? msg.content : undefined)
    },
  },
  fal: {
    name: 'fal.ai',
    keyUrl: 'https://fal.ai/dashboard/keys',
    defaultModel: 'openai/gpt-image-2/edit',
    async generate({ key, model, prompt, images, signal }) {
      const res = await fetch(`https://fal.run/${model.replace(/^\/+/, '')}`, {
        method: 'POST',
        headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, image_urls: await Promise.all(images.map(toDataUrl)) }),
        signal,
      })
      const url = (await json(res))?.images?.[0]?.url
      if (url) return fromUrl(url, signal)
      throw noImage()
    },
  },
}

/** Image-output models OpenRouter offers right now (public list, no key needed). */
export async function openRouterImageModels(signal?: AbortSignal): Promise<string[]> {
  const res = await fetch('https://openrouter.ai/api/v1/models?output_modalities=image', { signal })
  const data: { id: string; architecture?: { input_modalities?: string[] } }[] = (await json(res))?.data ?? []
  // Only models that take reference images can put this ring on this hand.
  return data.filter((m) => m.architecture?.input_modalities?.includes('image')).map((m) => m.id)
}
