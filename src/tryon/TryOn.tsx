// Live try-on: the camera feed with the ring tracked onto a finger, in real time.

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { HandLandmarker } from '@mediapipe/tasks-vision'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { RingModel, StudioEnvironment } from '../ring/RingModel'
import type { RingSpec } from '../ring/spec'
import { useStore } from '../templates/store'
import { computePose, coverLayout, FINGERS, PalmSideVote, palmSideEvidence, palmSideFromLabel, worldToScreen, type Finger, type RingPose, type View } from './pose'
import { useRecorder } from './recorder'
import { PoseSmoother } from './smoothing'
import { loadHandLandmarker } from './tracker'

type Status = 'loading' | 'searching' | 'tracking' | 'error'
type Facing = 'environment' | 'user'

const FINGER_LABEL: Record<Finger, string> = { thumb: 'Thumb', index: 'Index', middle: 'Middle', ring: 'Ring', pinky: 'Pinky' }

/** The camera image, scaled to cover the screen, drawn behind the ring. */
function VideoBackdrop({ video, mirrored }: { video: HTMLVideoElement; mirrored: boolean }) {
  const size = useThree((s) => s.size)
  const texture = useMemo(() => {
    const t = new THREE.VideoTexture(video)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [video])
  useEffect(() => () => texture.dispose(), [texture])
  // VideoTexture waits for requestVideoFrameCallback, which Chrome never fires for our hidden
  // source <video> (it isn't composited), leaving the backdrop black. Upload every frame instead.
  useFrame(() => {
    if (video.readyState >= 2) texture.needsUpdate = true
  })
  const [vw, vh] = [video.videoWidth || 1280, video.videoHeight || 720]
  const layout = coverLayout({ videoWidth: vw, videoHeight: vh, width: size.width, height: size.height, mirrored })
  return (
    <mesh position={[0, 0, -900]} scale={[layout.width * (mirrored ? -1 : 1), layout.height, 1]} renderOrder={-10}>
      <planeGeometry />
      <meshBasicMaterial map={texture} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

interface TrackedRingProps {
  spec: RingSpec
  video: HTMLVideoElement
  landmarker: HandLandmarker
  mirrored: boolean
  finger: Finger
  flip: boolean
  fit: number
  onStatus: (s: Status) => void
  /** Receives the on-screen pose each frame (for the accessible readout and tests). */
  onPose: (p: RingPose | null) => void
}

/** Ring shadow on the skin; `?shadow=0` turns it off (for comparisons). */
const SHADOWS = typeof location === 'undefined' || new URLSearchParams(location.search).get('shadow') !== '0'

/** Every mesh of the ring casts a shadow, whatever the design adds or removes. */
const markShadowCasters = (ring: THREE.Object3D) =>
  ring.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = true
  })

/** Keep the shadow light just above-front of the ring and its shadow box around it (px). */
function aimShadowLight(light: THREE.DirectionalLight | null, ring: THREE.Object3D, extentPx: number) {
  if (!light) return
  light.target = ring
  light.position.copy(ring.position).add(new THREE.Vector3(0.05, 0.8, 1).multiplyScalar(4 * extentPx))
  const cam = light.shadow.camera
  cam.left = cam.bottom = -extentPx
  cam.right = cam.top = extentPx
  cam.near = 1
  cam.far = 10 * extentPx
  cam.updateProjectionMatrix()
}

function TrackedRing({ spec, video, landmarker, mirrored, finger, flip, fit, onStatus, onPose }: TrackedRingProps) {
  const group = useRef<THREE.Group>(null)
  const light = useRef<THREE.DirectionalLight>(null)
  const ringModel = useRef<THREE.Group>(null)
  const size = useThree((s) => s.size)
  const smoother = useMemo(() => new PoseSmoother(), [])
  const hand = useMemo(() => new PalmSideVote(), [])
  const last = useRef({ time: -1, seen: 0, status: '' as Status | '' })
  const innerR = spec.innerDiameterMm / 2

  // Mark the ring's meshes as shadow casters whenever the design changes (children's layout
  // effects have mounted the stones by now).
  useLayoutEffect(() => {
    if (ringModel.current) markShadowCasters(ringModel.current)
  }, [spec])

  useEffect(() => {
    smoother.reset()
    hand.reset()
  }, [finger, flip, mirrored, smoother, hand])

  useFrame(() => {
    const g = group.current
    if (!g || video.readyState < 2 || video.currentTime === last.current.time) return
    last.current.time = video.currentTime
    const now = performance.now()
    let result: ReturnType<HandLandmarker['detectForVideo']>
    try {
      result = landmarker.detectForVideo(video, now)
    } catch {
      return // a dropped frame (e.g. the camera is switching); try the next one
    }
    const view: View = { videoWidth: video.videoWidth, videoHeight: video.videoHeight, width: size.width, height: size.height, mirrored }
    const image = result.landmarks[0]
    const world = result.worldLandmarks[0]
    let pose: RingPose | null = null
    if (image && world) {
      const label = result.handedness[0]?.[0]?.categoryName ?? 'Right'
      const palmSide = hand.update(palmSideEvidence(worldToScreen(world, mirrored)), palmSideFromLabel(label, mirrored))
      pose = computePose({ image, world, palmSide, finger, along: finger === 'thumb' ? 0.5 : 0.4, flip, innerDiameterMm: spec.innerDiameterMm }, view)
    }

    let status: Status
    if (pose) {
      const p = smoother.apply(pose, now / 1000)
      g.position.copy(p.position)
      g.quaternion.copy(p.quaternion)
      g.scale.setScalar(p.pxPerMm * fit)
      g.visible = true
      if (light.current) light.current.castShadow = true
      aimShadowLight(light.current, g, p.pxPerMm * fit * (innerR + spec.band.thicknessMm + 12))
      last.current.seen = now
      status = 'tracking'
      onPose(p)
    } else {
      // Keep the ring a moment through dropped frames, then hide it.
      if (now - last.current.seen > 250) {
        g.visible = false
        if (light.current) light.current.castShadow = false // no shadow pass for a hidden ring
        smoother.reset()
        // Out of view for a while: it may be the other hand that comes back.
        if (now - last.current.seen > 1000) hand.reset()
        onPose(null)
      }
      status = 'searching'
    }
    if (status !== last.current.status) {
      last.current.status = status
      onStatus(status)
    }
  })

  return (
    <>
      {SHADOWS && (
        // Overhead key light for the ring's shadow on the skin. Kept dim: the studio environment
        // already lights the ring, so the try-on matches the designer.
        <directionalLight ref={light} intensity={0.15} castShadow shadow-mapSize={[256, 256]} shadow-bias={-0.002} shadow-normalBias={0.5} />
      )}
      <group ref={group} visible={false} name="tracked-ring">
        {/* Invisible finger: hides the part of the band behind it. */}
        <mesh renderOrder={-1}>
          <cylinderGeometry args={[innerR * 0.98, innerR * 0.98, 70, 32]} />
          <meshBasicMaterial colorWrite={false} />
        </mesh>
        {SHADOWS && (
          // The finger's skin, as a shadow catcher: shows only the ring's contact shadow.
          <mesh receiveShadow name="skin-shadow" renderOrder={-0.5}>
            <cylinderGeometry args={[innerR * 0.985, innerR * 0.985, spec.band.widthMm + 30, 48, 1, true]} />
            <shadowMaterial opacity={0.3} depthWrite={false} />
          </mesh>
        )}
        <group ref={ringModel}>
          <RingModel spec={spec} />
        </group>
      </group>
    </>
  )
}

function useCamera(facing: Facing) {
  const [video, setVideo] = useState<HTMLVideoElement | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false
    const el = document.createElement('video')
    el.playsInline = true
    el.muted = true
    el.setAttribute('playsinline', '')
    // Kept in the document (invisibly) so browsers never pause it as a background element.
    el.className = 'camera-source'
    document.body.append(el)
    const stop = () => stream?.getTracks().forEach((t) => t.stop())
    ;(async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser cannot open the camera (it needs HTTPS).')
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        if (cancelled) return stop()
        el.srcObject = stream
        await el.play()
        if (!cancelled) setVideo(el)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      cancelled = true
      stop()
      el.srcObject = null
      el.remove()
      setVideo(null)
    }
  }, [facing])
  return { video, error }
}

