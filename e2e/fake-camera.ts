// Builds the fake camera feed: a photo of the back of a right hand (MediaPipe test asset,
// Apache-2.0), gently swaying and panning, so tracking has to follow real motion.
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))
export const FAKE_CAMERA_VIDEO = `${here}fixtures/hand.y4m`
const SOURCE = `${here}fixtures/back-of-right-hand.png`

export default function globalSetup() {
  if (existsSync(FAKE_CAMERA_VIDEO)) return
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error', '-loop', '1', '-i', SOURCE, '-t', '4', '-r', '30',
    '-vf', "rotate='0.12*sin(2*PI*t/4)':fillcolor=white,crop=600:450:'20+20*sin(2*PI*t/2)':15,scale=640:480,format=yuv420p",
    FAKE_CAMERA_VIDEO,
  ])
}
