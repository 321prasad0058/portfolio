import * as THREE from 'three'
import { flat, label, themed } from '../paint'
import { type FrameCtx, type Piece } from '../util'

// The spine of the story: a `git log --graph` line the camera follows. At night it glows; by day it is
// a ribbon of sunlight through the sky. Side projects live on a branch that forks off and merges back.
export type Commit = { at: THREE.Vector3; hash: string }

function tube(curve: THREE.Curve<THREE.Vector3>, segments: number, radius: number, color: [string, string], speed: number) {
  const len = curve.getLength()
  const uniforms = { uTime: { value: 0 }, uHead: { value: 0 }, uLen: { value: len }, uC: { value: new THREE.Color() }, uSpeed: { value: speed }, uLight: { value: 0 } }
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: /* glsl */ `
      uniform float uTime, uHead, uLen, uSpeed, uLight; uniform vec3 uC; varying vec2 vUv;
      void main(){
        float d = vUv.x * uLen;
        float pulse = pow(fract(d / 6.0 - uTime * uSpeed), 14.0);
        float travelled = smoothstep(uHead + 2.0, uHead - 6.0, d);
        float a = 0.22 + travelled * 0.45 + pulse * 0.9;
        vec3 night = uC * (0.6 + pulse * 1.6 + travelled * 0.6);
        vec3 day = mix(uC, vec3(1.0), pulse * 0.8);
        gl_FragColor = vec4(mix(night, day, uLight), mix(a, 0.45 + travelled * 0.35 + pulse * 0.2, uLight));
      }`,
  })
  themed((t) => {
    uniforms.uC.value.set(color[t === 'dark' ? 0 : 1])
    uniforms.uLight.value = t === 'light' ? 1 : 0
    mat.blending = t === 'dark' ? THREE.AdditiveBlending : THREE.NormalBlending
    mat.needsUpdate = true
  })
  return { mesh: new THREE.Mesh(new THREE.TubeGeometry(curve, segments, radius, 6, false), mat), uniforms, len }
}

export function createCommitLine(main: THREE.Vector3[], branch: THREE.Vector3[], commits: Commit[]): Piece {
  const group = new THREE.Group()
  const mainCurve = new THREE.CatmullRomCurve3(main, false, 'centripetal')
  const branchCurve = new THREE.CatmullRomCurve3(branch, false, 'centripetal')
  const m = tube(mainCurve, 1000, 0.035, ['#39d353', '#fffaf0'], 0.35)
  const b = tube(branchCurve, 400, 0.03, ['#f5b84b', '#ffd27a'], 0.45)
  group.add(m.mesh, b.mesh)
  const samples = mainCurve.getSpacedPoints(700)
  const bSamples = branchCurve.getSpacedPoints(300)

  const nodeMat = flat(['#d9ffe4', '#fffaf0'])
  const ringMat = flat(['#39d353', '#c8553d'], 0.85, { side: THREE.DoubleSide })
  const rings: THREE.Mesh[] = []
  for (const c of commits) {
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 20), nodeMat)
    node.position.copy(c.at)
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.36, 48), ringMat)
    ring.position.copy(c.at)
    rings.push(ring)
    const tag = label(c.hash, { size: 40, height: 0.28, color: ['#7fd99a', '#5a4632'] })
    tag.position.copy(c.at).add(new THREE.Vector3(0.75, 0.05, 0))
    group.add(node, ring, tag)
  }

  const nearest = (pts: THREE.Vector3[], p: THREE.Vector3) => {
    let best = 0
    let bd = Infinity
    for (let i = 0; i < pts.length; i++) {
      const d = pts[i].distanceToSquared(p)
      if (d < bd) { bd = d; best = i }
    }
    return best / (pts.length - 1)
  }

  return {
    group,
    center: new THREE.Vector3(),
    radius: Infinity,
    update(time, _dt, ctx: FrameCtx) {
      m.uniforms.uTime.value = b.uniforms.uTime.value = time
      m.uniforms.uHead.value = nearest(samples, ctx.camera.position) * m.len + 8
      b.uniforms.uHead.value = nearest(bSamples, ctx.camera.position) * b.len + 6
      for (const r of rings) {
        r.lookAt(ctx.camera.position)
        r.scale.setScalar(1 + Math.sin(time * 2.4 + r.position.z) * 0.12)
      }
    },
  }
}
