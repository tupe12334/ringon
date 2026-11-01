import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

// "Report a problem" in the try-on: the downloaded file holds what a developer needs to
// reproduce the frame (see src/tryon/report.ts). The fake camera shows the back of a right hand.
test.describe.configure({ timeout: 180_000 })

test('reports a problem as a JSON file with the frame, landmarks, pose and device', async ({ page }) => {
  await page.goto('/#try')
  await expect(page.getByTestId('tracking-status')).toHaveAttribute('data-status', 'tracking', { timeout: 60_000 })
  await expect(page.getByTestId('pose')).toHaveAttribute('data-visible', 'true')
  await page.waitForTimeout(1000) // some tracking history

  await page.getByRole('button', { name: 'Report a problem' }).click()
  const sheet = page.getByRole('dialog', { name: 'Report a problem' })
  await expect(sheet).toContainText('A photo of your hand')
  await expect(sheet.getByRole('button', { name: 'Download report' })).toBeDisabled()
  await sheet.getByRole('radio', { name: 'Jitters' }).click()
  await sheet.getByRole('textbox', { name: 'Comment' }).fill('Shakes when I hold still')

  const issue = new URL((await sheet.getByRole('link', { name: /GitHub issue/ }).getAttribute('href'))!)
  expect(issue.searchParams.get('title')).toBe('Try-on: jitter')
  expect(issue.searchParams.get('body')).toContain('Shakes when I hold still')
  expect(issue.href).not.toContain('data%3Aimage')

  const [download] = await Promise.all([page.waitForEvent('download'), sheet.getByRole('button', { name: 'Download report' }).click()])
  expect(download.suggestedFilename()).toMatch(/^ringon-report-\d{4}-\d\d-\d\dT[\d-]+\.json$/)
  const file = test.info().outputPath('report.json')
  await download.saveAs(file)
  const text = readFileSync(file, 'utf8')
  const report = JSON.parse(text)
  await test.info().attach('size', { body: `${text.length} bytes` })

  expect(report.ringonReport).toBe(1)
  expect(report.user).toEqual({ category: 'jitter', comment: 'Shakes when I hold still' })
  for (const img of [report.images.raw, report.images.composite]) {
    expect(img.dataUrl).toMatch(/^data:image\/jpeg;base64,/)
    expect(img.dataUrl.length).toBeGreaterThan(10_000)
  }
  expect([report.images.raw.width, report.images.raw.height]).toEqual([640, 480])
  expect(report.frame.hand.image).toHaveLength(21)
  expect(report.frame.hand.world).toHaveLength(21)
  expect(report.frame.hand.handedness).toMatch(/Left|Right/)
  expect(report.history.length).toBeGreaterThan(1)
  expect(report.frame.smoothed.pxPerMm).toBeGreaterThan(0)
  expect(report.frame.pose.quaternion).toHaveLength(4)
  expect(report.tryOn).toMatchObject({ status: 'tracking', finger: 'ring', hand: 'auto', flip: false, fit: 1 })
  expect(report.spec.innerDiameterMm).toBeGreaterThan(10)
  expect(report.camera.settings.width).toBe(640)
  expect(report.camera.settings.deviceId).toBeUndefined()
  expect(report.performance.trackerFps).toBeGreaterThan(0)
  expect(report.device.userAgent).toBeTruthy()
  expect(report.device.devicePixelRatio).toBeGreaterThan(0)
  expect(report.device.webgl.renderer).toBeTruthy()
  expect(typeof report.device.webgpu).toBe('boolean')
  expect(report.app.commit).toBeTruthy()

  await sheet.getByRole('button', { name: 'Close' }).click()
  await expect(sheet).toBeHidden()
})
