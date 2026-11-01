// "Report a problem" in the try-on: one JSON file with the frame the user saw, the frame the
// camera gave, what hand tracking found and what the app made of it, so a developer can
// reproduce it (and turn it into a photo fixture: scripts/report-to-fixture.mjs).
// Everything is built on the device; nothing is sent anywhere.

import type { HandLandmarkerResult } from '@mediapipe/tasks-vision'
import type { RingSpec } from '../ring/spec'
import type { Finger, Lm, RingPose, View } from './pose'

export const REPORT_VERSION = 1
export const CATEGORIES = ['position', 'size', 'angle', 'jitter', 'occlusion', 'lighting', 'other'] as const
export type Category = (typeof CATEGORIES)[number]
export const ISSUES_URL = 'https://github.com/tupe12334/ringon/issues/new'

/** How much tracking history a report keeps (for jitter). */
const HISTORY_MS = 2000

type Vec = number[]
export interface PoseJson {
  position: Vec
  quaternion: Vec
  pxPerMm: number
  axis: Vec
  dorsal: Vec
}
const poseJson = (p: RingPose | null): PoseJson | null =>
  p && { position: p.position.toArray(), quaternion: p.quaternion.toArray(), pxPerMm: p.pxPerMm, axis: p.axis.toArray(), dorsal: p.dorsal.toArray() }

const lms = (a: Lm[]) => a.map((l) => [l.x, l.y, l.z])

/** One tracked frame. Landmarks as [x, y, z], like e2e/fixtures/photos/landmarks.json. */
export interface FrameLog {
  /** performance.now(), ms. */
  t: number
  videoTime: number
  inferenceMs: number
  /** Time since the previous rendered frame. */
  frameMs: number
  view: View
  /** 0 = at the knuckle, 1 = at the middle joint. */
  along: number
  hand: { image: Vec[]; world: Vec[]; handedness: string; score: number } | null
  palmSide: 1 | -1 | null
  /** As computed from this frame, and after smoothing (what was drawn). */
  pose: PoseJson | null
  smoothed: PoseJson | null
  occluderVisible: boolean
}

export interface FrameInput extends Omit<FrameLog, 'hand' | 'pose' | 'smoothed'> {
  result: HandLandmarkerResult
  pose: RingPose | null
  smoothed: RingPose | null
}

/** The last ~2 s of tracking, kept in memory only. */
export class TrackLog {
  frames: FrameLog[] = []
  push({ result, pose, smoothed, ...rest }: FrameInput) {
    const [image, world] = [result.landmarks[0], result.worldLandmarks[0]]
    const label = result.handedness[0]?.[0]
    const hand = image && world ? { image: lms(image), world: lms(world), handedness: label?.categoryName ?? '', score: label?.score ?? 0 } : null
    this.frames.push({ ...rest, hand, pose: poseJson(pose), smoothed: poseJson(smoothed) })
    while (this.frames[0].t < rest.t - HISTORY_MS) this.frames.shift()
  }
}

const mean = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null)

export function performanceStats(frames: FrameLog[]) {
  const span = frames.length > 1 ? (frames.at(-1)!.t - frames[0].t) / 1000 : 0
  // Median: one stall (the tab in the background, a shader compiling) shouldn't skew it.
  const frameMs = frames.length ? frames.map((f) => f.frameMs).sort((a, b) => a - b)[frames.length >> 1] : null
  return {
    trackerFps: span ? (frames.length - 1) / span : null,
    inferenceMsMean: mean(frames.map((f) => f.inferenceMs)),
    inferenceMsMax: frames.length ? Math.max(...frames.map((f) => f.inferenceMs)) : null,
    /** Median time between rendered frames (tracking + drawing): a render-time upper bound. */
    frameMsMedian: frameMs,
    renderFps: frameMs ? 1000 / frameMs : null,
    trackedShare: frames.length ? frames.filter((f) => f.hand).length / frames.length : null,
  }
}

/** Track settings without the device and group ids (identifiers, of no use here). */
export function cameraInfo(track: MediaStreamTrack | undefined) {
  if (!track) return null
  const strip = (o: object | undefined) => o && Object.fromEntries(Object.entries(o).filter(([k]) => k !== 'deviceId' && k !== 'groupId'))
  return { settings: strip(track.getSettings()), capabilities: strip(track.getCapabilities?.()), constraints: strip(track.getConstraints()) }
}

export interface Settings {
  status: string
  finger: Finger
  hand: string
  flip: boolean
  fit: number
  facing: string
  mirrored: boolean
}

export interface SnapshotContext {
  video: HTMLVideoElement | null
  canvas: HTMLCanvasElement | null
  log: TrackLog
  spec: RingSpec
  settings: Settings
  /** The try-on's readout element: camera lighting writes its estimates there. */
  readout: HTMLElement | null
  language: string
}

