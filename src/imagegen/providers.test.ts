import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { openRouterImageModels, PROVIDER_INFO } from './providers'
import { loadSettings, modelFor, saveSettings } from './settings'

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
const b64 = btoa(String.fromCharCode(...PNG))
const ring = new Blob([PNG], { type: 'image/png' })
const hand = new Blob([new Uint8Array([0xff, 0xd8])], { type: 'image/jpeg' })
const request = { key: 'sk-test', model: 'm', prompt: 'a ring', images: [ring, hand] }

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const png = () => new Response(PNG, { headers: { 'Content-Type': 'image/png' } })

let fetchMock: ReturnType<typeof vi.fn>
beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

/** The n-th fetch call's URL and init. */
const call = (n = 0) => {
  const [url, init] = fetchMock.mock.calls[n] as [string, RequestInit]
  return { url, init, headers: init.headers as Record<string, string>, body: typeof init.body === 'string' ? JSON.parse(init.body) : init.body }
}
const bytes = async (b: Blob) => [...new Uint8Array(await b.arrayBuffer())]

describe('OpenAI', () => {
  it('posts multipart image[] edits and decodes b64_json', async () => {
    fetchMock.mockResolvedValueOnce(json({ data: [{ b64_json: b64 }] }))
    const out = await PROVIDER_INFO.openai.generate(request)
    const { url, init, headers, body } = call()
    expect(url).toBe('https://api.openai.com/v1/images/edits')
    expect(init.method).toBe('POST')
    expect(headers.Authorization).toBe('Bearer sk-test')
    const form = body as FormData
    expect(form.get('model')).toBe('m')
    expect(form.get('prompt')).toBe('a ring')
    const files = form.getAll('image[]') as File[]
    expect(files.map((f) => f.name)).toEqual(['reference-1.png', 'reference-2.jpg'])
    expect(await bytes(out)).toEqual([...PNG])
  })

  it("throws the service's error message", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: { message: 'Incorrect API key provided' } }, 401))
    await expect(PROVIDER_INFO.openai.generate(request)).rejects.toThrow('Incorrect API key provided')
  })
})

describe('Gemini', () => {
  it('sends inline_data parts with the key header and reads inlineData', async () => {
    fetchMock.mockResolvedValueOnce(json({ candidates: [{ content: { parts: [{ text: 'here' }, { inlineData: { mimeType: 'image/png', data: b64 } }] } }] }))
    const out = await PROVIDER_INFO.gemini.generate({ ...request, model: 'gemini-x' })
    const { url, headers, body } = call()
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-x:generateContent')
    expect(headers['x-goog-api-key']).toBe('sk-test')
    expect(body.contents[0].parts).toEqual([
      { text: 'a ring' },
      { inline_data: { mime_type: 'image/png', data: b64 } },
      { inline_data: { mime_type: 'image/jpeg', data: btoa('\xff\xd8') } },
    ])
    expect(body.generationConfig.responseModalities).toContain('IMAGE')
    expect(out.type).toBe('image/png')
    expect(await bytes(out)).toEqual([...PNG])
  })

  it('reports the text when no image comes back, and API errors', async () => {
    fetchMock.mockResolvedValueOnce(json({ candidates: [{ content: { parts: [{ text: 'I cannot do that' }] } }] }))
    await expect(PROVIDER_INFO.gemini.generate(request)).rejects.toThrow('without an image: I cannot do that')
    fetchMock.mockResolvedValueOnce(json({ error: { code: 400, message: 'API key not valid' } }, 400))
    await expect(PROVIDER_INFO.gemini.generate(request)).rejects.toThrow('API key not valid')
  })
})

