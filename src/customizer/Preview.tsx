// The designer's 3D view. Real-time while the user edits or drags; once the view has been
// still for a moment, a progressive path tracer (three-gpu-pathtracer) takes over and
// simulates real light transport: soft studio light, true refraction and caustics in the
// stones, reflections between metal surfaces, and the ring's real shadow on the floor.

import { Bounds, ContactShadows, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { WebGLPathTracer } from 'three-gpu-pathtracer'
import { RingModel, StudioEnvironment, type RenderMode } from '../ring/RingModel'
import type { RingSpec } from '../ring/spec'
import { useStore } from '../templates/store'

const BACKGROUND = '#f3f1ee'
/** How long the view must be still before path tracing starts, ms. */
const SETTLE_MS = 600
/** Samples per pixel to stop at: converged enough, then the GPU rests. */
export const MAX_SAMPLES = 256

/** Frames a throwaway tracer runs before the first real one (see PathTracer). */
const WARM_UP_FRAMES = 90
const warmedScenes = new WeakSet<THREE.Scene>()

/**
 * While `mode` is 'pathtrace', three-gpu-pathtracer accumulates samples into its own canvas laid
 * over the real-time one, in its own animation loop; otherwise the normal real-time render runs.
 * A fresh tracer is built for each still period (the scene is rebuilt anyway).
 *
 * Measured quirk: the first tracer that ever processes a scene renders every transmissive
 * surface (all gemstones) almost black, persistently; every tracer after it is correct. So the
 * first time, a throwaway tracer on a tiny offscreen canvas processes the scene for a moment
 * while the real-time view stays up.
 */
function PathTracer({ spec, mode, overlay, readout }: { spec: RingSpec; mode: RenderMode; overlay: React.RefObject<HTMLCanvasElement | null>; readout: React.RefObject<HTMLElement | null> }) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const dpr = useThree((s) => s.viewport.dpr)

  useEffect(() => {
    const canvas = overlay.current
    const out = readout.current
    if (mode !== 'pathtrace' || !canvas) return
    let frame = 0
    let disposed = false
    const cleanups: (() => void)[] = []
    const makeTracer = (target: HTMLCanvasElement) => {
      const renderer = new THREE.WebGLRenderer({ canvas: target, preserveDrawingBuffer: true })
      renderer.toneMapping = gl.toneMapping
      renderer.outputColorSpace = gl.outputColorSpace
      const tracer = new WebGLPathTracer(renderer)
      tracer.setScene(scene, camera)
      cleanups.push(() => {
        tracer.dispose()
        renderer.dispose()
      })
      return tracer
    }

    const trace = () => {
      // oxlint-disable-next-line react/immutability -- sizing the DOM canvas we draw into
      canvas.width = Math.round(size.width * dpr)
      canvas.height = Math.round(size.height * dpr)
      const tracer = makeTracer(canvas)
      const loop = () => {
        if (tracer.samples < MAX_SAMPLES) tracer.renderSample()
        canvas.style.visibility = tracer.samples >= 1 ? 'visible' : 'hidden'
        if (out) out.dataset.samples = String(Math.floor(tracer.samples))
        frame = requestAnimationFrame(loop)
      }
      frame = requestAnimationFrame(loop)
    }

    if (warmedScenes.has(scene)) trace()
    else {
      const warm = makeTracer(Object.assign(document.createElement('canvas'), { width: 16, height: 16 }))
      let n = 0
      const loop = () => {
        if (disposed) return
        warm.renderSample()
        if (++n < WARM_UP_FRAMES) frame = requestAnimationFrame(loop)
        else {
          warmedScenes.add(scene)
          trace()
        }
      }
      frame = requestAnimationFrame(loop)
    }

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      canvas.style.visibility = 'hidden'
      if (out) out.dataset.samples = '0'
      cleanups.forEach((c) => c())
    }
  }, [spec, mode, overlay, readout, gl, scene, camera, size, dpr])

  useFrame(() => {
    // oxlint-disable-next-line react/immutability -- progress readout on a DOM element
    if (readout.current) readout.current.dataset.mode = mode
    if (mode !== 'pathtrace') gl.render(scene, camera)
  }, 1)
  return null
}

export function Preview({ spec }: { spec: RingSpec }) {
  const photoreal = useStore((s) => s.photoreal)
  const setPhotoreal = useStore((s) => s.setPhotoreal)
  const [dragging, setDragging] = useState(false)
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
        <PathTracer spec={spec} mode={mode} overlay={overlay} readout={readout} />
        <OrbitControls
          makeDefault
          enablePan={false}
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
        onClick={() => setPhotoreal(!photoreal)}
      >
        ✦ Photoreal {photoreal ? 'on' : 'off'}
      </button>
    </>
  )
}
