import { expect, test } from '@playwright/test'

// Runs in the iphone-webkit project: iPhone Safari's engine with WebKit's mock camera.

test('try-on starts the camera, loads hand tracking, records MP4 and takes a photo', async ({ page, context }) => {
  await context.grantPermissions(['camera'])
  await page.goto('/')
  await page.getByRole('button', { name: /Try on/ }).click()
  // "searching" means the camera plays and MediaPipe's model and WASM have loaded.
  await expect(page.getByTestId('tracking-status')).toHaveAttribute('data-status', 'searching', { timeout: 60_000 })

  await page.getByRole('button', { name: /Record video/ }).click()
  await page.waitForTimeout(2000)
  await page.getByRole('button', { name: /Stop/ }).click()
  const clip = page.getByRole('dialog').locator('video')
  await expect(clip).toBeVisible()
  const video = await clip.evaluate(async (v: HTMLVideoElement) => {
    const b = await fetch(v.src).then((r) => r.blob())
    return { type: b.type, size: b.size }
  })
  expect(video.type).toBe('video/mp4') // what iPhones can play and share
  expect(video.size).toBeGreaterThan(10_000)

  await page.getByRole('button', { name: 'Close' }).click()
  await page.getByRole('button', { name: 'Photo' }).click()
  await expect(page.getByRole('dialog').locator('img')).toBeVisible()
})