describe('OpenRouter', () => {
  it('sends a chat with image modalities and data URIs, and fetches the returned image', async () => {
    const dataUrl = `data:image/png;base64,${b64}`
    fetchMock.mockResolvedValueOnce(json({ choices: [{ message: { content: '', images: [{ type: 'image_url', image_url: { url: dataUrl } }] } }] }))
    fetchMock.mockResolvedValueOnce(png())
    const out = await PROVIDER_INFO.openrouter.generate(request)
    const { url, headers, body } = call()
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions')
    expect(headers.Authorization).toBe('Bearer sk-test')
    expect(body.model).toBe('m')
    expect(body.modalities).toEqual(['image', 'text'])
    expect(body.messages[0].content).toEqual([
      { type: 'text', text: 'a ring' },
      { type: 'image_url', image_url: { url: dataUrl } },
      { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${btoa('\xff\xd8')}` } },
    ])
    expect(call(1).url).toBe(dataUrl)
    expect(await bytes(out)).toEqual([...PNG])
  })

  it('throws a plain-string error', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: 'No credits' }, 402))
    await expect(PROVIDER_INFO.openrouter.generate(request)).rejects.toThrow('No credits')
  })

  it('lists only image-output models that take images', async () => {
    fetchMock.mockResolvedValueOnce(
      json({ data: [{ id: 'a/edit', architecture: { input_modalities: ['text', 'image'] } }, { id: 'b/text-only', architecture: { input_modalities: ['text'] } }] }),
    )
    expect(await openRouterImageModels()).toEqual(['a/edit'])
    expect(call().url).toBe('https://openrouter.ai/api/v1/models?output_modalities=image')
  })
})

describe('fal.ai', () => {
  it('posts prompt and image_urls with a Key header and fetches images[0].url', async () => {
    fetchMock.mockResolvedValueOnce(json({ images: [{ url: 'https://v3.fal.media/files/out.png' }] }))
    fetchMock.mockResolvedValueOnce(png())
    const out = await PROVIDER_INFO.fal.generate({ ...request, model: '/fal-ai/some/edit' })
    const { url, headers, body } = call()
    expect(url).toBe('https://fal.run/fal-ai/some/edit')
    expect(headers.Authorization).toBe('Key sk-test')
    expect(body.prompt).toBe('a ring')
    expect(body.image_urls).toHaveLength(2)
    expect(body.image_urls[0]).toBe(`data:image/png;base64,${b64}`)
    expect(call(1).url).toBe('https://v3.fal.media/files/out.png')
    expect(await bytes(out)).toEqual([...PNG])
  })

  it('throws the detail message, or the HTTP status', async () => {
    fetchMock.mockResolvedValueOnce(json({ detail: 'Unauthorized' }, 401))
    await expect(PROVIDER_INFO.fal.generate(request)).rejects.toThrow('Unauthorized')
    fetchMock.mockResolvedValueOnce(new Response('gateway down', { status: 502 }))
    await expect(PROVIDER_INFO.fal.generate(request)).rejects.toThrow('HTTP 502')
    fetchMock.mockResolvedValueOnce(json({ images: [] }))
    await expect(PROVIDER_INFO.fal.generate(request)).rejects.toThrow('without an image')
  })
})

describe('settings', () => {
  const store = new Map<string, string>()
  beforeEach(() => {
    store.clear()
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) })
  })

  it('never writes keys while remember is off', () => {
    saveSettings({ provider: 'fal', models: { fal: 'x/y' }, keys: { fal: 'secret' }, remember: false })
    expect(store.get('ringon.imagegen')).not.toContain('secret')
    expect(loadSettings()).toEqual({ provider: 'fal', models: { fal: 'x/y' }, keys: {}, remember: false })
  })

  it('keeps keys when remember is on, and drops them when it is turned off', () => {
    saveSettings({ provider: 'openai', models: {}, keys: { openai: 'secret' }, remember: true })
    expect(loadSettings().keys).toEqual({ openai: 'secret' })
    saveSettings({ ...loadSettings(), remember: false })
    expect(store.get('ringon.imagegen')).not.toContain('secret')
    expect(loadSettings().keys).toEqual({})
  })

  it('ignores a stored key whose remember flag is off, and bad data', () => {
    store.set('ringon.imagegen', JSON.stringify({ provider: 'nope', keys: { openai: 'leaked' }, remember: false }))
    expect(loadSettings()).toEqual({ provider: 'openai', models: {}, keys: {}, remember: false })
    store.set('ringon.imagegen', '{oops')
    expect(loadSettings().provider).toBe('openai')
  })

  it('falls back to the default model when none is typed', () => {
    const s = { provider: 'gemini' as const, models: { gemini: '  ' }, keys: {}, remember: false }
    expect(modelFor(s)).toBe(PROVIDER_INFO.gemini.defaultModel)
    expect(modelFor({ ...s, models: { gemini: ' my-model ' } })).toBe('my-model')
  })
})
