import * as THREE from 'three'
import { C, flat, softDot, themed } from '../paint'
import { smooth, type FrameCtx, type Piece } from '../util'

/** Night: stars along the whole journey. Both: streaks — warp at night, wind by day. */
export function createSpace(count: number, zFrom: number, zTo: number): Piece {
  const group = new THREE.Group()
  const pos = new Float32Array(count * 3)
  const col = new Float32Array(count * 3)
  const tints = ['#e8efe9', '#39d353', '#2ee6d6', '#9b7bff'].map((c) => new THREE.Color(c))
  for (let i = 0; i < count; i++) {
    pos.set([(Math.random() - 0.5) * 140, (Math.random() - 0.5) * 90, zFrom + Math.random() * (zTo - zFrom)], i * 3)
    const c = tints[Math.random() < 0.7 ? 0 : 1 + Math.floor(Math.random() * 3)]
    const b = 0.35 + Math.random() * 0.65
    col.set([c.r * b, c.g * b, c.b * b], i * 3)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  const stars = new THREE.Points(
    geo,
    new THREE.PointsMaterial({ size: 0.16, map: softDot(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  )
  group.add(stars)

  const S = 700
  const sp = new Float32Array(S * 2 * 3)
  const tail = new Float32Array(S * 2)
  for (let i = 0; i < S; i++) {
    const a = Math.random() * Math.PI * 2
    const r = 2.5 + Math.random() * 22
    const z = (Math.random() - 0.5) * 160
    for (const k of [0, 1]) {
      sp.set([Math.cos(a) * r, Math.sin(a) * r, z], (i * 2 + k) * 3)
      tail[i * 2 + k] = k
    }
  }
  const sgeo = new THREE.BufferGeometry()
  sgeo.setAttribute('position', new THREE.BufferAttribute(sp, 3))
  sgeo.setAttribute('aTail', new THREE.BufferAttribute(tail, 1))
  const uniforms = { uWarp: { value: 0 }, uFlow: { value: 0 }, uC: { value: new THREE.Color() }, uA: { value: 0.8 } }
  const smat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      attribute float aTail; uniform float uWarp, uFlow; varying float vA;
      void main(){
        vec3 p = position;
        p.z = mod(p.z + uFlow + 80.0, 160.0) - 80.0 - aTail * uWarp * 9.0;
        vA = (1.0 - aTail) * uWarp;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: 'uniform vec3 uC; uniform float uA; varying float vA; void main(){ gl_FragColor = vec4(uC, vA * uA); }',
  })
  const streaks = new THREE.LineSegments(sgeo, smat)
  streaks.frustumCulled = false
  group.add(streaks)
  let day = false
  themed((t) => {
    day = t === 'light'
    stars.visible = !day
    uniforms.uC.value.set(day ? '#ffffff' : '#bfffe6')
    uniforms.uA.value = day ? 0.55 : 0.8
    smat.blending = day ? THREE.NormalBlending : THREE.AdditiveBlending
    smat.needsUpdate = true
  })

  return {
    group,
    center: new THREE.Vector3(),
    radius: Infinity,
    update(_time, dt, ctx: FrameCtx) {
      const t = ctx.story - ctx.storyOf('stack')
      const warp = smooth(0.1, 0.6, t) * (1 - smooth(0.85, 1.0, t) * 0.75)
      // by day there is always a little wind
      uniforms.uWarp.value = day ? Math.max(warp, 0.22) : warp
      uniforms.uFlow.value += dt * 70 * uniforms.uWarp.value
      streaks.visible = uniforms.uWarp.value > 0.01
      streaks.position.copy(ctx.camera.position)
    },
  }
}

/** The ending: a portal ring with particles spiralling in (fireflies at night, petals by day). */
export function createPortal(center: THREE.Vector3, count: number): Piece {
  const group = new THREE.Group()
  group.position.copy(center)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(5.6, 0.04, 16, 260), flat(['#2a9e45', '#fffaf0']))
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(6.1, 0.012, 8, 260), flat(C.cyan, 0.6))
  group.add(ring, ring2)

  const pos = new Float32Array(count * 3)
  const seed = new Float32Array(count)
  for (let i = 0; i < count; i++) seed[i] = Math.random()
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
  const uniforms = { uTime: { value: 0 }, uPx: { value: Math.min(devicePixelRatio, 1.75) }, uA: { value: new THREE.Color() }, uB: { value: new THREE.Color() } }
  const vmat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      attribute float aSeed; uniform float uTime, uPx; varying float vT;
      void main(){
        float t = fract(aSeed * 7.13 + uTime * (0.05 + aSeed * 0.06));
        float r = mix(9.0, 0.2, t);
        float a = aSeed * 6.2831 * 9.0 + t * 9.0;
        vec3 p = vec3(cos(a) * r, sin(a) * r, -t * t * 6.0 + (aSeed - 0.5) * 1.5);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (1.0 + aSeed * 2.0) * uPx * (12.0 / -mv.z);
        vT = t;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uA, uB; varying float vT;
      void main(){
        float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5));
        gl_FragColor = vec4(mix(uA, uB, vT), a * smoothstep(0.0, 0.15, vT) * (1.0 - vT * 0.6));
      }`,
  })
  themed((t) => {
    const day = t === 'light'
    uniforms.uA.value.set(day ? '#ffffff' : '#2ee6d6')
    uniforms.uB.value.set(day ? '#f6c9d0' : '#39d353')
    vmat.blending = day ? THREE.NormalBlending : THREE.AdditiveBlending
    vmat.needsUpdate = true
  })
  const vortex = new THREE.Points(geo, vmat)
  vortex.frustumCulled = false
  group.add(vortex)
  const glowU = { uC: { value: new THREE.Color() }, uK: { value: 1 } }
  themed((t) => {
    glowU.uC.value.set(t === 'dark' ? '#1f9a59' : '#fff4d6')
    glowU.uK.value = t === 'dark' ? 1 : 1.6
  })
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(5.5, 64),
    new THREE.ShaderMaterial({
      uniforms: glowU,
      transparent: true,
      depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader:
        'uniform vec3 uC; uniform float uK; varying vec2 vUv; void main(){ float d = length(vUv - 0.5) * 2.0; float a = (smoothstep(1.0, 0.3, d) * 0.12 + smoothstep(0.2, 0.0, d) * 0.15) * uK; gl_FragColor = vec4(uC, a); }',
    }),
  )
  glow.position.z = -2
  group.add(glow)

  return {
    group,
    center,
    radius: 10,
    update(time) {
      uniforms.uTime.value = time
      ring.rotation.z = time * 0.2
      ring2.rotation.z = -time * 0.12
      ring2.scale.setScalar(1 + Math.sin(time * 1.4) * 0.02)
    },
  }
}
