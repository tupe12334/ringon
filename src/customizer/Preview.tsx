// The designer's 3D view. Real-time while the user edits or drags; once the view has been
// still for a moment, a progressive path tracer (three-gpu-pathtracer) takes over and
// simulates real light transport: soft studio light, true refraction and caustics in the
// stones, reflections between metal surfaces, and the ring's real shadow on the floor.

import { Bounds, ContactShadows, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { WebGLPathTracer } from 'three-gpu-pathtracer'
import { RingModel, StudioEnvironment, type RenderMode } from '../ring/RingModel'
import { isPausedForSlowness, isPhotorealOn, markTooSlow, SampleTimer, togglePhotoreal } from './photoreal'
import type { RingSpec } from '../ring/spec'
import { useStore } from '../templates/store'

const BACKGROUND = '#f3f1ee'
/** How long the view must be still before path tracing starts, ms. */
const SETTLE_MS = 600
/** Samples per pixel to stop at: converged enough, then the GPU rests. */
export const MAX_SAMPLES = 256
/** A path-trace sample slower than this (ms, averaged) makes the page feel frozen. */
const MAX_SAMPLE_MS = 120

/** CPU-emulated WebGL (no GPU): path tracing would lock the page. */
function isSoftwareRenderer(gl: THREE.WebGLRenderer) {
  const ctx = gl.getContext()
  const info = ctx.getExtension('WEBGL_debug_renderer_info')
  const name = String(info ? ctx.getParameter(info.UNMASKED_RENDERER_WEBGL) : ctx.getParameter(ctx.RENDERER))
  return /swiftshader|llvmpipe|software|basic render/i.test(name)
}

/** Phones and tablets: fewer, cheaper samples to spare battery. */
const isTouchDevice = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches

/** Frames a throwaway tracer runs before the real one (see PathTracer). */
const WARM_UP_FRAMES = 90

function releaseRenderer(renderer: THREE.WebGLRenderer) {
  renderer.dispose()
  // dispose() keeps the WebGL context; browsers cap live contexts (~16) and evict the oldest.
  renderer.forceContextLoss()
}

/**
 * Path tracing with three-gpu-pathtracer, drawn on its own canvas laid over the real-time one.
 * While `mode` is 'pathtrace' it accumulates samples (one per animation frame, stopping at the
 * cap); otherwise, and until the first sample is ready, the normal real-time render shows.
 *
 * Measured quirk: the first tracer that processes a scene renders every transmissive surface
 * (all gemstones) almost black, persistently; tracers created after it are correct. So once per
 * Canvas, a throwaway tracer on a tiny offscreen canvas processes the scene first (about a
 * second, the real-time view stays up); then one tracer is kept for the Canvas's lifetime.
 */
function PathTracer({
  spec,
  mode,
  overlay,
  readout,
  onTooSlow,
  force,
}: {
  spec: RingSpec
  mode: RenderMode
  overlay: React.RefObject<HTMLCanvasElement | null>
  readout: React.RefObject<HTMLElement | null>
  /** The device can't path trace without freezing the page. */
  onTooSlow: () => void
  /** The user asked for path tracing anyway: don't stop for slowness. */
  force: boolean
}) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const dpr = useThree((s) => s.viewport.dpr)
  // Persist across still periods: the warm-up's progress and the real tracer.
  const engine = useRef<{
    warm?: { renderer: THREE.WebGLRenderer; tracer: WebGLPathTracer; frames: number }
    main?: { renderer: THREE.WebGLRenderer; tracer: WebGLPathTracer }
  }>({})
  const showing = useRef(false)

  // Release everything with the Canvas.
  useEffect(() => {
    const e = engine.current
    return () => {
      if (e.warm) {
        e.warm.tracer.dispose()
        releaseRenderer(e.warm.renderer)
      }
      // The overlay canvas outlives this component; a later renderer reuses its context, so
      // dispose without forcing the context lost.
      e.main?.tracer.dispose()
      e.main?.renderer.dispose()
      e.warm = e.main = undefined
    }
  }, [])

  // The mode readout follows React commits, not render frames: on a slow GPU frames can stall.
  useEffect(() => {
    // oxlint-disable-next-line react/immutability -- progress readout on a DOM element
    if (readout.current) readout.current.dataset.mode = mode
  }, [mode, readout])

  useEffect(() => {
    const canvas = overlay.current
    const out = readout.current
    if (mode !== 'pathtrace' || !canvas) return
    const software = isSoftwareRenderer(gl)
    if (software && !force) {
      onTooSlow()
      return
    }
    const touch = isTouchDevice()
    const maxSamples = touch ? MAX_SAMPLES / 2 : MAX_SAMPLES
    const e = engine.current
    const timer = new SampleTimer(MAX_SAMPLE_MS)
    let frame = 0

    const makeRenderer = (target: HTMLCanvasElement) => {
      const renderer = new THREE.WebGLRenderer({ canvas: target, preserveDrawingBuffer: true })
      renderer.toneMapping = gl.toneMapping
      renderer.outputColorSpace = gl.outputColorSpace
      return renderer
    }
    // Each sample blocks the page while it renders; on a slow GPU that freezes the UI.
    const sample = (tracer: WebGLPathTracer) => {
      const start = performance.now()
      tracer.renderSample()
      const slow = !force && timer.record(performance.now() - start)
      if (slow) onTooSlow()
      return slow
    }

    const trace = () => {
      if (!e.main) {
        const renderer = makeRenderer(canvas)
        e.main = { renderer, tracer: new WebGLPathTracer(renderer) }
      }
      const { renderer, tracer } = e.main
      // Cheaper pixels where battery or a CPU renderer would suffer; the tracer upscales.
      tracer.renderScale = software ? 0.35 : touch ? 0.6 : 1
      renderer.setPixelRatio(dpr)
      renderer.setSize(size.width, size.height, false)
      tracer.setScene(scene, camera)
      tracer.updateCamera()
      timer.reset()
      const loop = () => {
        if (sample(tracer)) return
        const n = Math.floor(tracer.samples)
        showing.current = n >= 1
        canvas.style.visibility = showing.current ? 'visible' : 'hidden'
        if (out) out.dataset.samples = String(n)
        if (tracer.samples < maxSamples) frame = requestAnimationFrame(loop)
      }
      frame = requestAnimationFrame(loop)
    }

    if (e.main) trace()
    else {
      if (!e.warm) {
        const renderer = makeRenderer(Object.assign(document.createElement('canvas'), { width: 16, height: 16 }))
        e.warm = { renderer, tracer: new WebGLPathTracer(renderer), frames: 0 }
      }
      const warm = e.warm
      warm.tracer.setScene(scene, camera)
      const loop = () => {
        if (sample(warm.tracer)) return
        if (++warm.frames < WARM_UP_FRAMES) {
          frame = requestAnimationFrame(loop)
          return
        }
        warm.tracer.dispose()
        releaseRenderer(warm.renderer)
        e.warm = undefined
        trace()
      }
      frame = requestAnimationFrame(loop)
    }

    return () => {
      cancelAnimationFrame(frame)
      showing.current = false
      canvas.style.visibility = 'hidden'
      if (out) out.dataset.samples = '0'
    }
  }, [spec, mode, overlay, readout, gl, scene, camera, size, dpr, onTooSlow, force])

  useFrame(() => {
    // Real time until the path-traced image has its first sample.
    if (mode !== 'pathtrace' || !showing.current) gl.render(scene, camera)
  }, 1)
  return null
}

