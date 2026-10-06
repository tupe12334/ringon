// Live try-on: the camera feed with the ring tracked onto a finger, in real time.

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as THREE from 'three'
import { RingModel, StudioEnvironment } from '../ring/RingModel'
import { CAMERA_LIGHTING } from './cameraExposure'
import { CameraLighting } from './cameraLighting'
import type { RingSpec } from '../ring/spec'
import { useStore } from '../templates/store'
import { computePose, coverLayout, FINGERS, PalmSideVote, palmSideEvidence, palmSideFromLabel, worldToScreen, type Finger, type Lm, type RingPose, type View } from './pose'
import { useRecorder } from './recorder'
import { PoseSmoother } from './smoothing'
import { DEPTH_ONLY, handJoints, occluderBones, placeHand, UNIT_CYLINDER, UNIT_SPHERE } from './handOccluder'
import { loadHandTracker, type HandTracker } from './tracker'
import { useCamera, type Facing } from './camera'

/** One frame's landmarks, as MediaPipe returned them. */
export interface TrackedHand {
  image: Lm[]
  world: Lm[]
  view: View
}

type Status = 'loading' | 'searching' | 'tracking' | 'error'
/** Which hand wears the ring; 'auto' reads it from the finger bend. */
type Hand = 'auto' | 'Left' | 'Right'

const HANDS: Hand[] = ['auto', 'Left', 'Right']

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
  landmarker: HandTracker
  mirrored: boolean
  finger: Finger
  hand: Hand
  flip: boolean
  fit: number
  onStatus: (s: Status) => void
  /** Receives the on-screen pose and the hand it came from each frame (readout and tests). */
  onPose: (p: RingPose | null, hand?: TrackedHand) => void
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

