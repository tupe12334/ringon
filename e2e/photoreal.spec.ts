import { expect, test } from '@playwright/test'

// Its own project and browser: forcing path tracing on CPU-only WebGL leaves the browser
// heavily loaded, which used to time out the next spec's context setup.

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('photoreal path tracing: paused on a GPU-less device, still available on request', async ({ page }) => {
  test.setTimeout(150_000)
  const render = page.getByTestId('render')
  // The test browser renders WebGL on the CPU: path tracing would freeze the page.
  await expect(page.getByRole('status').filter({ hasText: 'Photoreal paused' })).toBeVisible({ timeout: 30_000 })
  await expect(render).toHaveAttribute('data-mode', 'raster')
  await page.getByRole('tab', { name: 'Metal' }).click() // the page stays responsive

  // The user can insist.
  await page.getByRole('button', { name: /Photoreal off/ }).click()
  await expect(render).toHaveAttribute('data-mode', 'pathtrace', { timeout: 30_000 })
  // (Not waiting for a traced sample here: on CPU-only WebGL compiling the path-tracing shader
  // alone takes minutes. Samples are checked on a GPU; the pause/force logic is unit-tested.)

  // Turning it off returns to real time. (Forced on a CPU renderer each sample blocks for
  // seconds, so allow time.)
  await page.getByRole('button', { name: /Photoreal on/ }).click()
  await expect(render).toHaveAttribute('data-mode', 'raster', { timeout: 60_000 })
  await expect(render).toHaveAttribute('data-samples', '0')
})

test('photoreal survives the GPU refusing a WebGL context', async ({ page }) => {
  test.setTimeout(150_000)
  // Safari hands out an already-lost context when the GPU is busy or out of memory, and three
  // throws on it. The real-time canvas is in the page when it asks; the tracer's are not yet.
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof getContext>) {
      const ctx = getContext.apply(this, args)
      if (!this.isConnected && ctx && 'getExtension' in ctx) ctx.getExtension('WEBGL_lose_context')?.loseContext()
      return ctx
    } as typeof getContext
  })
  await page.reload()
  const render = page.getByTestId('render')
  await expect(page.getByRole('status').filter({ hasText: 'Photoreal paused' })).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: /Photoreal off/ }).click()
  await expect(render).toHaveAttribute('data-mode', 'pathtrace', { timeout: 30_000 })
  // The tracer's renderer is made after SETTLE_MS; give it time to fail.
  await page.waitForTimeout(3_000)
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.getByRole('tab', { name: 'Metal' }).click() // still usable
})
