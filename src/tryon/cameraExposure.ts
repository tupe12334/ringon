// Plain maths for camera-matched lighting (see cameraLighting.tsx).

/** Mid-grey for a frame's mean luminance (0–1): brighter frames raise exposure, darker lower it. */
const TARGET_LUMINANCE = 0.45

/**
 * Tone-mapping exposure for a frame of mean luminance `mean` (0–1). Square root: the ring should
 * follow the room's brightness, but gently, as an eye adapting rather than a light meter.
 */
export function exposureFor(mean: number) {
  if (!Number.isFinite(mean) || mean <= 0) return 1
  return Math.min(1.4, Math.max(0.6, Math.sqrt(mean / TARGET_LUMINANCE)))
}

/** Mean luma of RGBA sRGB pixels (Rec. 709 weights on the encoded values), 0–1. A brightness
 * heuristic, not linear relative luminance. */
export function meanLuminance(rgba: Uint8ClampedArray) {
  let sum = 0
  for (let i = 0; i < rgba.length; i += 4) sum += 0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2]
  return sum / (rgba.length / 4) / 255
}

/** `?light=studio` keeps the fixed studio lighting in the try-on (for comparisons). */
export const CAMERA_LIGHTING = typeof location === 'undefined' || new URLSearchParams(location.search).get('light') !== 'studio'
