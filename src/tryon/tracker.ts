// MediaPipe hand tracking. Model and WASM are served from this app (no third-party CDN), so
// try-on keeps working offline once cached.

import { FilesetResolver, HandLandmarker, type HandLandmarkerResult, type NormalizedLandmark } from '@mediapipe/tasks-vision'

const base = import.meta.env.BASE_URL

/**
 * MediaPipe's palm detector misses a hand that fills the frame (a phone held close, a
 * close-up photo). When the full frame finds no hand, a second landmarker looks at the frame
 * shrunk by this factor in the middle of an empty canvas.
 */
export const ZOOM_OUT = 2

export interface HandTracker {
  detect(video: HTMLVideoElement, timeMs: number): HandLandmarkerResult
}

async function createLandmarker(): Promise<HandLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(`${base}mediapipe`)
  const options = (delegate: 'GPU' | 'CPU') => ({
    baseOptions: { modelAssetPath: `${base}models/hand_landmarker.task`, delegate },
    runningMode: 'VIDEO' as const,
    numHands: 1,
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  })
  try {
    return await HandLandmarker.createFromOptions(fileset, options('GPU'))
  } catch {
    return await HandLandmarker.createFromOptions(fileset, options('CPU'))
  }
}

/** Landmark in the zoomed-out canvas → landmark in the video frame. */
export const unzoom = (l: NormalizedLandmark): NormalizedLandmark => ({
  ...l,
  x: (l.x - 0.5) * ZOOM_OUT + 0.5,
  y: (l.y - 0.5) * ZOOM_OUT + 0.5,
  z: l.z * ZOOM_OUT,
})

class Tracker implements HandTracker {
  private canvas = document.createElement('canvas')
  /** The zoomed-out landmarker found the hand last time: try it first. */
  private zoomedFirst = false

  private full: HandLandmarker
  private zoomed: HandLandmarker

  constructor(full: HandLandmarker, zoomed: HandLandmarker) {
    this.full = full
    this.zoomed = zoomed
  }

  private detectZoomed(video: HTMLVideoElement, timeMs: number): HandLandmarkerResult {
    const { videoWidth: w, videoHeight: h } = video
    const c = this.canvas
    if (c.width !== w || c.height !== h) Object.assign(c, { width: w, height: h })
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#808080'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(video, (w - w / ZOOM_OUT) / 2, (h - h / ZOOM_OUT) / 2, w / ZOOM_OUT, h / ZOOM_OUT)
    const r = this.zoomed.detectForVideo(c, timeMs)
    return { ...r, landmarks: r.landmarks.map((hand) => hand.map(unzoom)) }
  }

  detect(video: HTMLVideoElement, timeMs: number): HandLandmarkerResult {
    const first = this.zoomedFirst ? this.detectZoomed(video, timeMs) : this.full.detectForVideo(video, timeMs)
    if (first.landmarks.length) return first
    const second = this.zoomedFirst ? this.full.detectForVideo(video, timeMs) : this.detectZoomed(video, timeMs)
    if (second.landmarks.length) this.zoomedFirst = !this.zoomedFirst
    return second
  }
}

let loading: Promise<HandTracker> | null = null

export function loadHandTracker(): Promise<HandTracker> {
  loading ??= Promise.all([createLandmarker(), createLandmarker()]).then(([full, zoomed]) => new Tracker(full, zoomed))
  loading.catch(() => (loading = null))
  return loading
}
