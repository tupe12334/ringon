// One Euro filtering of the ring pose: steady when the hand is still, responsive when it moves.

import { OneEuroFilter } from '1eurofilter'
import * as THREE from 'three'
import type { RingPose } from './pose'

const filters = (n: number, minCutoff: number, beta: number) =>
  Array.from({ length: n }, () => new OneEuroFilter(30, minCutoff, beta, 1))

export class PoseSmoother {
  private pos = filters(2, 1.5, 0.02)
  private dir = filters(6, 1.2, 0.4)
  private scale = filters(1, 0.6, 0.002)

  reset() {
    ;[...this.pos, ...this.dir, ...this.scale].forEach((f) => f.reset())
  }

  /** `t` in seconds. */
  apply(p: RingPose, t: number): RingPose {
    const x = this.pos[0].filter(p.position.x, t)
    const y = this.pos[1].filter(p.position.y, t)
    const axis = new THREE.Vector3(...[p.axis.x, p.axis.y, p.axis.z].map((v, i) => this.dir[i].filter(v, t))).normalize()
    const dorsal = new THREE.Vector3(...[p.dorsal.x, p.dorsal.y, p.dorsal.z].map((v, i) => this.dir[i + 3].filter(v, t)))
    dorsal.addScaledVector(axis, -dorsal.dot(axis)).normalize()
    const xAxis = new THREE.Vector3().crossVectors(axis, dorsal)
    const quaternion = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, axis, dorsal))
    return {
      position: new THREE.Vector3(x, y, 0),
      quaternion,
      pxPerMm: this.scale[0].filter(p.pxPerMm, t),
      axis,
      dorsal,
    }
  }
}
