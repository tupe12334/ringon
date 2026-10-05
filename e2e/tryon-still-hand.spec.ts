import { expect, test, type Page } from '@playwright/test'

// Live tracking + rendering on CI's CPU-only WebGL runs ~2x slower than locally.
test.describe.configure({ timeout: 180_000 })

// A motionless back-of-hand feed, so two page loads see the same frame and the same ring pose.

/** Mean brightness (0–255) of the skin just below the ring, where its shadow falls. */
async function skinBelowRing(page: Page, query: string) {
  await page.goto(`/${query}#try`)
  await expect(page.getByTestId('tracking-status')).toHaveAttribute('data-status', 'tracking', { timeout: 60_000 })
  await page.waitForTimeout(1500)
  const pose = page.getByTestId('pose')
  const x = Number(await pose.getAttribute('data-x'))
  const y = Number(await pose.getAttribute('data-y'))
  const pxPerMm = Number(await pose.getAttribute('data-px-per-mm'))
  const vw = page.viewportSize()!
  // Pose is in canvas units centred on the screen, y up. In this feed the finger points up, so
  // the overhead light's shadow falls just below the band: start past the band's half width.
  const cx = vw.width / 2 + x
  const cy = vw.height / 2 - y + 2.5 * pxPerMm
  const shot = await page.screenshot({ clip: { x: cx - 25, y: cy, width: 50, height: 6 * pxPerMm } })
  return page.evaluate(
    async (b64) => {
      const img = new Image()
      img.src = `data:image/png;base64,${b64}`
      await img.decode()
      const c = Object.assign(document.createElement('canvas'), { width: img.width, height: img.height })
      const ctx = c.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const d = ctx.getImageData(0, 0, c.width, c.height).data
      let sum = 0
      for (let i = 0; i < d.length; i += 4) sum += (d[i] + d[i + 1] + d[i + 2]) / 3
      return sum / (d.length / 4)
    },
    shot.toString('base64'),
  ).then((mean) => ({ mean, x, y }))
}

test('the ring casts a soft shadow on the skin', async ({ page }) => {
  const withShadow = await skinBelowRing(page, '')
  const without = await skinBelowRing(page, '?shadow=0')
  // Same frame, same pose: the only difference is the shadow.
  expect(Math.abs(withShadow.x - without.x)).toBeLessThan(2)
  expect(Math.abs(withShadow.y - without.y)).toBeLessThan(2)
  test.info().annotations.push({ type: 'brightness', description: `with ${withShadow.mean.toFixed(1)} / without ${without.mean.toFixed(1)}` })
  expect(withShadow.mean).toBeLessThan(without.mean - 4)
})
