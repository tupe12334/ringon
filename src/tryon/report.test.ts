import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { DEFAULT_SPEC } from '../ring/spec'
import { cameraInfo, finishReport, issueUrl, performanceStats, reportFileName, reportJson, TrackLog, type FrameInput, type ReportDraft } from './report'

const lm = (i: number) => ({ x: i / 21 + 1e-7, y: 0.5, z: -0.01, visibility: 0 })
const hand = { landmarks: [Array.from({ length: 21 }, (_, i) => lm(i))], worldLandmarks: [Array.from({ length: 21 }, (_, i) => lm(i))], handedness: [[{ categoryName: 'Right', score: 0.97, index: 0, displayName: '' }]], handednesses: [] }
const pose = { position: new THREE.Vector3(10, 20, 0), quaternion: new THREE.Quaternion(), pxPerMm: 4, axis: new THREE.Vector3(0, 1, 0), dorsal: new THREE.Vector3(0, 0, 1) }
const view = { videoWidth: 640, videoHeight: 480, width: 412, height: 915, mirrored: false }
const frame = (t: number, tracked = true): FrameInput => ({
  t, videoTime: t / 1000, inferenceMs: 20, frameMs: 33.3, view, along: 0.6, palmSide: 1, occluderVisible: tracked,
  result: tracked ? hand : { landmarks: [], worldLandmarks: [], handedness: [], handednesses: [] },
  pose: tracked ? pose : null, smoothed: tracked ? pose : null,
})

describe('bug report', () => {
  it('keeps the last 2 s of frames, landmarks as [x, y, z]', () => {
    const log = new TrackLog()
    for (let t = 0; t <= 3000; t += 100) log.push(frame(t, t !== 3000))
    expect(log.frames[0].t).toBe(1000)
    const tracked = log.frames.at(-2)!
    expect(tracked.hand!.image).toHaveLength(21)
    expect(tracked.hand!.world[3]).toEqual([3 / 21 + 1e-7, 0.5, -0.01])
    expect(tracked.hand!.handedness).toBe('Right')
    expect(tracked.smoothed!.position).toEqual([10, 20, 0])
    expect(log.frames.at(-1)!.hand).toBeNull()
    const perf = performanceStats(log.frames)
    expect(perf.trackerFps).toBeCloseTo(10)
    expect(perf.renderFps).toBeCloseTo(30, 0)
    expect(perf.trackedShare).toBeCloseTo(20 / 21)
  })

  it('leaves out camera ids', () => {
    const track = { getSettings: () => ({ deviceId: 'x', groupId: 'y', width: 1280, facingMode: 'user' }), getConstraints: () => ({}) } as unknown as MediaStreamTrack
    expect(cameraInfo(track)!.settings).toEqual({ width: 1280, facingMode: 'user' })
  })

  it('serialises a versioned report, and the issue link has text only', () => {
    const log = new TrackLog()
    log.push(frame(0))
    const draft = {
      ringonReport: 1, createdAt: '2026-11-01T10:20:30.000Z', app: { version: '0.0.0', commit: 'abcdef123456', language: 'en', search: '' },
      images: { raw: { dataUrl: 'data:image/jpeg;base64,RAW', width: 640, height: 480, videoTime: 0 }, composite: { dataUrl: 'data:image/jpeg;base64,COMP', width: 412, height: 915 } },
      frame: log.frames[0], history: log.frames, spec: DEFAULT_SPEC, performance: performanceStats(log.frames),
      tryOn: { status: 'tracking', finger: 'ring', hand: 'auto', flip: false, fit: 1, facing: 'environment', mirrored: false, lighting: { meanLuminance: 0.5, exposure: 1.05 } },
      device: { userAgent: 'UA', screen: { width: 412, height: 915 }, devicePixelRatio: 2.6, webgl: { renderer: 'GPU' } },
    } as unknown as ReportDraft
    const report = finishReport(draft, 'jitter', '  shakes a lot ')
    const json = JSON.parse(reportJson(report))
    expect(json.ringonReport).toBe(1)
    expect(json.user).toEqual({ category: 'jitter', comment: 'shakes a lot' })
    expect(json.frame.hand.image[0][0]).toBe(0) // rounded to 5 decimals
    expect(json.spec).toEqual(DEFAULT_SPEC)
    expect(reportFileName(report)).toBe('ringon-report-2026-11-01T10-20-30.json')
    const url = new URL(issueUrl(report))
    expect(url.origin + url.pathname).toBe('https://github.com/tupe12334/ringon/issues/new')
    expect(url.searchParams.get('title')).toBe('Try-on: jitter')
    expect(url.searchParams.get('body')).toContain('shakes a lot')
    expect(url.searchParams.get('body')).toContain('ringon-report-2026-11-01T10-20-30.json')
    expect(url.href).not.toContain('base64')
  })
})