/** OrbitControls blocks touch scrolling on the canvas; while rotation is locked, let a vertical swipe scroll the page. */
function TouchScroll({ on }: { on: boolean }) {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    gl.domElement.style.touchAction = on ? 'pan-y' : 'none'
  }, [gl, on])
  return null
}

export function Preview({ spec }: { spec: RingSpec }) {
  const storedPhotoreal = useStore((s) => s.photoreal)
  const setPhotoreal = useStore((s) => s.setPhotoreal)
  // Paused for this device when too slow, unless the user insisted (see photoreal.ts).
  const [slowness, setSlowness] = useState({ tooSlow: false, forced: false })
  const state = { stored: storedPhotoreal, ...slowness }
  const photoreal = isPhotorealOn(state)
  const onTooSlow = useCallback(() => setSlowness((s) => markTooSlow({ stored: true, ...s })), [])
  const [dragging, setDragging] = useState(false)
  // Locked: dragging no longer turns the ring (zoom still works), and a phone can scroll past it.
  const [locked, setLocked] = useState(false)
  // The spec the view has been still on for SETTLE_MS; any edit or drag drops to real time.
  const [settled, setSettled] = useState<RingSpec | null>(null)
  const readout = useRef<HTMLOutputElement>(null)
  const overlay = useRef<HTMLCanvasElement>(null)
  const floorY = -(spec.innerDiameterMm / 2 + spec.band.thicknessMm)
  const mode: RenderMode = photoreal && !dragging && settled === spec ? 'pathtrace' : 'raster'

  useEffect(() => {
    if (dragging) return
    const t = setTimeout(() => setSettled(spec), SETTLE_MS)
    return () => clearTimeout(t)
  }, [spec, dragging])

  return (
    <>
      <Canvas dpr={[1, 2]} camera={{ fov: 35, position: [0, 32, 52], near: 1, far: 1000 }} gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.NeutralToneMapping }}>
        <color attach="background" args={[BACKGROUND]} />
        <StudioEnvironment />
        <Bounds fit clip observe margin={1.25}>
          <group rotation={[-Math.PI / 2, 0, 0]}>
            <RingModel spec={spec} mode={mode} />
          </group>
        </Bounds>
        {mode === 'pathtrace' ? (
          // A real surface for real shadows and caustics.
          <mesh rotation-x={-Math.PI / 2} position-y={floorY} name="floor">
            <circleGeometry args={[400, 64]} />
            <meshStandardMaterial color={BACKGROUND} roughness={0.95} />
          </mesh>
        ) : (
          <ContactShadows position={[0, floorY, 0]} opacity={0.35} scale={60} blur={2.5} far={20} resolution={256} />
        )}
        <PathTracer spec={spec} mode={mode} overlay={overlay} readout={readout} onTooSlow={onTooSlow} force={slowness.forced} />
        <TouchScroll on={locked} />
        <OrbitControls
          makeDefault
          enablePan={false}
          enableRotate={!locked}
          minDistance={15}
          maxDistance={150}
          onStart={() => {
            setDragging(true)
            setSettled(null)
          }}
          onEnd={() => setDragging(false)}
        />
      </Canvas>
      <canvas ref={overlay} className="pathtraced" aria-hidden="true" />
      <output ref={readout} data-testid="render" hidden />
      <button
        type="button"
        className="photoreal"
        aria-pressed={photoreal}
        title="Path-traced lighting when the view is still"
        onClick={() => {
          const next = togglePhotoreal(state)
          setPhotoreal(next.stored)
          setSlowness({ tooSlow: next.tooSlow, forced: next.forced })
        }}
      >
        ✦ Photoreal {photoreal ? 'on' : 'off'}
      </button>
      <button type="button" className="rotate-lock" aria-pressed={locked} title="Stop the ring turning when you drag it" onClick={() => setLocked((v) => !v)}>
        🔒 Lock rotation
      </button>
      {isPausedForSlowness(state) && (
        <p className="photoreal-note" role="status">
          Photoreal paused: this device renders it too slowly
        </p>
      )}
    </>
  )
}