function TrackedRing({ spec, video, landmarker, mirrored, finger, hand, flip, fit, onStatus, onPose }: TrackedRingProps) {
  const group = useRef<THREE.Group>(null)
  const light = useRef<THREE.DirectionalLight>(null)
  const ringModel = useRef<THREE.Group>(null)
  const size = useThree((s) => s.size)
  const smoother = useMemo(() => new PoseSmoother(), [])
  const vote = useMemo(() => new PalmSideVote(), [])
  const last = useRef({ time: -1, seen: 0, status: '' as Status | '' })
  const innerR = spec.innerDiameterMm / 2
  const handRef = useRef<THREE.Group>(null)
  const bones = useMemo(() => occluderBones(finger), [finger])

  // Mark the ring's meshes as shadow casters whenever the design changes (children's layout
  // effects have mounted the stones by now).
  useLayoutEffect(() => {
    if (ringModel.current) markShadowCasters(ringModel.current)
  }, [spec])

  useEffect(() => {
    smoother.reset()
    vote.reset()
  }, [finger, hand, flip, mirrored, smoother, vote])

  useFrame(() => {
    const g = group.current
    if (!g || video.readyState < 2 || video.currentTime === last.current.time) return
    last.current.time = video.currentTime
    const now = performance.now()
    let result: ReturnType<HandTracker['detect']>
    try {
      result = landmarker.detect(video, now)
    } catch {
      return // a dropped frame (e.g. the camera is switching); try the next one
    }
    const view: View = { videoWidth: video.videoWidth, videoHeight: video.videoHeight, width: size.width, height: size.height, mirrored }
    const image = result.landmarks[0]
    const world = result.worldLandmarks[0]
    let pose: RingPose | null = null
    const along = finger === 'thumb' ? 0.5 : 0.6
    if (image && world) {
      const label = result.handedness[0]?.[0]?.categoryName ?? 'Right'
      // A hand the user named settles it; otherwise vote on the finger bend.
      const palmSide =
        hand === 'auto' ? vote.update(palmSideEvidence(worldToScreen(world, mirrored)), palmSideFromLabel(label, mirrored)) : palmSideFromLabel(hand, mirrored)
      // Real rings sit ~0.6 of the way from the knuckle to the middle joint (e2e/fixtures/photos).
      pose = computePose({ image, world, palmSide, finger, along, flip, innerDiameterMm: spec.innerDiameterMm }, view)
    }

    let status: Status
    if (pose) {
      const p = smoother.apply(pose, now / 1000)
      g.position.copy(p.position)
      g.quaternion.copy(p.quaternion)
      g.scale.setScalar(p.pxPerMm * fit)
      g.visible = true
      aimShadowLight(light.current, g, p.pxPerMm * fit * (innerR + spec.band.thicknessMm + 12))
      // The hand moves with the smoothed ring; neighbours are drawn a little thinner than the ring's
      // finger so landmark noise never hides the front of the band.
      const joints = handJoints(image, world, view, finger, along)
      if (joints && handRef.current) placeHand(handRef.current, joints, bones, innerR * p.pxPerMm * fit * 0.85, p.position.clone().sub(pose.position))
      last.current.seen = now
      status = 'tracking'
      onPose(p, { image, world, view })
    } else {
      // Keep the ring a moment through dropped frames, then hide it.
      if (now - last.current.seen > 250) {
        g.visible = false
        if (handRef.current) handRef.current.visible = false
        smoother.reset()
        // Out of view for a while: it may be the other hand that comes back.
        if (now - last.current.seen > 1000) vote.reset()
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
        // already lights the ring, so the try-on matches the designer. castShadow stays on: toggling it
        // changes the shadow-light count and recompiles materials; a hidden ring draws nothing anyway.
        <directionalLight ref={light} intensity={0.15} castShadow shadow-mapSize={[256, 256]} shadow-bias={-0.002} shadow-normalBias={0.5} />
      )}
      <group ref={group} visible={false} name="tracked-ring">
        {/* Invisible finger, moving with the ring: hides the part of the band behind it. */}
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
      <group ref={handRef} visible={false} name="hand-occluder">
        {/* The rest of the hand: bent joints, other fingers and the palm hide the band too. */}
        {bones.map(([i, j]) => (
          <mesh key={`${i}-${j}`} geometry={UNIT_CYLINDER} material={DEPTH_ONLY} renderOrder={-1} />
        ))}
        {Array.from({ length: 21 }, (_, i) => (
          <mesh key={i} geometry={UNIT_SPHERE} material={DEPTH_ONLY} renderOrder={-1} />
        ))}
      </group>
    </>
  )
}

export function TryOn({ onBack }: { onBack: () => void }) {
  const spec = useStore((s) => s.spec)
  const { t } = useTranslation()
  const [facing, setFacing] = useState<Facing>('environment')
  const [finger, setFinger] = useState<Finger>('ring')
  const [hand, setHand] = useState<Hand>('auto')
  const [flip, setFlip] = useState(false)
  const [fit, setFit] = useState(1)
  const [status, setStatus] = useState<Status>('loading')
  const [landmarker, setLandmarker] = useState<HandTracker | null>(null)
  const [loadError, setLoadError] = useState('')
  const { video, error: camError } = useCamera(facing)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const recorder = useRecorder(canvasRef)
  const poseRef = useRef<HTMLOutputElement>(null)
  const onPose = useCallback((p: RingPose | null, hand?: TrackedHand) => {
    const el = poseRef.current
    if (!el) return
    el.dataset.visible = String(!!p)
    if (!p) return
    el.dataset.x = p.position.x.toFixed(1)
    el.dataset.y = p.position.y.toFixed(1)
    el.dataset.stoneZ = p.dorsal.z.toFixed(3)
    el.dataset.axisX = p.axis.x.toFixed(3)
    el.dataset.axisY = p.axis.y.toFixed(3)
    // Raw landmarks for tests (e2e/photos.spec.ts), kept off the DOM attributes.
    Object.assign(el, { hand })
    el.dataset.pxPerMm = p.pxPerMm.toFixed(3)
  }, [])

  // A phone's front camera is mirrored, like a mirror; the rear camera is not.
  const mirrored = useMemo(() => {
    const track = (video?.srcObject as MediaStream | null)?.getVideoTracks()[0]
    const actual = track?.getSettings().facingMode
    return (actual ?? facing) === 'user'
  }, [video, facing])

  useEffect(() => {
    loadHandTracker().then(setLandmarker, (e) => setLoadError(String(e?.message ?? e)))
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
        {/* Lit like the room the camera sees; the studio until the video is ready. */}
        {video && CAMERA_LIGHTING ? <CameraLighting video={video} mirrored={mirrored} readout={poseRef} /> : <StudioEnvironment />}
        {video && <VideoBackdrop video={video} mirrored={mirrored} />}
        {video && landmarker && (
          <TrackedRing spec={spec} video={video} landmarker={landmarker} mirrored={mirrored} finger={finger} hand={hand} flip={flip} fit={fit} onStatus={setStatus} onPose={onPose} />
        )}
      </Canvas>

      <output ref={poseRef} data-testid="pose" hidden />
      <div className="tryon-top">
        <button type="button" onClick={onBack} aria-label={t('tryon.back')}>
          {t('tryon.backLabel')}
        </button>
        <span className={`status ${shownStatus}`} data-testid="tracking-status" data-status={shownStatus}>
          {shownStatus === 'loading' && t('tryon.loading')}
          {shownStatus === 'searching' && t('tryon.searching')}
          {shownStatus === 'tracking' && t('tryon.tracking')}
          {shownStatus === 'error' && t('tryon.error', { error })}
        </span>
        <button type="button" onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))} aria-label={t('tryon.switchCamera')}>
          {t('tryon.camera')}
        </button>
      </div>

      <div className="tryon-bottom">
        <div className="chips" role="radiogroup" aria-label={t('tryon.hand')}>
          {HANDS.map((h) => (
            <button key={h} type="button" role="radio" aria-checked={h === hand} className={h === hand ? 'chip on' : 'chip'} onClick={() => setHand(h)}>
              {t(`tryon.hands.${h}`)}
            </button>
          ))}
        </div>
        <div className="chips" role="radiogroup" aria-label={t('tryon.finger')}>
          {FINGERS.map((f) => (
            <button key={f} type="button" role="radio" aria-checked={f === finger} className={f === finger ? 'chip on' : 'chip'} onClick={() => setFinger(f)}>
              {t(`tryon.fingers.${f}`)}
            </button>
          ))}
        </div>
        <div className="row">
          <label className="fit">
            {t('tryon.fit')}
            <input type="range" min={0.7} max={1.3} step={0.01} value={fit} onChange={(e) => setFit(Number(e.target.value))} aria-label={t('tryon.fitAria')} />
          </label>
          <button type="button" onClick={() => setFlip((v) => !v)} aria-pressed={flip}>
            {t('tryon.flip')}
          </button>
        </div>
        <div className="row capture">
          <button type="button" onClick={recorder.snapshot} disabled={!video}>
            {t('tryon.photo')}
          </button>
          <button type="button" className={recorder.recording ? 'record on' : 'record'} onClick={recorder.recording ? recorder.stop : recorder.start} disabled={!video || !recorder.supported}>
            {recorder.recording ? t('tryon.stop', { seconds: recorder.seconds }) : t('tryon.record')}
          </button>
        </div>
      </div>

      {recorder.result && (
        <div className="capture-result" role="dialog" aria-label={t('tryon.capture')}>
          {recorder.result.kind === 'video' ? (
            <video src={recorder.result.url} controls autoPlay loop playsInline muted />
          ) : (
            <img src={recorder.result.url} alt={t('tryon.onHand', { name: spec.name })} />
          )}
          <div className="row">
            <button type="button" className="primary" onClick={recorder.share}>
              {t('tryon.saveShare')}
            </button>
            <button type="button" onClick={recorder.dismiss}>
              {t('tryon.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
