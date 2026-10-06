import { expect, test } from '@playwright/test'

// Live tracking + rendering on CI's CPU-only WebGL runs ~2x slower than locally.
test.describe.configure({ timeout: 180_000 })

// Real footage (see fixtures/ATTRIBUTION.md): a hand opening, closing and turning, palm toward
// the camera. The ring must stay on the finger with the stone on the far (back) side
// throughout, including through the fist, where MediaPipe's left/right label flips.

test('tracks a real moving hand, stone staying on the back of the hand', async ({ page }) => {
  await page.goto('/#try')
  await expect(page.getByTestId('tracking-status')).toHaveAttribute('data-status', 'tracking', { timeout: 60_000 })
  const pose = page.getByTestId('pose')

  const samples: { status: string; x: number; stoneZ: number }[] = []
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(250)
    samples.push(
      await page.evaluate(() => {
        const el = document.querySelector<HTMLElement>('[data-testid=pose]')!
        return {
          status: document.querySelector<HTMLElement>('[data-testid=tracking-status]')!.dataset.status!,
          x: Number(el.dataset.x),
          stoneZ: Number(el.dataset.stoneZ),
        }
      }),
    )
  }
  const tracked = samples.filter((s) => s.status === 'tracking')
  expect(tracked.length).toBeGreaterThanOrEqual(36)
  for (const s of tracked) expect(s.stoneZ).toBeLessThan(0)
  const xs = tracked.map((s) => s.x)
  expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(10)
  await expect(pose).toHaveAttribute('data-visible', 'true')
  // Lit like the room: a grey wall and skin, so exposure stays near normal (not the bright-photo
  // level of the other feed).
  const exposure = () => pose.getAttribute('data-light-exposure').then(Number)
  await expect.poll(exposure).toBeGreaterThan(0.9)
  await expect.poll(exposure).toBeLessThan(1.3)
})
