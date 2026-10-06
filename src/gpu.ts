import type * as THREE from 'three'

/** CPU-emulated WebGL (no GPU): continuous heavy rendering would lock the page. */
export function isSoftwareRenderer(gl: THREE.WebGLRenderer) {
  const ctx = gl.getContext()
  const info = ctx.getExtension('WEBGL_debug_renderer_info')
  const name = String(info ? ctx.getParameter(info.UNMASKED_RENDERER_WEBGL) : ctx.getParameter(ctx.RENDERER))
  return /swiftshader|llvmpipe|software|basic render/i.test(name)
}
