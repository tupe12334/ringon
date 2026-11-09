import { expect, test } from '@playwright/test'

// Analytics is off on localhost (LIVE_HOSTS in src/usage-counter.ts): the sharer's ?from= id is
// still read and stripped, and Share links carry no id of ours.
test('strips ?from= from the address bar and leaves it out of Share links', async ({ page, context }) => {
  await page.route('https://ringon.app/e', (route) => route.abort()) // never reach real analytics
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/?from=11111111-1111-4111-8111-111111111111')
  await expect(page.getByTestId('summary')).toBeVisible()
  expect(page.url()).not.toContain('from=')

  await page.evaluate(() => Object.defineProperty(navigator, 'share', { value: undefined }))
  await page.getByRole('tab', { name: 'Templates' }).click()
  await page.getByRole('button', { name: 'Share link' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Link copied' })).toBeVisible()
  const link = await page.evaluate(() => navigator.clipboard.readText())
  expect(link).toContain('#r=')
  expect(link).not.toContain('from=')
})
