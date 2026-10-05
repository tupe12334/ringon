import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('customises every section and updates the summary', async ({ page }) => {
  const summary = page.getByTestId('summary')
  await expect(summary).toContainText('18k yellow gold')

  await page.getByRole('tab', { name: 'Metal' }).click()
  await page.getByLabel('Band metal').selectOption('platinum')
  await expect(summary).toContainText('Platinum')

  await page.getByRole('tab', { name: 'Stone' }).click()
  await page.getByRole('radio', { name: 'Oval' }).click()
  await page.getByLabel('Gem', { exact: true }).selectOption('sapphire')
  await expect(summary).toContainText('oval blue sapphire')

  await page.getByRole('tab', { name: 'Size' }).click()
  await page.getByRole('radio', { name: 'EU / ISO' }).click()
  await page.getByLabel('Ring size').selectOption('54')
  await expect(summary).toContainText('EU / ISO 54')

  for (const tab of ['Band', 'Setting', 'Accents', 'Engrave']) {
    await page.getByRole('tab', { name: tab }).click()
    await expect(page.getByRole('tabpanel', { name: tab })).toBeVisible()
  }
  await page.getByLabel('Inside engraving').fill('Forever')
  await expect(page.getByLabel('Inside engraving')).toHaveValue('Forever')
})

test('saves a custom template that survives a reload', async ({ page }) => {
  await page.getByRole('tab', { name: 'Metal' }).click()
  await page.getByLabel('Band metal').selectOption('rose-gold-18k')
  await page.getByRole('tab', { name: 'Templates' }).click()
  await page.getByLabel('Template name').fill('Anniversary')
  await page.getByRole('button', { name: 'Save', exact: true }).click()

  await page.reload()
  await page.getByRole('button', { name: 'Eternity band' }).click()
  await expect(page.getByTestId('summary')).not.toContainText('rose gold')
  await page.getByRole('button', { name: 'Anniversary', exact: true }).click()
  await expect(page.getByTestId('summary')).toContainText('18k rose gold')
})

test('opens a shared design link', async ({ page }) => {
  const spec = { name: 'Shared', band: { metal: 'platinum' }, stone: { shape: 'heart', carat: 2, gem: 'ruby' } }
  await page.goto(`/#d=${Buffer.from(JSON.stringify(spec)).toString('base64url')}`)
  await expect(page.getByTestId('summary')).toContainText('2.00 ct heart ruby · Platinum')
  await expect(page).not.toHaveURL(/#d=/)
})

test('opening a link keeps the unsaved design as a template', async ({ page }) => {
  await page.getByRole('tab', { name: 'Metal' }).click()
  await page.getByLabel('Band metal').selectOption('palladium')
  const spec = { name: 'Shared', stone: { shape: 'pear' } }
  await page.goto(`/#d=${Buffer.from(JSON.stringify(spec)).toString('base64url')}`)
  await expect(page.getByTestId('summary')).toContainText('pear')
  await page.getByRole('tab', { name: 'Templates' }).click()
  await page.getByRole('button', { name: 'Classic solitaire (before opening a link)', exact: true }).click()
  await expect(page.getByTestId('summary')).toContainText('Palladium')
})

test('share button copies a link that reopens the design', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.evaluate(() => Object.defineProperty(navigator, 'share', { value: undefined }))
  await page.getByRole('button', { name: 'Oval halo' }).click()
  await page.getByRole('button', { name: 'Share link' }).click()
  await expect(page.getByRole('status')).toHaveText('Link copied')
  const url = await page.evaluate(() => navigator.clipboard.readText())
  await page.evaluate(() => localStorage.clear())
  await page.goto(url)
  await expect(page.getByTestId('summary')).toContainText('1.20 ct oval diamond · Platinum')
})

test('import rejects a file that is not a design', async ({ page }) => {
  await page.locator('input[type=file]').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('nope') })
  await expect(page.getByRole('status')).toHaveText('That file is not a Ringon design')
})
