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

const NONE: HandLandmarkerResult = { landmarks: [], worldLandmarks: [], handedness: [], handednesses: [] }

class Tracker implements HandTracker {
  private canvas = document.createElement('canvas')
  /** The zoomed-out landmarker found the hand last time: try it first. */
  private zoomedFirst = false

  private full: HandLandmarker
  /** Loaded after the first one, so it doesn't delay tracking; null until then. */
  private zoomed: HandLandmarker | null = null

  constructor(full: HandLandmarker) {
    this.full = full
    createLandmarker().then(
      (z) => {
        // The first detection compiles the graph and stalls the page (seconds on a slow
        // device): do it now, while the camera starts, rather than mid-tracking.
        Object.assign(this.canvas, { width: 64, height: 64 })
        z.detectForVideo(this.canvas, performance.now())
        this.zoomed = z
      },
      () => {}, // without it, hands that fill the frame just aren't found
    )
  }

  private detectZoomed(video: HTMLVideoElement, timeMs: number): HandLandmarkerResult {
    if (!this.zoomed) return NONE
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

/** The service worker serves these files from this cache (runtimeCaching in vite.config.ts). */
const CACHE = 'ringon-hand-tracking'

async function prefetch(url: string): Promise<void> {
  const cache = 'caches' in globalThis ? await caches.open(CACHE) : null
  if (await cache?.match(url)) return
  const res = await fetch(url, { priority: 'low' })
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  // Into the service worker's cache too: Chrome's HTTP cache can skip a file this big (11 MB WASM).
  await (cache ? cache.put(url, res) : res.blob())
}

let prefetching: Promise<unknown> | null = null

/**
 * Download the WASM runtime and the model at low priority, without starting them: building a
 * landmarker stalls the page (GPU setup) for seconds, a download doesn't.
 */
export function prefetchHandTracking(): Promise<unknown> {
  prefetching ??= FilesetResolver.forVisionTasks(`${base}mediapipe`).then((f) =>
    Promise.all([f.wasmLoaderPath, f.wasmBinaryPath, `${base}models/hand_landmarker.task`].map(prefetch)),
  )
  prefetching.catch(() => (prefetching = null))
  return prefetching
}

let loading: Promise<HandTracker> | null = null

export function loadHandTracker(): Promise<HandTracker> {
  // A download already under way finishes first, so the landmarker reads it from the cache.
  loading ??= Promise.resolve(prefetching)
    .catch(() => {})
    .then(createLandmarker)
    .then((full) => new Tracker(full))
  loading.catch(() => (loading = null))
  return loading
}
