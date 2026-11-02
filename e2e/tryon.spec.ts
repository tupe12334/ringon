import { expect, test, type Locator, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { usePhotoCamera } from './photo-camera'

// Live tracking + rendering on CI's CPU-only WebGL runs ~2x slower than locally.
test.describe.configure({ timeout: 180_000 })

// The fake camera shows the back of a right hand, fingers up (see fake-camera.ts).

test('tracks the ring onto the hand in live video, stone facing out', async ({ page }) => {
  // Each pose sample waits for a frame, and under software WebGL a frame (hand tracking plus
  // ray-traced gems) can take seconds on a CI runner.
  test.slow()
  await page.goto('/')
  await page.getByRole('button', { name: 'Try on my hand' }).click()
  const status = page.getByTestId('tracking-status')
  await expect(status).toHaveAttribute('data-status', 'tracking', { timeout: 60_000 })

  const pose = page.getByTestId('pose')
  await expect(pose).toHaveAttribute('data-visible', 'true')
  // Lit like the room: this feed is a bright photo on white, so exposure rises above normal.
  await expect.poll(async () => Number(await pose.getAttribute('data-light-exposure'))).toBeGreaterThan(1.2)

  // Sample the pose while the hand moves: the ring must follow it.
  const samples: { x: number; y: number; stoneZ: number; pxPerMm: number }[] = []
  for (let i = 0; i < 16; i++) {
    await page.waitForTimeout(250)
    samples.push(
      await pose.evaluate((el) => ({
        x: Number(el.dataset.x),
        y: Number(el.dataset.y),
        stoneZ: Number(el.dataset.stoneZ),
        pxPerMm: Number(el.dataset.pxPerMm),
      })),
    )
  }
  await test.info().attach('samples', { body: JSON.stringify(samples, null, 1), contentType: 'application/json' })
  const xs = samples.map((s) => s.x)
  expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(8)
  for (const s of samples) {
    // Back of the hand faces the camera, so the stone faces the viewer.
    expect(s.stoneZ).toBeGreaterThan(0.3)
    // The fixture's ring finger is ~65–70 CSS px wide at the ring; a 16.5 mm ring must match it.
    expect(s.pxPerMm * 16.5).toBeGreaterThan(50)
    expect(s.pxPerMm * 16.5).toBeLessThan(85)
  }

  // Flip puts the stone on the palm side.
  await page.getByRole('button', { name: 'Flip side' }).click()
  await expect.poll(async () => Number(await pose.getAttribute('data-stone-z'))).toBeLessThan(-0.3)
  // Last: in headless Chromium a screen capture can stall the fake camera feed.
  await page.screenshot({ path: test.info().outputPath('tracking.png') })
})

test('records a video clip of the try-on', async ({ page }) => {
  await page.goto('/#try')
  await expect(page.getByTestId('tracking-status')).toHaveAttribute('data-status', 'tracking', { timeout: 60_000 })
  await page.getByRole('button', { name: '● Record video' }).click()
  await page.waitForTimeout(2500)
  await page.getByRole('button', { name: /Stop/ }).click()
  const clip = page.getByRole('dialog', { name: 'Your capture' }).locator('video')
  await expect(clip).toBeVisible()
  const size = await clip.evaluate(async (v: HTMLVideoElement) => (await fetch(v.src).then((r) => r.blob())).size)
  expect(size).toBeGreaterThan(10_000)
})

test('takes a photo', async ({ page }) => {
  await page.goto('/#try')
  await expect(page.getByTestId('tracking-status')).toHaveAttribute('data-status', 'tracking', { timeout: 60_000 })
  await page.getByRole('button', { name: 'Photo' }).click()
  // Encoding a large canvas on a CPU-only WebGL under load can take a few seconds.
  await expect(page.getByRole('dialog', { name: 'Your capture' }).locator('img')).toBeVisible({ timeout: 20_000 })
})

test('keeps the stone on the back of the hand with the mirrored front camera', async ({ page }) => {
  await page.goto('/#try')
  const status = page.getByTestId('tracking-status')
  await expect(status).toHaveAttribute('data-status', 'tracking', { timeout: 60_000 })
  await page.getByRole('button', { name: 'Switch camera' }).click()
  await expect(status).toHaveAttribute('data-status', 'tracking', { timeout: 60_000 })
  const pose = page.getByTestId('pose')
  await expect.poll(async () => Number(await pose.getAttribute('data-stone-z')), { timeout: 10_000 }).toBeGreaterThan(0.3)
})

test('the chosen hand decides the palm side', async ({ page }) => {
  await page.goto('/#try')
  await expect(page.getByTestId('tracking-status')).toHaveAttribute('data-status', 'tracking', { timeout: 60_000 })
  const pose = page.getByTestId('pose')
  const stoneZ = async () => Number(await pose.getAttribute('data-stone-z'))
  // The fixture is a right hand: naming it keeps the stone on the back of the hand.
  await page.getByRole('radio', { name: 'Right hand' }).click()
  await expect(page.getByRole('radio', { name: 'Right hand' })).toHaveAttribute('aria-checked', 'true')
  await expect.poll(stoneZ, { timeout: 10_000 }).toBeGreaterThan(0.3)
  // Calling it a left hand is taken at its word: the stone goes to what is then the back.
  await page.getByRole('radio', { name: 'Left hand' }).click()
  await expect.poll(stoneZ, { timeout: 10_000 }).toBeLessThan(-0.3)
  await page.getByRole('radio', { name: 'Auto' }).click()
  await expect.poll(stoneZ, { timeout: 10_000 }).toBeGreaterThan(0.3)
})

/** The element covers the whole viewport. */
async function coversViewport(page: Page, el: Locator) {
  const box = await el.boundingBox()
  const { width, height } = page.viewportSize()!
  expect(box).toEqual({ x: 0, y: 0, width, height })
}

test.describe('start-up', () => {
  test('an opaque full-screen loading screen hides the camera until the try-on is ready', async ({ page }) => {
    // Hold the hand model back, so the loading screen stays up long enough to look at.
    let release = () => {}
    const held = new Promise<void>((r) => (release = r))
    await page.route('**/models/hand_landmarker.task', async (route) => {
      await held
      await route.continue()
    })
    await page.goto('/')
    await page.getByRole('button', { name: 'Try on my hand' }).click()
    const screen = page.getByTestId('tracking-status')
    await expect(screen).toHaveAttribute('data-status', 'loading')
    // The camera opens first; then the screen says what it is still waiting for.
    await expect(page.getByRole('status')).toHaveText('Loading hand tracking…', { timeout: 30_000 })
    await coversViewport(page, screen)
    await expect(screen).toHaveCSS('background-color', 'rgb(0, 0, 0)')
    await expect(page.getByRole('button', { name: 'Back to designer' })).toBeVisible()
    // No try-on controls over a ring-less camera.
    await expect(page.getByRole('button', { name: 'Photo' })).toHaveCount(0)

    release()
    await expect(screen).toHaveAttribute('data-status', /searching|tracking/, { timeout: 60_000 })
    await expect(page.locator('.tryon-screen')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Photo' })).toBeVisible()
  })
})

test('coaches the user while no hand is in view, and steps aside for the ring', async ({ page }) => {
  await usePhotoCamera(page) // starts on an empty frame: no hand
  await page.goto('/#try')
  const status = page.getByTestId('tracking-status')
  await expect(status).toHaveAttribute('data-status', 'searching', { timeout: 60_000 })
  const coaching = page.getByTestId('coaching')
  await expect(coaching).toHaveText('Hold up your hand, back of the hand to the camera')
  await coversViewport(page, coaching)
  await page.getByRole('radio', { name: 'Right hand' }).click()
  await expect(coaching).toHaveText('Hold up your right hand, back of the hand to the camera')

  const hand = `data:image/png;base64,${readFileSync(new URL('./fixtures/back-of-right-hand.png', import.meta.url)).toString('base64')}`
  await page.evaluate((src) => window.showPhoto(src), hand)
  await expect(status).toHaveAttribute('data-status', 'tracking', { timeout: 60_000 })
  await expect(coaching).toBeHidden()

  // The hand goes: the coaching comes back once it has been gone a moment.
  await page.evaluate(() => window.showPhoto(null))
  await expect(coaching).toBeVisible({ timeout: 30_000 })
})

test('a refused camera shows a full-screen error with retry and back', async ({ page }) => {
  await page.addInitScript(() => {
    Object.assign(window, { cameraAsks: 0 })
    navigator.mediaDevices.getUserMedia = async () => {
      Object.assign(window, { cameraAsks: (window as unknown as { cameraAsks: number }).cameraAsks + 1 })
      throw new DOMException('Permission denied', 'NotAllowedError')
    }
  })
  const asks = () => page.evaluate(() => (window as unknown as { cameraAsks: number }).cameraAsks)
  await page.goto('/')
  await page.getByRole('button', { name: 'Try on my hand' }).click()
  const screen = page.getByTestId('tracking-status')
  await expect(screen).toHaveAttribute('data-status', 'error', { timeout: 30_000 })
  await expect(page.getByRole('alert')).toContainText('Camera unavailable: Permission denied')
  await coversViewport(page, screen)

  const before = await asks()
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect.poll(asks).toBe(before + 1)
  await expect(screen).toHaveAttribute('data-status', 'error')

  await page.getByRole('button', { name: 'Back to designer' }).click()
  await expect(page.getByRole('button', { name: 'Try on my hand' })).toBeVisible()
})
