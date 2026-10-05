import { expect, test } from '@playwright/test'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { photoDataUrl, usePhotoCamera } from './photo-camera'

// Real photos of hands through the whole try-on: camera → hand tracking → ring pose → render.
// The pose maths is checked in detail by src/tryon/photos.test.ts on the landmarks found here;
// this checks the live pipeline finds every hand and agrees, and attaches each composite.
// DUMP=1 rewrites fixtures/photos/landmarks.json for the unit test.

const dir = fileURLToPath(new URL('./fixtures/photos/', import.meta.url))
const photos = readdirSync(dir).filter((f) => f.endsWith('.jpg'))
const truth: Record<string, { fingerWidthPx?: number; facing?: 'back' | 'palm' }> = JSON.parse(readFileSync(`${dir}truth.json`, 'utf8'))
const round = (a: { x: number; y: number; z: number }[]) => a.map((l) => [l.x, l.y, l.z].map((v) => Math.round(v * 1e5) / 1e5))

test('tracks the ring onto real photos of hands', async ({ page }) => {
  test.setTimeout(photos.length * 50_000 + 60_000)
  await usePhotoCamera(page)
  await page.goto('/#try')
  await page.addStyleTag({ content: '.tryon-top, .tryon-bottom { visibility: hidden }' })
  const landmarks: Record<string, unknown> = {}

  for (const photo of photos) {
    await test.step(photo, async () => {
      // An empty frame first, long enough for the app to forget the previous hand.
      await page.evaluate(() => window.showPhoto(null))
      await expect(page.getByTestId('pose')).not.toHaveAttribute('data-visible', 'true', { timeout: 15_000 })
      await page.waitForTimeout(1100)
      const src = photoDataUrl(dir + photo)
      const size = await page.evaluate(async (s) => {
        await window.showPhoto(s)
        const img = new Image()
        img.src = s
        await img.decode()
        return { width: img.naturalWidth, height: img.naturalHeight }
      }, src)
      await page.setViewportSize(size)
      await expect(page.getByTestId('pose')).toHaveAttribute('data-visible', 'true', { timeout: 40_000 })
      await page.waitForTimeout(1500) // let the smoothing settle

      const pose = await page.getByTestId('pose').evaluate((el) => ({ ...el.dataset, hand: (el as unknown as { hand: { image: []; world: []; view: unknown } }).hand }))
      landmarks[photo] = { view: pose.hand.view, image: round(pose.hand.image), world: round(pose.hand.world) }
      await page.screenshot({ path: test.info().outputPath(photo.replace('.jpg', '.png')) })

      const t = truth[photo] ?? {}
      const stoneZ = Number(pose.stoneZ)
      if (t.facing === 'back') expect.soft(stoneZ, `${photo}: stone faces the camera`).toBeGreaterThan(0.2)
      if (t.facing === 'palm') expect.soft(stoneZ, `${photo}: stone faces away`).toBeLessThan(-0.2)
      if (t.fingerWidthPx) {
        const ratio = (Number(pose.pxPerMm) * 16.5) / t.fingerWidthPx
        expect.soft(ratio, `${photo}: ring width / finger width`).toBeGreaterThan(0.75)
        expect.soft(ratio, `${photo}: ring width / finger width`).toBeLessThan(1.25)
      }
    })
  }
  if (process.env.DUMP) writeFileSync(`${dir}landmarks.json`, JSON.stringify(landmarks))
})
