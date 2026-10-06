import { expect, test, type Page } from '@playwright/test'

/** Options shown as picture tiles are radios inside a radiogroup named after the field. */
const option = (page: Page, group: string, name: string) =>
  page.getByRole('radiogroup', { name: group, exact: true }).getByRole('radio', { name, exact: true })
const pick = (page: Page, group: string, name: string) => option(page, group, name).click()

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('customises every section and updates the summary', async ({ page }) => {
  const summary = page.getByTestId('summary')
  await expect(summary).toContainText('18k yellow gold')

  await page.getByRole('tab', { name: 'Metal' }).click()
  await pick(page, 'Band metal', 'Platinum')
  await expect(summary).toContainText('Platinum')

  await page.getByRole('tab', { name: 'Stone', exact: true }).click()
  await page.getByRole('radio', { name: 'Oval' }).click()
  await pick(page, 'Gem', 'Blue sapphire')
  await expect(summary).toContainText('oval blue sapphire')

  await page.getByRole('tab', { name: 'Size' }).click()
  await page.getByRole('radio', { name: 'EU / ISO' }).click()
  await page.getByLabel('Ring size').selectOption('54')
  await expect(summary).toContainText('EU / ISO 54')

  for (const tab of ['Band', 'Setting', 'Side stones', 'Band stones', 'Engrave']) {
    await page.getByRole('tab', { name: tab, exact: true }).click()
    await expect(page.getByRole('tabpanel', { name: tab, exact: true })).toBeVisible()
  }
  await page.getByLabel('Inside engraving').fill('Forever')
  await expect(page.getByLabel('Inside engraving')).toHaveValue('Forever')
})

