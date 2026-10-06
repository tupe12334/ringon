// Fake camera feeds for Chromium (it reads raw .y4m video), built from the fixtures:
// - hand: a photo of the back of a right hand, swaying and panning (see ATTRIBUTION.md)
// - still: the same photo, not moving (for pixel comparisons across page loads)
// - palm: real footage of a hand opening and closing, palm toward the camera
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const fixtures = fileURLToPath(new URL('./fixtures/', import.meta.url))
export const BACK_OF_HAND_FEED = `${fixtures}hand.y4m`
export const PALM_FEED = `${fixtures}palm.y4m`
export const STILL_HAND_FEED = `${fixtures}still-hand.y4m`

const ffmpeg = (...args: string[]) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args])

export default function globalSetup() {
  // Only the Chromium projects use these feeds (the macOS WebKit CI job sets this).
  if (process.env.NO_CAMERA_FEEDS) return
  if (!existsSync(BACK_OF_HAND_FEED))
    ffmpeg(
      '-loop', '1', '-i', `${fixtures}back-of-right-hand.png`, '-t', '4', '-r', '30',
      '-vf', "rotate='0.12*sin(2*PI*t/4)':fillcolor=white,crop=600:450:'20+20*sin(2*PI*t/2)':15,scale=640:480,format=yuv420p",
      BACK_OF_HAND_FEED,
    )
  if (!existsSync(STILL_HAND_FEED))
    ffmpeg('-loop', '1', '-i', `${fixtures}back-of-right-hand.png`, '-t', '2', '-r', '30', '-vf', 'scale=640:480,format=yuv420p', STILL_HAND_FEED)
  if (!existsSync(PALM_FEED)) ffmpeg('-i', `${fixtures}palm-to-camera.webm`, '-pix_fmt', 'yuv420p', PALM_FEED)
}
