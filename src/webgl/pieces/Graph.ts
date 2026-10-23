import * as THREE from 'three'
import type { Calendar, Cell } from '../../lib/activity'
import { C, flat, ink, label, themed, toon } from '../paint'
import { type Piece } from '../util'

// The daily-activity calendar as a field of light at night, and by day a meadow growing on a floating
// island. Bars rise in a wave, column by column; a band of light sweeps across the year.
const COLS = 53
const ROWS = 7
const CELL = 0.34
const BAR = 0.26
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const LEVELS = {
  // every active level is unmistakably green; only empty days stay neutral
  dark: ['#1b222c', '#1f8a43', '#26a641', '#39d353', '#56e06f'],
  light: ['#e2d6b8', '#a5d07a', '#7cb85a', '#4f9a3d', '#2f7a2c'],
}

export type GraphPiece = Piece & {
  setCalendar(cal: Calendar): void
  pick(ray: THREE.Raycaster): Cell | null
  clearHover(): void
  /** start the rise the first time the visitor arrives */
  arrive(): void
}

export function createGraph(center: THREE.Vector3): GraphPiece {
  const group = new THREE.Group()
  group.position.copy(center)
  const n = COLS * ROWS

  const geo = new THREE.BoxGeometry(BAR, 1, BAR)
  geo.translate(0, 0.5, 0)
  const aLevel = new THREE.InstancedBufferAttribute(new Float32Array(n), 1)
  const aCol = new THREE.InstancedBufferAttribute(new Float32Array(n), 1)
  const aIndex = new THREE.InstancedBufferAttribute(new Float32Array(n), 1)
  for (let i = 0; i < n; i++) {
    aCol.array[i] = Math.floor(i / ROWS)
    aIndex.array[i] = i
  }
  geo.setAttribute('aLevel', aLevel)
  geo.setAttribute('aCol', aCol)
  geo.setAttribute('aIndex', aIndex)

  const uniforms = {
    uTime: { value: 0 },
    uGrow: { value: 0 },
    uHover: { value: -1 },
    uLevels: { value: LEVELS.dark.map((c) => new THREE.Color(c)) },
    uSweep: { value: new THREE.Color() },
    uLight: { value: 0 },
  }
  themed((t) => {
    LEVELS[t].forEach((c, i) => uniforms.uLevels.value[i].set(c))
    uniforms.uSweep.value.set(t === 'dark' ? '#40ff8c' : '#fff1c4')
    uniforms.uLight.value = t === 'light' ? 1 : 0
  })
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      attribute float aLevel; attribute float aCol; attribute float aIndex;
      uniform float uGrow, uHover;
      varying vec3 vN; varying float vLevel; varying float vY; varying float vCol; varying float vHover;
      float backOut(float t){ float s = 1.9; t -= 1.0; return t*t*((s+1.0)*t + s) + 1.0; }
      void main(){
        float local = clamp(uGrow * 1.6 - (aCol / 52.0) * 0.6, 0.0, 1.0);
        float g = local <= 0.0 ? 0.0 : backOut(local);
        vec3 p = position;
        p.y *= max(g, 0.02);
        vec4 wp = modelMatrix * instanceMatrix * vec4(p, 1.0);
        vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
        vLevel = aLevel; vY = position.y; vCol = aCol; vHover = step(abs(aIndex - uHover), 0.5);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uLevels[5]; uniform vec3 uSweep; uniform float uTime, uLight;
      varying vec3 vN; varying float vLevel; varying float vY; varying float vCol; varying float vHover;
      void main(){
        int li = int(vLevel + 0.5);
        vec3 base = uLevels[0];
        if (li == 1) base = uLevels[1]; else if (li == 2) base = uLevels[2]; else if (li == 3) base = uLevels[3]; else if (li == 4) base = uLevels[4];
        vec3 L = normalize(vec3(0.4, 1.0, 0.55));
        float d = max(dot(vN, L), 0.0);
        // night: smooth glow; day: three flat painted tones
        float diff = mix(0.45 + 0.55 * d, d > 0.75 ? 1.05 : d > 0.3 ? 0.86 : 0.68, uLight);
        float top = step(0.9, vN.y);
        vec3 col = base * diff * (0.7 + top * mix(0.2, 0.25, uLight));
        col += base * vY * vLevel * 0.05 * (1.0 - uLight);
        float sweep = mod(uTime * 9.0, 90.0) - 15.0;
        float band = exp(-pow(vCol - sweep, 2.0) / 6.0);
        col += uSweep * band * mix(0.04 + vLevel * 0.05, 0.18, uLight);
        col = mix(col, mix(vec3(1.0), vec3(0.78, 0.33, 0.24), uLight), vHover * 0.75);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  })
  const mesh = new THREE.InstancedMesh(geo, mat, n)
  mesh.frustumCulled = false
  group.add(mesh)

  // the ground: a slab (night: dark glass with a glowing rim; day: a meadow on a floating island)
  const w = COLS * CELL + 0.7
  const d = ROWS * CELL + 0.7
  const slab = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), toon(['#070b10', '#7cb342'], { glow: 0.05 }))
  slab.position.y = -0.08
  const rim = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, 0.16, d)), ink(C.green, 0.55))
  rim.position.y = -0.08
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 1.35, d * 3.2),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uC: { value: new THREE.Color('#39d353') } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader:
        'uniform vec3 uC; varying vec2 vUv; void main(){ vec2 p = (vUv - 0.5) * vec2(1.0, 2.2); float a = smoothstep(0.62, 0.0, length(p)); gl_FragColor = vec4(uC, a * 0.16); }',
    }),
  )
  glow.rotation.x = -Math.PI / 2
  glow.position.y = -0.17
  group.add(slab, rim, glow)

  // the floating island, by day: earth and rock tapering below the meadow, a few trees, a waterfall
  const island = new THREE.Group()
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.35, 1, 9, 3), toon(['#2a1c14', '#9c6b43']))
  soil.scale.set(w / 2 + 0.6, 3.2, d / 2 + 1.0)
  soil.position.y = -1.78
  const rock = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 7), toon(['#1c140f', '#7a5236']))
  rock.scale.set(w / 3.2, 3.4, d / 2.4)
  rock.position.y = -4.9
  rock.rotation.x = Math.PI
  const lip = new THREE.Mesh(new THREE.BoxGeometry(w + 1.0, 0.2, d + 1.6), toon(['#14301d', '#6aa84f']))
  lip.position.y = -0.24
  island.add(soil, rock, lip)
  const treeMat = toon(['#14301d', '#4c8a3a'])
  const trunkMat = toon(['#2a1c14', '#7a5236'])
  ;[
    [-w / 2 - 0.1, 0.9, 1.15],
    [-w / 2 + 0.9, -0.95, 0.85],
    [w / 2 + 0.05, 0.75, 1.0],
  ].forEach(([x, z, s]) => {
    const t = new THREE.Group()
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.7, 8), trunkMat)
    trunk.position.y = 0.35
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), treeMat)
    crown.position.y = 1.0
    const crown2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 1), treeMat)
    crown2.position.set(0.3, 0.8, 0.1)
    t.add(trunk, crown, crown2)
    t.position.set(x, -0.15, z)
    t.scale.setScalar(s)
    island.add(t)
  })
  const fall = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 4.5), flat(['#ffffff', '#e8f6ff'], 0.75))
  fall.position.set(w / 2 - 2, -2.4, d / 2 + 0.9)
  island.add(fall)
  group.add(island)
  themed((t) => {
    const day = t === 'light'
    island.visible = day
    rim.visible = glow.visible = !day
  })

  const labels = new THREE.Group()
  group.add(labels)
  const dummy = new THREE.Object3D()
  let cells: Cell[] = []
  let growing = false
  let seen = false

  function setCalendar(cal: Calendar) {
    cells = cal.weeks.flat()
    const max = Math.max(1, ...cells.map((c) => c.count))
    cells.forEach((c, i) => {
      const col = Math.floor(i / ROWS)
      const row = i % ROWS
      const h = c.count < 0 ? 0 : c.count === 0 ? 0.05 : 0.22 + Math.sqrt(c.count / max) * 2.9
      dummy.position.set((col - (COLS - 1) / 2) * CELL, 0, (row - (ROWS - 1) / 2) * CELL)
      dummy.scale.set(c.count < 0 ? 0 : 1, Math.max(h, 1e-4), c.count < 0 ? 0 : 1)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      aLevel.array[i] = c.count > 0 ? c.level : 0
    })
    mesh.instanceMatrix.needsUpdate = true
    aLevel.needsUpdate = true
    mesh.computeBoundingSphere()
    uniforms.uGrow.value = 0
    growing = seen

    labels.children.forEach((s) => {
      const m = (s as THREE.Sprite).material
      m.map?.dispose()
      m.dispose()
    })
    labels.clear()
    let lastMonth = -1
    cal.weeks.forEach((col, ci) => {
      const first = col.find((c) => c.count >= 0)
      if (!first) return
      const m = Number(first.date.slice(5, 7)) - 1
      if (m !== lastMonth && ci < COLS - 2) {
        lastMonth = m
        const s = label(MONTHS[m], { size: 40, height: 0.26, color: C.soft })
        s.position.set((ci - (COLS - 1) / 2) * CELL + 0.2, 0.05, d / 2 + 0.45)
        labels.add(s)
      }
    })
    ;['Mon', 'Wed', 'Fri'].forEach((t, k) => {
      const s = label(t, { size: 40, height: 0.24, color: C.soft })
      s.position.set(-w / 2 - 0.5, 0.05, (1 + k * 2 - (ROWS - 1) / 2) * CELL)
      labels.add(s)
    })
  }

  return {
    group,
    center,
    radius: 13,
    setCalendar,
    arrive() {
      if (seen) return
      seen = true
      growing = true
    },
    clearHover() {
      uniforms.uHover.value = -1
    },
    pick(ray) {
      const hit = ray.intersectObject(mesh, false)[0]
      const i = hit?.instanceId
      const c = i === undefined ? undefined : cells[i]
      uniforms.uHover.value = c && c.count >= 0 ? i! : -1
      return c && c.count >= 0 ? c : null
    },
    update(time, dt) {
      uniforms.uTime.value = time
      if (growing) {
        uniforms.uGrow.value = Math.min(1, uniforms.uGrow.value + dt * 0.55)
        if (uniforms.uGrow.value >= 1) growing = false
      }
      ;(fall.material as THREE.MeshBasicMaterial).opacity = 0.6 + Math.sin(time * 6) * 0.08
    },
  }
}
