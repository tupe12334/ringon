// Renders a RingSpec with physically based metal and gem materials. Units: millimetres.

import { useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { METAL_INFO } from './catalog'
import { gemMaterial, metalMaterial } from './materials'
import { buildRing, type StonePlacement } from './geometry'
import type { EngravingFont, Metal, RingSpec } from './spec'

/** Neutral studio lighting that needs no network (works offline as a PWA). */
export function StudioEnvironment({ background = false }: { background?: boolean }) {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    const prevEnv = scene.environment
    // oxlint-disable-next-line react/immutability -- the r3f scene is meant to be mutated
    scene.environment = env
    if (background) scene.background = new THREE.Color('#f3f1ee')
    return () => {
      scene.environment = prevEnv
      env.dispose()
      pmrem.dispose()
    }
  }, [gl, scene, background])
  return null
}

function Stones({ placement }: { placement: StonePlacement }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const material = useMemo(() => {
    placement.geometry.computeBoundingBox()
    const size = placement.geometry.boundingBox!.getSize(new THREE.Vector3())
    return gemMaterial(placement.gem, placement.customColor, Math.max(size.x, size.y))
  }, [placement])
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    placement.matrices.forEach((m, i) => mesh.setMatrixAt(i, m))
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [placement])
  useEffect(() => () => material.dispose(), [material])
  return (
    <instancedMesh
      ref={ref}
      args={[placement.geometry, material, placement.matrices.length]}
      name={`stones-${placement.key}`}
    />
  )
}

const FONT_CSS: Record<EngravingFont, string> = {
  serif: '600 72px Georgia, "Times New Roman", serif',
  sans: '600 68px system-ui, -apple-system, "Segoe UI", sans-serif',
  script: 'italic 76px "Brush Script MT", "Snell Roundhand", "Segoe Script", cursive',
}

function Engraving({ text, font, radius, width, metal }: { text: string; font: EngravingFont; radius: number; width: number; metal: Metal }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 2048
    canvas.height = 128
    const ctx = canvas.getContext('2d')!
    // Used as an alphaMap, which three.js reads from the green channel: white = engraved.
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.font = FONT_CSS[font]
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#fff'
    // Text sits on the inside top of the band (u = 0.5 of the cylinder faces +Z after rotation).
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    // Seen from inside the ring, through its front opening: turn the text the right way up.
    tex.wrapT = THREE.RepeatWrapping
    tex.repeat.y = -1
    tex.anisotropy = 8
    return tex
  }, [text, font])
  const color = useMemo(() => new THREE.Color(METAL_INFO[metal].color).multiplyScalar(0.35), [metal])
  useEffect(() => () => texture.dispose(), [texture])
  return (
    <mesh rotation={[0, Math.PI, 0]} name="engraving">
      <cylinderGeometry args={[radius, radius, width, 128, 1, true]} />
      <meshStandardMaterial
        color={color}
        alphaMap={texture}
        transparent
        side={THREE.BackSide}
        metalness={1}
        roughness={0.5}
        polygonOffset
        polygonOffsetFactor={-1}
      />
    </mesh>
  )
}

/** A ring, finger along +Y, stone facing +Z, sized in millimetres. */
export function RingModel({ spec }: { spec: RingSpec }) {
  const parts = useMemo(() => buildRing(spec), [spec])
  const bandMat = useMemo(() => metalMaterial(spec.band.metal, spec.band.finish), [spec.band.metal, spec.band.finish])
  const headMetal = spec.band.headMetal === 'match' ? spec.band.metal : spec.band.headMetal
  const headFinish = spec.band.finish === 'hammered' ? 'polished' : spec.band.finish
  const headMat = useMemo(() => metalMaterial(headMetal, headFinish), [headMetal, headFinish])

  useEffect(
    () => () => {
      parts.band.dispose()
      parts.head?.dispose()
      parts.stones.forEach((s) => s.geometry.dispose())
    },
    [parts],
  )
  useEffect(() => () => bandMat.dispose(), [bandMat])
  useEffect(() => () => headMat.dispose(), [headMat])

  return (
    <group name="ring">
      <mesh geometry={parts.band} material={bandMat} name="band" />
      {parts.head && <mesh geometry={parts.head} material={headMat} name="head" />}
      {parts.stones.map((s) => (
        <Stones key={`${s.key}-${s.matrices.length}`} placement={s} />
      ))}
      {parts.engraving && (
        <Engraving
          text={spec.engraving.text}
          font={spec.engraving.font}
          radius={parts.engraving.radius}
          width={parts.engraving.width}
          metal={spec.band.metal}
        />
      )}
    </group>
  )
}
