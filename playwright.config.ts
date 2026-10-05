import { defineConfig, devices } from '@playwright/test'
import { FAKE_CAMERA_VIDEO } from './e2e/fake-camera'

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  // Software WebGL + hand tracking is CPU-heavy: parallel browsers starve each other.
  workers: 1,
  globalSetup: './e2e/fake-camera.ts',
  use: {
    baseURL: 'http://localhost:4173',
    permissions: ['camera'],
    // Tracing's screencast stalls the fake camera feed in headless Chromium; use screenshots.
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'phone',
      use: {
        ...devices['Pixel 7'],
        launchOptions: {
          args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            `--use-file-for-fake-video-capture=${FAKE_CAMERA_VIDEO}`,
            '--use-angle=swiftshader',
            '--enable-unsafe-swiftshader',
          ],
        },
      },
    },
  ],
  webServer: {
    command: 'pnpm build && pnpm preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
