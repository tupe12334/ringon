// MediaPipe hand tracking. Model and WASM are served from this app (no third-party CDN), so
// try-on keeps working offline once cached.

import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'

const base = import.meta.env.BASE_URL

let loading: Promise<HandLandmarker> | null = null

export function loadHandLandmarker(): Promise<HandLandmarker> {
  loading ??= (async () => {
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
  })()
  loading.catch(() => (loading = null))
  return loading
}