export function TryOn({ onBack }: { onBack: () => void }) {
  const spec = useStore((s) => s.spec)
  const [facing, setFacing] = useState<Facing>('environment')
  const [finger, setFinger] = useState<Finger>('ring')
  const [flip, setFlip] = useState(false)
  const [fit, setFit] = useState(1)
  const [status, setStatus] = useState<Status>('loading')
  const [landmarker, setLandmarker] = useState<HandLandmarker | null>(null)
  const [loadError, setLoadError] = useState('')
  const { video, error: camError } = useCamera(facing)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const recorder = useRecorder(canvasRef)
  const poseRef = useRef<HTMLOutputElement>(null)
  const onPose = useCallback((p: RingPose | null) => {
    const el = poseRef.current
    if (!el) return
    el.dataset.visible = String(!!p)
    if (!p) return
    el.dataset.x = p.position.x.toFixed(1)
    el.dataset.y = p.position.y.toFixed(1)
    el.dataset.stoneZ = p.dorsal.z.toFixed(3)
    el.dataset.pxPerMm = p.pxPerMm.toFixed(3)
  }, [])

  // A phone's front camera is mirrored, like a mirror; the rear camera is not.
  const mirrored = useMemo(() => {
    const track = (video?.srcObject as MediaStream | null)?.getVideoTracks()[0]
    const actual = track?.getSettings().facingMode
    return (actual ?? facing) === 'user'
  }, [video, facing])

  useEffect(() => {
    loadHandLandmarker().then(setLandmarker, (e) => setLoadError(String(e?.message ?? e)))
  }, [])

  const error = camError || loadError
  const shownStatus: Status = error ? 'error' : !video || !landmarker ? 'loading' : status

  return (
    <div className="tryon">
      <Canvas
        orthographic
        // PCF shadows: accurate where the band touches the skin; a small map keeps them soft.
        shadows
        camera={{ position: [0, 0, 1000], near: 1, far: 3000, zoom: 1 }}
        gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.NeutralToneMapping }}
        // The camera image is ~720p: more pixels than this only costs phones battery and frames.
        dpr={[1, 1.5]}
        onCreated={({ gl }) => {
          canvasRef.current = gl.domElement
          gl.transmissionResolutionScale = 0.5
        }}
      >
        <StudioEnvironment />
        {video && <VideoBackdrop video={video} mirrored={mirrored} />}
        {video && landmarker && (
          <TrackedRing spec={spec} video={video} landmarker={landmarker} mirrored={mirrored} finger={finger} flip={flip} fit={fit} onStatus={setStatus} onPose={onPose} />
        )}
      </Canvas>

      <output ref={poseRef} data-testid="pose" hidden />
      <div className="tryon-top">
        <button type="button" onClick={onBack} aria-label="Back to designer">
          ← Design
        </button>
        <span className={`status ${shownStatus}`} data-testid="tracking-status" data-status={shownStatus}>
          {shownStatus === 'loading' && 'Starting camera…'}
          {shownStatus === 'searching' && 'Show your hand, back facing the camera'}
          {shownStatus === 'tracking' && 'Tracking'}
          {shownStatus === 'error' && `Camera unavailable: ${error}`}
        </span>
        <button type="button" onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))} aria-label="Switch camera">
          ⟲ Camera
        </button>
      </div>

      <div className="tryon-bottom">
        <div className="chips" role="radiogroup" aria-label="Finger">
          {FINGERS.map((f) => (
            <button key={f} type="button" role="radio" aria-checked={f === finger} className={f === finger ? 'chip on' : 'chip'} onClick={() => setFinger(f)}>
              {FINGER_LABEL[f]}
            </button>
          ))}
        </div>
        <div className="row">
          <label className="fit">
            Fit
            <input type="range" min={0.7} max={1.3} step={0.01} value={fit} onChange={(e) => setFit(Number(e.target.value))} aria-label="Ring fit" />
          </label>
          <button type="button" onClick={() => setFlip((v) => !v)} aria-pressed={flip}>
            Flip side
          </button>
        </div>
        <div className="row capture">
          <button type="button" onClick={recorder.snapshot} disabled={!video}>
            Photo
          </button>
          <button type="button" className={recorder.recording ? 'record on' : 'record'} onClick={recorder.recording ? recorder.stop : recorder.start} disabled={!video || !recorder.supported}>
            {recorder.recording ? `■ Stop ${recorder.seconds}s` : '● Record video'}
          </button>
        </div>
      </div>

      {recorder.result && (
        <div className="capture-result" role="dialog" aria-label="Your capture">
          {recorder.result.kind === 'video' ? (
            <video src={recorder.result.url} controls autoPlay loop playsInline muted />
          ) : (
            <img src={recorder.result.url} alt={`${spec.name} on your hand`} />
          )}
          <div className="row">
            <button type="button" className="primary" onClick={recorder.share}>
              Save / share
            </button>
            <button type="button" onClick={recorder.dismiss}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
