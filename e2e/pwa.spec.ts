import { expect, test } from '@playwright/test'

test('is installable and works offline', async ({ page, context }) => {
  await page.goto('/')

  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  const manifest = await (await page.request.get(new URL(href!, page.url()).href)).json()
  expect(manifest).toMatchObject({ id: '/', start_url: '/', display: 'standalone', name: 'Ringon' })
  const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes)
  expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']))
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true)
  for (const { src } of [...manifest.icons, ...manifest.screenshots])
    expect((await page.request.get(new URL(src, page.url()).href)).ok(), src).toBe(true)

  // The service worker must take control and precache the app shell.
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByTestId('summary')).toContainText('18k yellow gold')
  await context.setOffline(false)
})