test('saves a custom template that survives a reload', async ({ page }) => {
  await page.getByRole('tab', { name: 'Metal' }).click()
  await pick(page, 'Band metal', '18k rose gold')
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
  await expect(page).toHaveURL(/#r=/)
})

test('the address bar always links to the design on screen', async ({ page, browser }) => {
  await page.getByRole('button', { name: 'Oval halo' }).click()
  await page.getByRole('tab', { name: 'Metal' }).click()
  await pick(page, 'Band metal', 'Palladium')
  const summary = await page.getByTestId('summary').textContent()
  const fresh = await browser.newPage()
  await fresh.goto(page.url())
  await expect(fresh.getByTestId('summary')).toHaveText(summary!)
  expect(page.url().length).toBeLessThan(700)
  await fresh.close()
})

test('opening a link keeps the unsaved design as a template', async ({ page }) => {
  await page.getByRole('tab', { name: 'Metal' }).click()
  await pick(page, 'Band metal', 'Palladium')
  const spec = { name: 'Shared', stone: { shape: 'pear' } }
  await page.goto(`/#d=${Buffer.from(JSON.stringify(spec)).toString('base64url')}`)
  await expect(page.getByTestId('summary')).toContainText('pear')
  await page.getByRole('tab', { name: 'Templates' }).click()
  await page.getByRole('button', { name: 'Classic solitaire (before opening a link)', exact: true }).click()
  await expect(page.getByTestId('summary')).toContainText('Palladium')
})

test('share button copies a link that reopens the design', async ({ page, context, browserName }) => {
  test.skip(browserName === 'webkit', "Playwright can't grant clipboard permissions in WebKit")
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.evaluate(() => Object.defineProperty(navigator, 'share', { value: undefined }))
  await page.getByRole('button', { name: 'Oval halo' }).click()
  await page.getByRole('button', { name: 'Share link' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Link copied' })).toBeVisible()
  const url = await page.evaluate(() => navigator.clipboard.readText())
  await page.evaluate(() => localStorage.clear())
  await page.goto(url)
  await expect(page.getByTestId('summary')).toContainText('1.20 ct oval diamond · Platinum')
})

test('import rejects a file that is not a design', async ({ page }) => {
  await page.locator('input[type=file]').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('nope') })
  await expect(page.getByRole('status').filter({ hasText: 'That file is not a Ringon design' })).toBeVisible()
})

test('sets three-stone side stones, their shape and orientation', async ({ page }) => {
  await page.getByRole('tab', { name: 'Side stones' }).click()
  await page.getByRole('radio', { name: 'Three stone' }).click()
  await pick(page, 'Side stone shape', 'Half moon')
  await page.getByRole('button', { name: 'Flat edge to centre' }).click()
  await expect(page.getByLabel('Side stone rotation')).toHaveValue('90')
  await pick(page, 'Side stone shape', 'Pear')
  await page.getByRole('button', { name: 'Point outward' }).click()
  await expect(page.getByRole('button', { name: 'Point outward' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('Side stone rotation')).toHaveValue('-90')
  await pick(page, 'Side stone gem', 'Blue sapphire')
  await page.getByRole('radio', { name: 'Bezel' }).click()
  await page.getByLabel('Mirror left stones').click()
  await expect(page.getByLabel('Mirror left stones')).not.toBeChecked()
  await expect(page.getByRole('button', { name: 'Point outward' })).toHaveAttribute('aria-pressed', 'false')

  // Bezel look is set on the Setting tab and applies to the side bezels too.
  await page.getByRole('tab', { name: 'Setting' }).click()
  await page.getByRole('radio', { name: 'Milgrain' }).click()
  await page.getByLabel('Bezel wall').fill('1.2')
  await expect(page.getByText('1.2 mm · chunky')).toBeVisible()

  // The design persists across a reload.
  await page.reload()
  await page.getByRole('tab', { name: 'Side stones' }).click()
  await expect(option(page, 'Side stone shape', 'Pear')).toHaveAttribute('aria-checked', 'true')
  await expect(option(page, 'Side stone gem', 'Blue sapphire')).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByLabel('Mirror left stones')).not.toBeChecked()
  await expect(page.getByRole('radio', { name: 'Bezel' })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('tab', { name: 'Setting' }).click()
  await expect(page.getByRole('radio', { name: 'Milgrain' })).toHaveAttribute('aria-checked', 'true')
})

test('builds a five stone ring with a pavé band, and a toi et moi', async ({ page }) => {
  await page.getByRole('tab', { name: 'Side stones' }).click()
  await page.getByRole('radio', { name: 'Five stone' }).click()
  await expect(page.getByLabel('Graduation')).toBeVisible()
  await page.getByRole('tab', { name: 'Band stones' }).click()
  await page.getByRole('radio', { name: 'Pavé' }).click()
  // Side stones and band stones combine (e.g. a trilogy on a pavé band).
  await page.getByRole('tab', { name: 'Side stones' }).click()
  await expect(page.getByRole('radio', { name: 'Five stone' })).toHaveAttribute('aria-checked', 'true')

  await page.getByRole('radio', { name: 'Toi et moi (pair)' }).click()
  await expect(page.getByLabel('Diagonal offset')).toBeVisible()
  await expect(page.getByLabel('Partner stone size')).toBeVisible()
})

test('half bezel walls and hidden or double halo', async ({ page }) => {
  await page.getByRole('tab', { name: 'Setting' }).click()
  await page.getByRole('radio', { name: 'Half bezel' }).click()
  await page.getByRole('radio', { name: 'On the ends (open sides)' }).click()
  await expect(page.getByRole('radio', { name: 'On the ends (open sides)' })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('checkbox', { name: 'Halo', exact: true }).click()
  await expect(page.getByRole('checkbox', { name: 'Halo', exact: true })).toBeChecked()
  await page.getByRole('radio', { name: 'Double' }).click()
  await page.getByRole('radio', { name: 'Hidden (under the stone)' }).click()
  await expect(page.getByRole('radio', { name: 'Double' })).toHaveCount(0)
})

test('opens every real-ring example', async ({ page }) => {
  for (const name of ['Oval with half moons', 'Cushion trilogy on pavé', 'Toi et moi with emerald pear', 'East-west half bezel oval', 'Bezel eternity', 'Hidden halo oval']) {
    await page.getByRole('tab', { name: 'Templates' }).click()
    await page.getByRole('button', { name, exact: true }).click()
    await expect(page.getByTestId('summary')).toBeVisible()
  }
  await page.getByRole('tab', { name: 'Side stones' }).click()
  await expect(page.getByRole('radio', { name: 'None' })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('tab', { name: 'Band stones' }).click()
  await expect(page.getByLabel('Bezel-set (each stone in its own rim)')).not.toBeChecked()
})

test('switches to Hebrew, right to left, and remembers it', async ({ page }) => {
  const summary = page.getByTestId('summary')
  await page.getByRole('button', { name: 'Switch to Hebrew' }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.locator('html')).toHaveAttribute('lang', 'he')
  await expect(summary).toContainText('זהב צהוב 18K')

  await page.getByRole('tab', { name: 'מתכת' }).click()
  await pick(page, 'מתכת החישוק', 'פלטינה')
  await expect(summary).toContainText('פלטינה')
  await expect(page.getByRole('button', { name: 'מדידה על היד' })).toBeVisible()

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await page.getByRole('button', { name: 'החלפה לאנגלית' }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
  await expect(summary).toContainText('Platinum')
})

test('a ?lng=he link opens in Hebrew', async ({ page }) => {
  await page.goto('/?lng=he')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('tab', { name: 'תבניות' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'להתחיל מעיצוב קלאסי' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'סוליטר קלאסי' })).toBeVisible()
})

test('a try-on chunk gone after a redeploy asks to reload instead of a blank page', async ({ page }) => {
  await page.route(/\/assets\/TryOn-[^/]*\.js$/, (route) => route.fulfill({ status: 404 }))
  await page.getByRole('button', { name: 'Try on my hand' }).click()
  await expect(page.getByRole('alert')).toContainText('Ringon was updated')
  await page.unroute(/\/assets\/TryOn-/)
  await page.getByRole('button', { name: 'Reload' }).click()
  await expect(page.locator('.tryon')).toBeVisible()
  await expect(page.getByRole('alert')).toBeHidden()
})

test('link previews point at the published card image', async ({ page }) => {
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\.png$/)
  const card = await page.request.get('/og.png')
  expect(card.ok()).toBe(true)
})

test('rotation can be locked in the preview', async ({ page }) => {
  // The WebGL canvas alone (preserveDrawingBuffer), not the path-traced overlay above it.
  const canvas = page.getByTestId('preview').locator('canvas').first()
  await expect(canvas).toBeVisible()
  const pixels = () => canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL())
  // Wait until two reads 500 ms apart match: camera fit and damping have settled.
  const still = async () => {
    let prev = ''
    await expect
      .poll(async () => {
        const now = await pixels()
        const same = now === prev
        prev = now
        return same
      }, { intervals: [500], timeout: 30_000 })
      .toBe(true)
    return prev
  }
  const drag = async () => {
    const box = (await canvas.boundingBox())!
    const [x, y] = [box.x + box.width / 2, box.y + box.height / 2]
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + 150, y, { steps: 10 })
    await page.mouse.up()
  }

  // Real-time rendering only: path tracing keeps refining the image while the view is still.
  const photoreal = page.getByRole('button', { name: /Photoreal/ })
  // Retried: the auto-pause on slow devices can flip it between the read and the click.
  await expect(async () => {
    if ((await photoreal.getAttribute('aria-pressed')) === 'true') await photoreal.click()
    await expect(photoreal).toHaveAttribute('aria-pressed', 'false', { timeout: 2000 })
  }).toPass({ timeout: 30_000 })

  const lock = page.getByRole('button', { name: 'Lock rotation' })
  await expect(lock).toHaveAttribute('aria-pressed', 'false')
  await lock.click()
  await expect(lock).toHaveAttribute('aria-pressed', 'true')
  const before = await still()
  await drag()
  expect(await still()).toBe(before)

  await lock.click()
  await expect(lock).toHaveAttribute('aria-pressed', 'false')
  await drag()
  await expect.poll(pixels).not.toBe(before)
})
