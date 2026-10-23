import * as THREE from 'three'
import { themed } from '../paint'
import { NOISE, type FrameCtx, type Piece } from '../util'

// The daytime world, painted in the spirit of Studio Ghibli backgrounds: a deep summer sky that pales
// toward the horizon, towering cumulus with lavender undersides, a sea of cloud below (we are flying,
// as in Laputa), wind you can see, and leaves riding it. None of it shows at night.

/** A sky dome that travels with the camera. */
export function createSky(): Piece {
  const uniforms = {
    uTime: { value: 0 },
    uSunDir: { value: new THREE.Vector3(0.35, 0.32, -0.88).normalize() },
  }
  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: /* glsl */ `
      ${NOISE}
      uniform float uTime; uniform vec3 uSunDir;
      varying vec3 vDir;
      float fbm(vec3 p){ float f = 0.0; float a = 0.5; for (int i = 0; i < 5; i++){ f += a * snoise(p); p *= 2.03; a *= 0.5; } return f; }
      void main(){
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 top = vec3(0.13, 0.40, 0.76);
        vec3 mid = vec3(0.38, 0.64, 0.88);
        vec3 hor = vec3(0.84, 0.92, 0.95);
        vec3 col = mix(hor, mid, smoothstep(0.0, 0.22, h));
        col = mix(col, top, smoothstep(0.18, 0.9, h));
        float sd = max(dot(d, uSunDir), 0.0);
        col += vec3(1.0, 0.93, 0.72) * (pow(sd, 900.0) * 1.4 + pow(sd, 24.0) * 0.35 + pow(sd, 4.0) * 0.08);
        float t = uTime * 0.012;
        // wisps high up
        if (h > 0.25) {
          vec2 uv = d.xz / (h + 0.2) * 1.4 + vec2(t * 2.0, 0.0);
          float w = fbm(vec3(uv * vec2(0.6, 2.4), t));
          col = mix(col, vec3(1.0), smoothstep(0.15, 0.6, w) * 0.45 * smoothstep(0.25, 0.5, h));
        }
        // the sea of clouds below
        if (h < 0.02) {
          vec2 uv = d.xz / max(-h + 0.06, 0.06) * 0.22 + vec2(t * 3.0, t);
          float n = fbm(vec3(uv, t * 0.5));
          float lit = fbm(vec3(uv + vec2(0.12, 0.12), t * 0.5));
          vec3 sea = mix(vec3(0.70, 0.78, 0.90), vec3(1.0, 0.99, 0.97), smoothstep(-0.2, 0.35, n - lit * 0.4 + 0.15));
          float cover = smoothstep(-0.25, 0.1, n);
          vec3 gap = vec3(0.45, 0.62, 0.80);
          vec3 below = mix(gap, sea, cover);
          col = mix(col, below, smoothstep(0.02, -0.06, h));
        }
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  })
  const dome = new THREE.Mesh(new THREE.SphereGeometry(360, 48, 32), mat)
  dome.frustumCulled = false
  dome.renderOrder = -10
  const group = new THREE.Group()
  group.add(dome)
  themed((t) => (group.userData.hidden = t !== 'light'))
  return {
    group,
    center: new THREE.Vector3(),
    radius: Infinity,
    update(time, _dt, ctx: FrameCtx) {
      if (group.userData.hidden) return
      uniforms.uTime.value = time
      dome.position.copy(ctx.camera.position)
    },
  }
}

// cumulus painted on a canvas: a lavender shadow layer, then a bright sunlit layer offset up-left
function cloudTexture(seed: number) {
  let s = seed
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  const W = 512
  const H = 280
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  const base = H * 0.8
  const puffs: [number, number, number][] = []
  const n = 9 + Math.floor(rnd() * 5)
  for (let i = 0; i < n; i++) {
    const x = W * (0.14 + (i / (n - 1)) * 0.72) + (rnd() - 0.5) * 30
    const mid = 1 - Math.abs(i / (n - 1) - 0.5) * 1.6
    const r = 34 + mid * 70 + rnd() * 26
    puffs.push([x, base - r * (0.45 + rnd() * 0.5), r])
  }
  const layer = (fill: string | CanvasGradient, dx: number, dy: number, k: number) => {
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, W, base + 2)
    ctx.clip()
    ctx.fillStyle = fill
    for (const [x, y, r] of puffs) {
      ctx.beginPath()
      ctx.arc(x + dx, y + dy, r * k, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }
  ctx.filter = 'blur(1.5px)'
  layer('#d3dcec', 0, 0, 1)
  const g = ctx.createLinearGradient(0, 0, 0, base)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(1, '#f4f7fb')
  layer(g, -10, -14, 0.86)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** Big painted cumulus drifting along the route. */
export function createClouds(zFrom: number, zTo: number, count: number): Piece {
  const group = new THREE.Group()
  const textures = [11, 23, 37, 51].map(cloudTexture)
  const clouds: { s: THREE.Sprite; speed: number; x0: number }[] = []
  for (let i = 0; i < count; i++) {
    const m = new THREE.SpriteMaterial({ map: textures[i % textures.length], transparent: true, depthWrite: false, fog: true })
    const s = new THREE.Sprite(m)
    const w = 26 + Math.random() * 34
    s.scale.set(w, (w * 280) / 512, 1)
    const side = i % 2 ? 1 : -1
    const x0 = side * (42 + Math.random() * 40)
    const high = i % 5 === 0
    s.position.set(x0, high ? 14 + Math.random() * 10 : -24 + Math.random() * 14, zFrom + (i / count) * (zTo - zFrom) + Math.random() * 10)
    group.add(s)
    clouds.push({ s, speed: 0.15 + Math.random() * 0.25, x0 })
  }
  themed((t) => (group.userData.hidden = t !== 'light'))
  return {
    group,
    center: new THREE.Vector3(),
    radius: Infinity,
    update(time, _dt, ctx: FrameCtx) {
      if (group.userData.hidden) return
      for (const c of clouds) {
        c.s.position.x = c.x0 + Math.sin(time * 0.05 * c.speed + c.x0) * 4
        // never let a cloud fill the lens
        c.s.material.opacity = Math.min(1, Math.max(0, (c.s.position.distanceTo(ctx.camera.position) - 22) / 18))
      }
    },
  }
}

/** Leaves and petals riding the wind around the camera. */
export function createDrift(count: number): Piece {
  const geo = new THREE.PlaneGeometry(0.2, 0.1)
  const offset = new Float32Array(count * 3)
  const seed = new Float32Array(count)
  const color = new Float32Array(count * 3)
  const pal = ['#6aa84f', '#8cc06b', '#4c8a3a', '#fffaf0', '#f6c9d0', '#f4dd8a'].map((c) => new THREE.Color(c))
  for (let i = 0; i < count; i++) {
    offset.set([Math.random() * 60, Math.random() * 30, Math.random() * 70], i * 3)
    seed[i] = Math.random()
    const c = pal[Math.floor(Math.random() * pal.length)]
    color.set([c.r, c.g, c.b], i * 3)
  }
  geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offset, 3))
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 1))
  geo.setAttribute('aColor', new THREE.InstancedBufferAttribute(color, 3))
  const uniforms = { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uGust: { value: 0 } }
  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.DoubleSide,
    transparent: true,
    vertexShader: /* glsl */ `
      attribute vec3 aOffset; attribute float aSeed; attribute vec3 aColor;
      uniform float uTime, uGust; uniform vec3 uCam;
      varying vec3 vColor; varying float vShade; varying float vFade;
      mat3 rot(vec3 a){
        float cx = cos(a.x), sx = sin(a.x), cy = cos(a.y), sy = sin(a.y), cz = cos(a.z), sz = sin(a.z);
        return mat3(cy*cz, cy*sz, -sy, sx*sy*cz - cx*sz, sx*sy*sz + cx*cz, sx*cy, cx*sy*cz + sx*sz, cx*sy*sz - sx*cz, cx*cy);
      }
      void main(){
        vec3 box = vec3(60.0, 30.0, 70.0);
        float t = uTime * (0.6 + aSeed * 0.6);
        vec3 wind = vec3(t * (2.2 + uGust * 6.0), sin(t * 0.7 + aSeed * 20.0) * 1.2 - t * 0.25, t * 0.8);
        vec3 p = mod(aOffset + wind - uCam + box * 0.5, box) - box * 0.5 + uCam;
        mat3 r = rot(vec3(t * 2.0 + aSeed * 6.0, t * 1.3, t * 0.9 + aSeed * 3.0));
        vec3 local = r * position;
        vec3 n = r * vec3(0.0, 0.0, 1.0);
        vShade = 0.65 + 0.35 * abs(n.y);
        vColor = aColor;
        vec4 mv = viewMatrix * vec4(p + local, 1.0);
        vFade = smoothstep(32.0, 18.0, length(mv.xyz)) * smoothstep(0.5, 2.0, -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor; varying float vShade; varying float vFade;
      void main(){ gl_FragColor = vec4(vColor * vShade, vFade); if (vFade < 0.02) discard; }`,
  })
  const mesh = new THREE.InstancedMesh(geo, mat, count)
  mesh.frustumCulled = false
  const group = new THREE.Group()
  group.add(mesh)
  themed((t) => (group.userData.hidden = t !== 'light'))
  return {
    group,
    center: new THREE.Vector3(),
    radius: Infinity,
    update(time, _dt, ctx: FrameCtx) {
      if (group.userData.hidden) return
      uniforms.uTime.value = time
      uniforms.uCam.value.copy(ctx.camera.position)
    },
  }
}
