import * as THREE from 'three'
import { flat, ink, label, themed } from '../paint'
import { NOISE, damp, smooth, type FrameCtx, type Piece } from '../util'

// The hero. At night: a breathing sphere of light, leaning toward the pointer. By day: a dandelion
// clock against the sky. Either way, the three things I ship orbit it, and it scatters on the wind
// as the story begins.
export function createCore(center: THREE.Vector3, count: number, pillars: string[]): Piece {
  const group = new THREE.Group()
  group.position.copy(center)

  const pos = new Float32Array(count * 3)
  const seed = new Float32Array(count)
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const th = golden * i
    pos.set([Math.cos(th) * r, y, Math.sin(th) * r], i * 3)
    seed[i] = Math.random()
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))

  const uniforms = {
    uTime: { value: 0 },
    uRadius: { value: 2.4 },
    uScatter: { value: 0 },
    uPointer: { value: new THREE.Vector3(0, 0, 3) },
    uPull: { value: 0 },
    uPx: { value: Math.min(devicePixelRatio, 1.75) },
    uA: { value: new THREE.Color() },
    uB: { value: new THREE.Color() },
    uC: { value: new THREE.Color() },
    uLight: { value: 0 },
  }
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      ${NOISE}
      uniform float uTime, uRadius, uScatter, uPull, uPx, uLight;
      uniform vec3 uPointer;
      attribute float aSeed;
      varying float vN; varying float vSeed; varying float vFade;
      void main(){
        vec3 dir = normalize(position);
        float n = snoise(dir * 1.6 + vec3(0.0, uTime * 0.18, uTime * 0.08));
        float n2 = snoise(dir * 4.0 - uTime * 0.25);
        // by day the puff is rounder and calmer, like a dandelion clock
        float r = uRadius * (1.0 + mix(n * 0.22 + n2 * 0.05, n * 0.06 + n2 * 0.03, uLight));
        vec3 p = dir * r;
        float d = distance(p, uPointer);
        p += normalize(uPointer - p + 1e-4) * uPull * smoothstep(1.8, 0.0, d) * 0.55;
        // scatter: night — outward burst; day — seeds carried off on the wind
        float s = uScatter * (0.6 + aSeed * 1.4);
        vec3 burst = dir * s * 14.0 + vec3(sin(aSeed * 40.0), cos(aSeed * 30.0), sin(aSeed * 20.0)) * s * 3.0;
        vec3 wind = vec3(s * (10.0 + aSeed * 14.0), s * (3.0 + sin(aSeed * 50.0) * 4.0), -s * 6.0 * aSeed) + dir * s * 2.0;
        p += mix(burst, wind, uLight);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (1.4 + aSeed * 2.2 + max(n, 0.0) * 2.5 * (1.0 - uLight) + uLight * 0.8) * uPx * (9.0 / -mv.z);
        vN = n; vSeed = aSeed; vFade = 1.0 - uScatter * 0.75;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uA, uB, uC; uniform float uLight;
      varying float vN; varying float vSeed; varying float vFade;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float a = smoothstep(0.5, 0.0, length(c));
        vec3 col = mix(uA, uB, smoothstep(-0.4, 0.5, vN));
        col = mix(col, uC, smoothstep(0.82, 1.0, vSeed) * 0.9);
        col *= mix(0.7 + vN * 0.6, 0.92 + vN * 0.12, uLight);
        gl_FragColor = vec4(col, a * mix(0.85, 0.9, uLight) * vFade);
      }`,
  })
  themed((t) => {
    const day = t === 'light'
    uniforms.uA.value.set(day ? '#ffffff' : '#39d353')
    uniforms.uB.value.set(day ? '#efe4cc' : '#2ee6d6')
    uniforms.uC.value.set(day ? '#f6c9d0' : '#9b7bff')
    uniforms.uLight.value = day ? 1 : 0
    mat.blending = day ? THREE.NormalBlending : THREE.AdditiveBlending
    mat.needsUpdate = true
  })
  const points = new THREE.Points(geo, mat)
  group.add(points)

  const heartMat = ink(['#39d353', '#8d6e4f'], 0.4)
  const heart = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(0.9, 1)), heartMat)
  group.add(heart)

  // the three things I ship, orbiting
  const ringMat = flat(['#2ee6d6', '#ffffff'], 0.55)
  const orbits = pillars.map((p, i) => {
    const pivot = new THREE.Group()
    pivot.rotation.set(Math.PI / 2 + (i - 1) * 0.42, (i - 1) * 0.5, (i - 1) * 0.2)
    const r = 3.3 + i * 0.35
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.008, 6, 200), ringMat)
    const holder = new THREE.Group()
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), flat(['#d9ffe4', '#c8553d']))
    node.position.x = r
    const tag = label(p, { size: 46, height: 0.34, color: [['#39d353', '#2ee6d6', '#9b7bff'][i], ['#3b3226', '#3b3226', '#3b3226'][i]], bg: ['rgba(4,10,8,0.75)', 'rgba(255,250,238,0.9)'], weight: 700 })
    tag.position.set(r, 0.38, 0)
    holder.add(node, tag)
    pivot.add(ring, holder)
    group.add(pivot)
    return { holder, tag, speed: 0.18 + i * 0.04, phase: i * 2.1 }
  })

  const local = new THREE.Vector3()
  const ray = new THREE.Raycaster()
  const plane = new THREE.Plane()
  return {
    group,
    center,
    radius: 6,
    update(time, dt, ctx: FrameCtx) {
      uniforms.uTime.value = time
      const scatter = smooth(0, 0.85, ctx.story - ctx.storyOf('hello'))
      uniforms.uScatter.value = scatter
      plane.setFromNormalAndCoplanarPoint(ctx.camera.getWorldDirection(local).negate(), center)
      ray.setFromCamera(ctx.pointer, ctx.camera)
      if (ray.ray.intersectPlane(plane, local)) {
        group.worldToLocal(local)
        local.clampLength(0, 3.2)
        uniforms.uPointer.value.lerp(local, damp(6, dt))
      }
      uniforms.uPull.value += (1 - scatter - uniforms.uPull.value) * damp(3, dt)
      points.rotation.y = time * 0.06
      heart.rotation.set(time * 0.2, time * 0.27, 0)
      heart.scale.setScalar(1 + Math.sin(time * 1.6) * 0.04 + scatter * 2)
      heartMat.opacity = 0.4 * (1 - scatter)
      ringMat.opacity = 0.55 * (1 - scatter)
      for (const o of orbits) {
        o.holder.rotation.z = o.phase + time * o.speed
        o.tag.material.opacity = 1 - scatter
      }
    },
  }
}
