// Lights the try-on ring like the room the camera sees, instead of a fixed studio.
//
// Twice a second the camera frame is shrunk to a few pixels (a strong blur for free) and laid
// over the studio HDR on a sphere; three.js's PMREMGenerator turns that into the environment the
// metal reflects. The studio keeps its bright highlights; the camera adds the room's colours.
// Exposure follows the frame's brightness, so the ring dims in a dim room. Gemstones keep their
// own ray-traced studio environment (RingModel), so they still sparkle.

import { useEnvironment } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { STUDIO_HDR } from '../ring/RingModel'
import { exposureFor, meanLuminance } from './cameraExposure'

/** How much of the environment comes from the camera (the rest is the studio). */
const CAMERA_WEIGHT = 0.55
const UPDATE_MS = 500

export function CameraLighting({ video, mirrored, readout }: { video: HTMLVideoElement; mirrored: boolean; readout?: React.RefObject<HTMLElement | null> }) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const studio = useEnvironment({ files: STUDIO_HDR })
  const exposure = useRef(1)

  useEffect(() => {
    // The little scene the environment is rendered from: studio sphere, camera sphere inside it.
    const canvas = Object.assign(document.createElement('canvas'), { width: 32, height: 16 })
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    const cameraTexture = new THREE.CanvasTexture(canvas)
    cameraTexture.colorSpace = THREE.SRGBColorSpace
    const room = new THREE.Scene()
    room.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({ map: studio, side: THREE.BackSide })))
    room.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(9, 32, 16),
        new THREE.MeshBasicMaterial({ map: cameraTexture, side: THREE.BackSide, transparent: true, opacity: CAMERA_WEIGHT }),
      ),
    )
    const pmrem = new THREE.PMREMGenerator(gl)
    let target: THREE.WebGLRenderTarget | null = null
    const out = readout?.current

    const update = () => {
      if (video.readyState < 2) return
      ctx.save()
      if (mirrored) {
        ctx.translate(canvas.width, 0)
        ctx.scale(-1, 1)
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      ctx.restore()
      cameraTexture.needsUpdate = true
      const mean = meanLuminance(ctx.getImageData(0, 0, canvas.width, canvas.height).data)
      exposure.current = exposureFor(mean)
      const next = pmrem.fromScene(room, 0.02)
      // oxlint-disable-next-line react/immutability -- the r3f scene is meant to be mutated
      scene.environment = next.texture
      target?.dispose()
      target = next
      // oxlint-disable-next-line react/immutability -- readout on a DOM element (tests, debugging)
      if (out) {
        out.dataset.lightMean = mean.toFixed(3)
        out.dataset.lightExposure = exposure.current.toFixed(3)
      }
    }
    update()
    const id = setInterval(update, UPDATE_MS)
    return () => {
      clearInterval(id)
      if (scene.environment === target?.texture) scene.environment = null
      target?.dispose()
      pmrem.dispose()
      cameraTexture.dispose()
      room.traverse((o) => {
        const m = o as THREE.Mesh
        if (!m.isMesh) return
        m.geometry.dispose()
        ;(m.material as THREE.Material).dispose()
      })
    }
  }, [gl, scene, studio, video, mirrored, readout])

  // Ease exposure toward the room's, so lights switching on don't snap the ring.
  useFrame((_, dt) => {
    // oxlint-disable-next-line react/immutability -- renderer settings are meant to be mutated
    gl.toneMappingExposure += (exposure.current - gl.toneMappingExposure) * Math.min(1, dt * 3)
  })
  return null
}
