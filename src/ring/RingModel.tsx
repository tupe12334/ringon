// Renders a RingSpec with physically based metal and gem materials. Units: millimetres.
//
// Two render modes share one scene description:
// - raster: real time, for dragging and the live try-on.
// - pathtrace: the ring as plain meshes and physical materials, for a progressive path tracer
//   that simulates real light transport when the view is still.

import { Environment, MeshRefractionMaterial, useEnvironment } from '@react-three/drei'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { GEM_INFO, METAL_INFO, gemColor } from './catalog'
import { buildRing, type StonePlacement } from './geometry'
import { gemMaterial, metalMaterial } from './materials'
import type { EngravingFont, Metal, RingSpec } from './spec'

export type RenderMode = 'raster' | 'pathtrace'

/** Studio HDR shipped with the app (works offline). Lights the scene and fills gem reflections. */
export const STUDIO_HDR = `${import.meta.env.BASE_URL}env/studio.hdr`

/** Image-based lighting from a real HDR photo of a photo studio, relit as a jewelry light tent. */
export function StudioEnvironment() {
  return <Environment files={STUDIO_HDR} />
}

function useInstanceMatrices(placement: StonePlacement) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    placement.matrices.forEach((m, i) => mesh.setMatrixAt(i, m))
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [placement])
  return ref
}

/**
 * Real-time gems: drei's MeshRefractionMaterial ray-traces each stone's own facets (through a
 * BVH) for internal reflections, fresnel and dispersion, the way light bounces in a cut stone.
 */
function RasterStones({ placement }: { placement: StonePlacement }) {
  const ref = useInstanceMatrices(placement)
  const env = useEnvironment({ files: STUDIO_HDR })
  const info = GEM_INFO[placement.gem]
  return (
    <instancedMesh ref={ref} args={[placement.geometry, undefined, placement.matrices.length]} name={`stones-${placement.key}`}>
      <MeshRefractionMaterial
        envMap={env}
        bounces={3}
        ior={info.ior}
        fresnel={1}
        aberrationStrength={info.dispersion * 0.3}
        color={gemColor(placement.gem, placement.customColor)}
        toneMapped={false}
      />
    </instancedMesh>
  )
}

/** Opaque stones (black diamond) are just glossy surfaces. */
function OpaqueStones({ placement }: { placement: StonePlacement }) {
  const ref = useInstanceMatrices(placement)
  const material = useMemo(() => gemMaterial(placement.gem, placement.customColor, 1), [placement])
  useEffect(() => () => material.dispose(), [material])
  return <instancedMesh ref={ref} args={[placement.geometry, material, placement.matrices.length]} name={`stones-${placement.key}`} />
}

/**
 * Path-traced gems: plain meshes (the path tracer doesn't take instancing) with physical
 * transmission, so the path tracer computes refraction, total internal reflection and caustics.
 */
function PathTracedStones({ placement }: { placement: StonePlacement }) {
  const geometry = useMemo(() => {
    const merged = mergeGeometries(placement.matrices.map((m) => placement.geometry.clone().applyMatrix4(m)), false)
    if (!merged) throw new Error('could not merge stones')
    return merged
  }, [placement])
  const material = useMemo(() => {
    placement.geometry.computeBoundingBox()
    const size = placement.geometry.boundingBox!.getSize(new THREE.Vector3())
    const m = gemMaterial(placement.gem, placement.customColor, Math.max(size.x, size.y))
    // Rays inside the stone must hit its inner faces to refract back out.
    m.side = THREE.DoubleSide
    return m
  }, [placement])
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])
  return <mesh geometry={geometry} material={material} name={`stones-${placement.key}`} />
}

function Stones({ placement, mode }: { placement: StonePlacement; mode: RenderMode }) {
  if (mode === 'pathtrace') return <PathTracedStones placement={placement} />
  if (GEM_INFO[placement.gem].opaque) return <OpaqueStones placement={placement} />
  return <RasterStones placement={placement} />
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
export function RingModel({ spec, mode = 'raster' }: { spec: RingSpec; mode?: RenderMode }) {
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
        <Stones key={`${s.key}-${s.matrices.length}-${mode}`} placement={s} mode={mode} />
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
