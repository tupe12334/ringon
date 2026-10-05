// When the designer path traces, as plain logic so it can be tested without a GPU.

/** `stored`: the user's saved preference. `tooSlow`: this device couldn't keep up. `forced`: the
 * user turned it back on after it was paused for slowness (this session only). */
export interface PhotorealState {
  stored: boolean
  tooSlow: boolean
  forced: boolean
}

export const isPhotorealOn = (s: PhotorealState) => s.stored && (!s.tooSlow || s.forced)

/** Shown when the device paused photoreal on its own. */
export const isPausedForSlowness = (s: PhotorealState) => s.stored && s.tooSlow && !s.forced

export function togglePhotoreal(s: PhotorealState): PhotorealState {
  return isPhotorealOn(s) ? { ...s, stored: false, forced: false } : { ...s, stored: true, forced: s.tooSlow }
}

/** The device couldn't keep up; ignored once the user has insisted. */
export const markTooSlow = (s: PhotorealState): PhotorealState => (s.forced ? s : { ...s, tooSlow: true })

/**
 * Decides from sample render times whether path tracing is freezing the page. The first samples
 * after a scene change include shader compiles and BVH uploads, so they don't count.
 */
export class SampleTimer {
  private times: number[] = []
  private seen = 0
  private readonly maxMs: number
  private readonly window: number
  private readonly skip: number

  constructor(maxMs = 120, window = 8, skip = 3) {
    this.maxMs = maxMs
    this.window = window
    this.skip = skip
  }

  reset() {
    this.times = []
    this.seen = 0
  }

  /** Record one sample's duration; true once the recent average is too slow. */
  record(ms: number) {
    if (++this.seen <= this.skip) return false
    this.times.push(ms)
    if (this.times.length > this.window) this.times.shift()
    return this.times.length === this.window && this.times.reduce((a, b) => a + b, 0) / this.window > this.maxMs
  }
}