const jpeg = (c: HTMLCanvasElement) => ({ dataUrl: c.toDataURL('image/jpeg', 0.92), width: c.width, height: c.height })

function rawFrame(video: HTMLVideoElement | null) {
  if (!video?.videoWidth) return null
  const c = Object.assign(document.createElement('canvas'), { width: video.videoWidth, height: video.videoHeight })
  c.getContext('2d')!.drawImage(video, 0, 0)
  return { ...jpeg(c), videoTime: video.currentTime }
}

function gpuInfo(canvas: HTMLCanvasElement | null) {
  // The renderer's own context (getContext returns the existing one).
  const gl = canvas?.getContext('webgl2')
  if (!gl) return null
  const dbg = gl.getExtension('WEBGL_debug_renderer_info')
  return {
    vendor: gl.getParameter(gl.VENDOR),
    renderer: gl.getParameter(gl.RENDERER),
    unmaskedVendor: dbg && gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL),
    unmaskedRenderer: dbg && gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL),
    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
  }
}

/** Everything but the user's answer, taken at one instant (when they press the button). */
export function snapshotReport({ video, canvas, log, spec, settings, readout, language }: SnapshotContext) {
  const frames = log.frames.slice()
  const nav = navigator as Navigator & { deviceMemory?: number; userAgentData?: { platform: string; mobile: boolean } }
  return {
    ringonReport: REPORT_VERSION,
    createdAt: new Date().toISOString(),
    app: { version: __APP_VERSION__, commit: __APP_COMMIT__, language, search: location.search },
    images: {
      /** As the camera delivered it (never mirrored): the landmarks are normalised to this image. */
      raw: rawFrame(video),
      /** The try-on as the user saw it, ring included. */
      composite: canvas ? jpeg(canvas) : null,
    },
    /** The latest tracked frame; `history` holds the last ~2 s, oldest first. */
    frame: frames.at(-1) ?? null,
    history: frames,
    tryOn: {
      ...settings,
      lighting: { meanLuminance: Number(readout?.dataset.lightMean) || null, exposure: Number(readout?.dataset.lightExposure) || null },
    },
    spec,
    camera: { ...cameraInfo((video?.srcObject as MediaStream | null)?.getVideoTracks()[0]), video: video && { width: video.videoWidth, height: video.videoHeight } },
    performance: performanceStats(frames),
    device: {
      userAgent: nav.userAgent,
      platform: nav.userAgentData?.platform ?? nav.platform,
      mobile: nav.userAgentData?.mobile ?? null,
      languages: [...nav.languages],
      hardwareConcurrency: nav.hardwareConcurrency,
      deviceMemoryGb: nav.deviceMemory ?? null,
      maxTouchPoints: nav.maxTouchPoints,
      screen: { width: screen.width, height: screen.height, orientation: screen.orientation?.type ?? null },
      viewport: { width: innerWidth, height: innerHeight },
      devicePixelRatio,
      webgl: gpuInfo(canvas),
      webgpu: 'gpu' in navigator,
    },
  }
}

export type ReportDraft = ReturnType<typeof snapshotReport>
export type Report = ReportDraft & { user: { category: Category; comment: string } }

export const finishReport = (draft: ReportDraft, category: Category, comment: string): Report => ({ ...draft, user: { category, comment: comment.trim() } })

/** Numbers rounded to 5 decimals: landmarks keep their precision, the file stays small. */
export const reportJson = (r: Report) => JSON.stringify(r, (_, v) => (typeof v === 'number' ? Math.round(v * 1e5) / 1e5 : v), 1)

export const reportFileName = (r: Pick<Report, 'createdAt'>) => `ringon-report-${r.createdAt.slice(0, 19).replace(/:/g, '-')}.json`

/** A prefilled GitHub issue: text only, the user attaches the file (it holds the photos). */
export function issueUrl(r: Report) {
  const d = r.device
  const body = [
    `**What looks wrong:** ${r.user.category}`,
    '',
    r.user.comment.slice(0, 1500) || '_(no comment)_',
    '',
    `- App: ${r.app.version} (${r.app.commit.slice(0, 7)}), ${r.app.language}`,
    `- Device: ${d.userAgent}`,
    `- Screen: ${d.screen.width}×${d.screen.height} @${d.devicePixelRatio}x, GPU: ${d.webgl?.unmaskedRenderer ?? d.webgl?.renderer ?? '?'}`,
    `- Tracking: ${r.tryOn.status}, finger ${r.tryOn.finger}, ${r.performance.trackerFps?.toFixed(1) ?? '?'} fps`,
    '',
    `**Please attach \`${reportFileName(r)}\`** (downloaded from the app; it holds a photo of the hand).`,
  ].join('\n')
  return `${ISSUES_URL}?${new URLSearchParams({ title: `Try-on: ${r.user.category}`, body })}`
}
