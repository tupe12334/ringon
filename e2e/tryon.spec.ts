import { expect, test } from '@playwright/test'

// Live tracking + rendering on CI's CPU-only WebGL runs ~2x slower than locally.
test.describe.configure({ timeout: 180_000 })

// The fake camera shows the back of a right hand, fingers up (see fake-camera.ts).

test('tracks the ring onto the hand in live video, stone facing out', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Try on my hand' }).click()
  const status = page.getByTestId('tracking-status')
  await expect(status).toHaveAttribute('data-status', 'tracking', { timeout: 60_000 })

  const pose = page.getByTestId('pose')
  await expect(pose).toHaveAttribute('data-visible', 'true')

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
  await expect(page.getByRole('dialog', { name: 'Your capture' }).locator('img')).toBeVisible()
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
