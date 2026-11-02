import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// The AI photo tab: a prompt from the design, and a request to an image service with the
// user's own key. The service is mocked: no real (paid) API is ever called.

const HAND = fileURLToPath(new URL('./fixtures/back-of-right-hand.png', import.meta.url))
const RESULT = readFileSync(HAND).toString('base64')
const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models/**'
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST' }

// Once the service worker controls the page, page.route no longer sees its fetches and the
// request reaches the real service. Block it so the mock always answers.
test.use({ serviceWorkers: 'block' })

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('writes a prompt for the chosen hand and finger, and generates a photo with a key', async ({ page }) => {
  await page.getByRole('tab', { name: 'AI photo' }).click()
  const panel = page.getByRole('tabpanel', { name: 'AI photo' })
  await panel.getByRole('radio', { name: 'Right hand' }).click()
  await panel.getByRole('radiogroup', { name: 'Finger' }).getByRole('radio', { name: 'Index' }).click()

  const prompt = panel.getByLabel('Prompt', { exact: true })
  await expect(prompt).toHaveValue(/on the index finger of the right hand/)
  await expect(prompt).toHaveValue(/Centre stone: 1\.00 ct round/)
  await expect(prompt).not.toHaveValue(/Reference image 2/)

  await panel.getByLabel('Your hand photo (optional)').setInputFiles(HAND)
  await expect(prompt).toHaveValue(/Reference image 2 is the wearer's own right hand/)

  const requests: { key: string | null; body: { contents: { parts: Record<string, any>[] }[] } }[] = []
  await page.route(GEMINI, async (route) => {
    const req = route.request()
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS })
    requests.push({ key: req.headers()['x-goog-api-key'], body: req.postDataJSON() })
    await route.fulfill({ headers: CORS, json: { candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: RESULT } }] } }] } })
  })

  await panel.getByRole('radio', { name: 'Google Gemini' }).click()
  const generate = panel.getByRole('button', { name: 'Generate photo' })
  await expect(generate).toBeDisabled()
  await panel.getByLabel('Google Gemini API key').fill('test-key')
  await generate.click()

  const result = panel.getByRole('img', { name: 'Generated photo of the ring' })
  await expect(result).toBeVisible({ timeout: 30_000 })
  expect(await result.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
  await expect(panel.getByRole('link', { name: 'Download' })).toBeVisible()

  expect(requests).toHaveLength(1)
  expect(requests[0].key).toBe('test-key')
  const [text, ring, hand] = requests[0].body.contents[0].parts
  expect(text.text).toContain('on the index finger of the right hand')
  // The ring is the live 3D view, captured as a PNG; the hand is the uploaded photo.
  expect(ring.inline_data.mime_type).toBe('image/png')
  expect(ring.inline_data.data.length).toBeGreaterThan(1000)
  expect(hand.inline_data.data).toBe(RESULT)

  // The key is not remembered unless asked.
  expect(await page.evaluate(() => localStorage.getItem('ringon.imagegen'))).not.toContain('test-key')
})

test('shows the service error', async ({ page }) => {
  await page.route(GEMINI, (route) =>
    route.request().method() === 'OPTIONS'
      ? route.fulfill({ status: 204, headers: CORS })
      : route.fulfill({ status: 400, headers: CORS, json: { error: { code: 400, message: 'API key not valid. Please pass a valid API key.' } } }),
  )
  await page.getByRole('tab', { name: 'AI photo' }).click()
  const panel = page.getByRole('tabpanel', { name: 'AI photo' })
  await panel.getByRole('radio', { name: 'Google Gemini' }).click()
  await panel.getByLabel('Google Gemini API key').fill('bad-key')
  await panel.getByRole('button', { name: 'Generate photo' }).click()
  await expect(panel.getByRole('alert')).toHaveText('Failed: API key not valid. Please pass a valid API key.')
})
