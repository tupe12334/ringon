import { defineConfig, devices } from '@playwright/test'
import { BACK_OF_HAND_FEED, PALM_FEED, STILL_HAND_FEED } from './e2e/fake-camera'

// PORT: run beside another checkout's preview server.
const port = Number(process.env.PORT ?? 4173)

/** An emulated phone whose camera plays `feed`. */
const phone = (feed: string) => ({
  ...devices['Pixel 7'],
  launchOptions: {
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-video-capture=${feed}`,
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
    ],
  },
})

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  // Software WebGL + hand tracking is CPU-heavy: parallel browsers starve each other.
  workers: 1,
  // Software WebGL on a shared runner occasionally starves or crashes the browser; a retried
  // pass is reported as flaky.
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  globalSetup: './e2e/fake-camera.ts',
  use: {
    baseURL: `http://localhost:${port}`,
    permissions: ['camera'],
    // Screen capture (tracing's screencast, mid-test screenshots) can stall the fake camera
    // feed in headless Chromium: no tracing, and screenshots only at the end.
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'phone', testIgnore: /real-hand|still-hand|photos|photoreal|tryon-webkit/, use: phone(BACK_OF_HAND_FEED) },
    { name: 'phone-still-hand', testMatch: /still-hand/, use: phone(STILL_HAND_FEED) },
    { name: 'phone-photoreal', testMatch: /photoreal/, use: phone(BACK_OF_HAND_FEED) },
    { name: 'phone-real-hand', testMatch: /real-hand/, use: phone(PALM_FEED) },
    // iPhone Safari's engine: designer flows plus a try-on smoke test (WebKit's mock camera
    // shows a test pattern, so it checks camera, MediaPipe, MP4 recording; not tracking).
    // Linux WebKit has no mock camera: CI runs this project in a macOS job instead.
    ...(process.env.SKIP_WEBKIT ? [] : [{ name: 'iphone-webkit', testMatch: /(designer|tryon-webkit)\.spec\.ts$/, use: { ...devices['iPhone 14'] } }]),
    // Still photos stand in for the camera (photo-camera.ts); the viewport is sized per photo.
    {
      name: 'photos',
      testMatch: /photos/,
      use: { ...devices['Desktop Chrome'], launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } },
    },
  ],
  webServer: {
    command: `pnpm build && pnpm preview --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    // Always build: a leftover preview server would serve a stale build.
    reuseExistingServer: false,
    timeout: 180_000,
  },
})
