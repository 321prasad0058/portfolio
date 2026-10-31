import * as THREE from 'three'
import { C, flat, flatLabel, ink, label, relabel, themed, toon, type Pair } from '../paint'
import { buildCar } from '../cars/build'
import { ALTROZ, SIERRA_EV, VICTORIS } from '../cars/specs'
import { type Piece } from '../util'

const box = (w: number, h: number, d: number, m: THREE.Material) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)

/** Kosha: a corner shop's handwritten ledger flies, page by page, into a credit passport. */
export function createKosha(center: THREE.Vector3): Piece {
  const group = new THREE.Group()
  group.position.copy(center)

  // the kirana: walls, a striped awning, a lit counter full of goods, a sign
  const shop = new THREE.Group()
  shop.position.set(-2.4, -0.3, -0.4)
  shop.rotation.y = 0.35
  const wall = box(2.6, 2.1, 1.5, toon(['#3a2430', '#e9a77c'], { glow: 0.12 }))
  const roof = box(2.9, 0.18, 1.8, toon(['#24161e', '#9c5b3d']))
  roof.position.y = 1.1
  // the lit interior sits clearly behind the goods (overlapping faces z-fight and shimmer)
  const inside = box(2.0, 1.1, 0.04, flat(['#b9853e', '#ffe2a3']))
  inside.position.set(0, -0.25, 0.7)
  const counter = box(2.2, 0.5, 0.3, toon(C.wood))
  counter.position.set(0, -0.8, 0.9)
  shop.add(wall, roof, inside, counter)
  const goods: Pair[] = [C.red, C.gold, C.green, C.cyan]
  for (let r = 0; r < 2; r++)
    for (let i = 0; i < 7; i++) {
      const g = box(0.16, 0.22, 0.08, toon(goods[(i + r) % 4], { glow: 0.3 }))
      g.position.set(-0.8 + i * 0.27, -0.05 - r * 0.38, 0.84)
      shop.add(g)
    }
  const awn = new THREE.Group()
  for (let i = 0; i < 8; i++) {
    const s = box(0.34, 0.05, 0.9, toon(i % 2 ? ['#a89c8b', '#fff6e6'] : ['#a3303a', '#c8553d']))
    s.position.set(-1.19 + i * 0.34, 0, 0)
    awn.add(s)
  }
  awn.position.set(0, 0.62, 1.1)
  awn.rotation.x = 0.42
  shop.add(awn)
  const sign = box(2.2, 0.42, 0.06, toon(['#0b4650', '#2f6f6a'], { glow: 0.3 }))
  sign.position.set(0, 1.45, 0.72)
  // painted flat on the board, so the whole word stays on the sign at any camera angle
  const signText = flatLabel('किराना स्टोर', { size: 60, height: 0.3, font: 'body', weight: 700, color: ['#ffd98a', '#fff3d6'] })
  signText.position.set(0, 1.45, 0.765) // just in front of the board's face
  shop.add(sign, signText)
  group.add(shop)

  // the khata: an open red ledger on the counter
  const book = new THREE.Group()
  book.position.set(-0.4, -1.25, 1.4)
  book.rotation.set(-1.1, 0.25, 0)
  const coverMat = toon(['#7a1f2b', '#b2423a'])
  const cl = box(0.75, 1.0, 0.04, coverMat)
  cl.position.x = -0.39
  const cr = cl.clone()
  cr.position.x = 0.39
  const pageMat = toon(C.paper, { side: THREE.DoubleSide })
  const pl = box(0.7, 0.94, 0.03, pageMat)
  pl.position.set(-0.37, 0, 0.03)
  const pr = pl.clone()
  pr.position.x = 0.37
  book.add(cl, cr, pl, pr)
  const lineMat = flat(['#6a7ab0', '#4a5a8a'])
  for (let k = 0; k < 6; k++) {
    const l = box(0.5, 0.025, 0.035, lineMat)
    l.position.set(0.37, 0.32 - k * 0.13, 0.04)
    book.add(l)
  }
  group.add(book)
  const khata = label('khata · the handwritten ledger', { size: 36, height: 0.24, color: C.soft })
  khata.position.set(-0.6, -1.95, 1.6)
  group.add(khata)

  // the passport
  const passport = new THREE.Group()
  passport.position.set(2.7, 0.35, 0.2)
  const card = box(1.9, 2.5, 0.08, toon(['#0e3b3a', '#2f6f6a'], { glow: 0.25 }))
  const border = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.75, 2.35, 0.1)), ink(C.gold))
  const seal = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.05, 10, 48), toon(C.gold, { glow: 0.6 }))
  seal.position.set(0, 0.62, 0.06)
  const title = flatLabel('CREDIT PASSPORT', { size: 34, height: 0.15, color: ['#ffd98a', '#fff3d6'], weight: 700 })
  title.position.set(0, 1.0, 0.045)
  const score = flatLabel('742', { size: 90, height: 0.46, font: 'display', weight: 800, color: ['#ffd98a', '#fff3d6'] })
  score.position.set(0, 0.05, 0.045)
  const band = flatLabel('verified · lender-ready', { size: 30, height: 0.13, color: ['#bfe8d8', '#e8f3ec'] })
  band.position.set(0, -0.32, 0.045)
  passport.add(card, border, seal, title, score, band)
  // a QR code anyone can scan to verify it
  const qr = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.07, 0.02), flat(['#bfe8d8', '#fffaf0']), 81)
  const d = new THREE.Object3D()
  let q = 0
  for (let y = 0; y < 9; y++)
    for (let x = 0; x < 9; x++) {
      const corner = (x < 3 && y < 3) || (x > 5 && y < 3) || (x < 3 && y > 5)
      const on = corner ? !(x % 6 === 1 && y % 6 === 1) : Math.sin(x * 12.9 + y * 78.2) > 0
      d.position.set(-0.28 + x * 0.07, -0.65 - y * 0.07, 0.06)
      d.scale.setScalar(on ? 1 : 0)
      d.updateMatrix()
      qr.setMatrixAt(q++, d.matrix)
    }
  passport.add(qr)
  group.add(passport)

  // pages lifting off the ledger and folding into the passport
  const flying = Array.from({ length: 6 }, (_, i) => {
    const p = box(0.5, 0.66, 0.015, pageMat)
    group.add(p)
    return { p, phase: i / 6 }
  })
  const from = new THREE.Vector3(-0.1, -1.0, 1.5)
  const to = passport.position.clone()
  const tmp = new THREE.Vector3()
  return {
    group,
    center,
    radius: 6,
    update(time) {
      passport.rotation.y = -0.3 + Math.sin(time * 0.6) * 0.15
      passport.position.y = 0.35 + Math.sin(time * 0.9) * 0.08
      seal.rotation.z = time * 0.5
      for (const f of flying) {
        const t = (time * 0.16 + f.phase) % 1
        tmp.lerpVectors(from, to, t)
        tmp.y += Math.sin(t * Math.PI) * 2.0
        f.p.position.copy(tmp)
        f.p.rotation.set(-1.1 * (1 - t) + Math.sin(t * 9) * 0.3, t * 3, Math.sin(t * 6) * 0.4)
        f.p.scale.setScalar(Math.sin((Math.min(t, 0.9) / 0.9) * Math.PI) * 0.9 + 0.1)
      }
    },
  }
}

/** SahiCar: its EV, SUV and hatchback lap a test track; each is scored at the gate, and the right one wins. */
export function createSahiCar(center: THREE.Vector3): Piece {
  const group = new THREE.Group()
  group.position.copy(center)
  const stage = new THREE.Group()
  stage.position.y = -1.1
  stage.rotation.x = 0.12
  group.add(stage)

  // the track: an asphalt ring with white edges and lane dashes, round a dark infield
  const R = 2.7
  const road = new THREE.Mesh(new THREE.RingGeometry(R - 0.5, R + 0.5, 96), toon(['#141b1f', '#8f8a80'], { side: THREE.DoubleSide }))
  road.rotation.x = -Math.PI / 2
  const infield = new THREE.Mesh(new THREE.CircleGeometry(R - 0.5, 64), toon(['#0b1310', '#5d7a60'], { side: THREE.DoubleSide }))
  infield.rotation.x = -Math.PI / 2
  infield.position.y = -0.002
  stage.add(road, infield)
  for (const r of [R - 0.47, R + 0.47]) {
    const edge = new THREE.Mesh(new THREE.RingGeometry(r - 0.025, r + 0.025, 96), flat(['#4f6e60', '#fffaf0'], undefined, { side: THREE.DoubleSide }))
    edge.rotation.x = -Math.PI / 2
    edge.position.y = 0.005
    stage.add(edge)
  }
  const DASHES = 28
  const dash = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.01, 0.28), flat(['#5f8070', '#fffaf0']), DASHES)
  const d = new THREE.Object3D()
  for (let i = 0; i < DASHES; i++) {
    const a = (i / DASHES) * Math.PI * 2
    d.position.set(Math.cos(a) * R, 0.008, Math.sin(a) * R)
    d.rotation.y = -a
    d.updateMatrix()
    dash.setMatrixAt(i, d.matrix)
  }
  stage.add(dash)

  // the scanner gate on the right of the track: it spans the road, so its face looks at the camera
  // and the cars drive straight through it
  const GATE = 0
  const gate = new THREE.Group()
  gate.position.set(Math.cos(GATE) * R, 0, Math.sin(GATE) * R)
  gate.rotation.y = -GATE
  const gateMat = toon(['#2a3430', '#e9e4d8'])
  for (const x of [-0.6, 0.6]) {
    const post = box(0.07, 0.95, 0.07, gateMat)
    post.position.set(x, 0.475, 0)
    gate.add(post)
  }
  const beam = box(1.27, 0.1, 0.09, gateMat)
  beam.position.y = 0.95
  gate.add(beam)
  const scan = new THREE.Mesh(new THREE.PlaneGeometry(1.13, 0.06), flat(['#e8efec', '#ffffff'], 0.7))
  gate.add(scan)
  stage.add(gate)

  // SahiCar's own procedural cars, at true relative size
  const SCALE = 0.27
  const rigs = [
    { spec: SIERRA_EV, score: 92, kind: 'EV' },
    { spec: VICTORIS, score: 84, kind: 'SUV' },
    { spec: ALTROZ, score: 78, kind: 'Hatchback' },
  ].map((c) => {
    const rig = buildCar(c.spec, { detail: 'low' })
    rig.group.scale.setScalar(SCALE)
    stage.add(rig.group)
    return { ...c, rig }
  })
  rigs.forEach((c) => c.rig.setLights(0))
  const BEST = Math.max(...rigs.map((c) => c.score))

  // the SahiScore dial, in white, standing in the middle of the track
  const dial = new THREE.Group()
  dial.position.set(0, 0.62, 0.55)
  dial.scale.setScalar(0.9)
  stage.add(dial)
  const TICKS = 36
  const tickMat = new THREE.MeshBasicMaterial({ transparent: true })
  const ticks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.035, 0.14, 0.02), tickMat, TICKS)
  const ARC = Math.PI * 1.5
  for (let i = 0; i < TICKS; i++) {
    const a = Math.PI * 1.25 - (i / (TICKS - 1)) * ARC
    d.position.set(Math.cos(a) * 0.72, Math.sin(a) * 0.72, 0)
    d.rotation.set(0, 0, a - Math.PI / 2)
    d.updateMatrix()
    ticks.setMatrixAt(i, d.matrix)
  }
  dial.add(ticks)
  const WHITE: Pair = ['#d9dfdc', '#ffffff']
  const title = label('SahiScore', { size: 30, height: 0.16, color: WHITE, weight: 600 })
  title.position.y = 0.3
  const num = label('00', { size: 90, height: 0.46, font: 'display', weight: 800, color: WHITE })
  num.position.y = -0.03
  const verdict = label('scoring…', { size: 30, height: 0.16, color: WHITE, weight: 600 })
  verdict.position.y = -0.4
  dial.add(title, num, verdict)
  const caption = label('every car · 5-year cost · safety · fit', { size: 30, height: 0.18, color: C.soft })
  caption.position.set(0, -1.75, 3.5)
  group.add(caption)

  const lit = new THREE.Color()
  const dim = new THREE.Color()
  themed((t) => {
    // white, but kept under the night glow's threshold so it reads as white rather than a halo
    lit.set(t === 'dark' ? '#b9c0bc' : '#ffffff')
    dim.set(t === 'dark' ? '#26302c' : '#9fb3a2')
    tickMat.opacity = t === 'dark' ? 0.85 : 1
  })

  let judged = -1
  let shown = 0
  let target = 0
  let lastKind = ''
  let lastNum = -1
  let lastTime = -1
  const SPEED = 0.36 // rad/s round the track
  return {
    group,
    center,
    radius: 6,
    update(time) {
      const dt = lastTime < 0 ? 0 : Math.min(0.1, time - lastTime)
      lastTime = time
      // cars evenly spaced, driving anticlockwise as seen from above; each takes its turn through the gate
      let nearest = -1
      rigs.forEach((c, i) => {
        const a = GATE - time * SPEED + (i / rigs.length) * Math.PI * 2
        c.rig.group.position.set(Math.cos(a) * R, 0, Math.sin(a) * R)
        c.rig.group.rotation.y = -(a - Math.PI / 2)
        c.rig.spin((SPEED * R * dt) / SCALE)
        const off = Math.atan2(Math.sin(a - GATE), Math.cos(a - GATE))
        if (off > -0.3 && off < 0.05) nearest = i
      })
      if (nearest >= 0 && nearest !== judged) {
        judged = nearest
        target = rigs[nearest].score
        shown = 40
      }
      shown += (target - shown) * 0.06
      const v = Math.round(shown)
      const k = judged < 0 ? 'scoring…' : rigs[judged].score === BEST ? `${rigs[judged].kind} · the right car` : rigs[judged].kind
      if (k !== lastKind) {
        lastKind = k
        relabel(verdict, k)
      }
      if (v !== lastNum) {
        lastNum = v
        relabel(num, String(v).padStart(2, '0'))
        for (let i = 0; i < TICKS; i++) ticks.setColorAt(i, i / (TICKS - 1) <= v / 100 ? lit : dim)
        if (ticks.instanceColor) ticks.instanceColor.needsUpdate = true
      }
      // the scan line sweeps up and down the gate
      scan.position.y = 0.1 + ((Math.sin(time * 2.4) + 1) / 2) * 0.75
    },
  }
}

/** VANA: a lotus that opens and closes with a slow breath, on a still pond. */
export function createVana(center: THREE.Vector3): Piece {
  const group = new THREE.Group()
  group.position.copy(center)
  const water = { uTime: { value: 0 }, uA: { value: new THREE.Color() }, uB: { value: new THREE.Color() } }
  themed((t) => {
    water.uA.value.set(t === 'dark' ? '#080b22' : '#86c4d4')
    water.uB.value.set(t === 'dark' ? '#9b7bff' : '#ffffff')
  })
  const pond = new THREE.Mesh(
    new THREE.CircleGeometry(4.6, 96),
    new THREE.ShaderMaterial({
      uniforms: water,
      transparent: true,
      vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: /* glsl */ `
        uniform float uTime; uniform vec3 uA, uB; varying vec2 vP;
        void main(){
          float r = length(vP);
          float ring = 0.0;
          for (int i = 0; i < 3; i++){
            float w = fract(uTime * 0.12 + float(i) / 3.0) * 4.6;
            ring += smoothstep(0.06, 0.0, abs(r - w)) * (1.0 - w / 4.6);
          }
          vec3 col = mix(uA, uB, ring * 0.6);
          float edge = smoothstep(4.6, 3.6, r);
          gl_FragColor = vec4(col, edge * 0.92);
          #include <colorspace_fragment>
        }`,
    }),
  )
  pond.rotation.x = -Math.PI / 2
  pond.position.y = -1.2
  group.add(pond)

  const padMat = toon(['#1e4a3a', '#5c9a3f'], { side: THREE.DoubleSide })
  ;[
    [2.4, 1.2, 0.8],
    [-2.6, 0.4, 0.65],
    [1.0, -2.6, 0.55],
    [-1.4, 2.4, 0.5],
  ].forEach(([x, z, r]) => {
    const pad = new THREE.Mesh(new THREE.CircleGeometry(r, 32, 0.3, Math.PI * 1.85), padMat)
    pad.rotation.x = -Math.PI / 2
    pad.position.set(x, -1.17, z)
    group.add(pad)
  })

  const lotus = new THREE.Group()
  lotus.position.y = -1.0
  const petalGeo = new THREE.SphereGeometry(1, 24, 16)
  petalGeo.scale(0.36, 1, 0.12)
  petalGeo.translate(0, 1, 0)
  const layers = [
    { n: 9, len: 1.15, open: 1.15, mat: toon(['#7a5cff', '#f4a7b9'], { glow: 0.5 }) },
    { n: 8, len: 0.95, open: 0.7, mat: toon(['#a98bff', '#f7c3cf'], { glow: 0.55 }) },
    { n: 6, len: 0.7, open: 0.32, mat: toon(['#d6c8ff', '#fde3e8'], { glow: 0.6 }) },
  ].map((l, li) => {
    const pivots = Array.from({ length: l.n }, (_, i) => {
      const p = new THREE.Group()
      p.rotation.y = (i / l.n) * Math.PI * 2 + li * 0.3
      const tilt = new THREE.Group()
      const m = new THREE.Mesh(petalGeo, l.mat)
      m.scale.setScalar(l.len)
      tilt.add(m)
      p.add(tilt)
      lotus.add(p)
      return tilt
    })
    return { ...l, pivots }
  })
  const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.22, 24), toon(['#ffd36e', '#e9c46a'], { glow: 0.6 }))
  pod.position.y = 0.25
  lotus.add(pod)
  group.add(lotus)

  const breath = label('breathe in', { size: 52, height: 0.36, font: 'body', weight: 600, color: C.violet })
  breath.position.set(0, 2.9, 0)
  group.add(breath)

  // fireflies at night, pollen by day
  const N = 40
  const fpos = new Float32Array(N * 3)
  const fseed = Array.from({ length: N }, () => Math.random())
  const fgeo = new THREE.BufferGeometry()
  fgeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3))
  const fmat = new THREE.PointsMaterial({ size: 0.09, transparent: true, depthWrite: false })
  themed((t) => {
    fmat.color.set(t === 'dark' ? '#ffe28a' : '#fffaf0')
    fmat.blending = t === 'dark' ? THREE.AdditiveBlending : THREE.NormalBlending
    fmat.needsUpdate = true
  })
  const flies = new THREE.Points(fgeo, fmat)
  flies.frustumCulled = false
  group.add(flies)

  let inhale = true
  return {
    group,
    center,
    radius: 6,
    update(time) {
      water.uTime.value = time
      // four seconds in, four seconds out
      const b = (Math.sin((time / 8) * Math.PI * 2 - Math.PI / 2) + 1) / 2
      for (const l of layers) for (const t of l.pivots) t.rotation.x = l.open * (0.45 + b * 0.75)
      lotus.rotation.y = time * 0.05
      lotus.scale.setScalar(0.95 + b * 0.1)
      const nowIn = Math.cos((time / 8) * Math.PI * 2 - Math.PI / 2) > 0
      if (nowIn !== inhale) {
        inhale = nowIn
        relabel(breath, inhale ? 'breathe in' : 'breathe out')
      }
      breath.material.opacity = 0.35 + Math.abs(b - 0.5) * 1.3
      for (let i = 0; i < N; i++) {
        const s = fseed[i]
        fpos.set(
          [Math.sin(time * 0.3 * (0.5 + s) + s * 40) * (1.5 + s * 2.6), -0.6 + ((time * 0.1 * (0.4 + s) + s) % 1) * 3.4, Math.cos(time * 0.25 + s * 30) * (1.2 + s * 2)],
          i * 3,
        )
      }
      fgeo.attributes.position.needsUpdate = true
    },
  }
}

/** Transcribo: four people at a table; whoever speaks is written into the minutes in their colour. */
export function createTranscribo(center: THREE.Vector3): Piece {
  const group = new THREE.Group()
  group.position.copy(center)
  const scene = new THREE.Group()
  scene.position.set(-1.4, -0.6, 0)
  scene.rotation.x = 0.18
  group.add(scene)
  const table = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.12, 48), toon(C.wood))
  table.position.y = -0.3
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.9, 16), toon(C.wood))
  stem.position.y = -0.8
  // the laptop in the middle, doing all of it offline
  const laptop = new THREE.Group()
  const base = box(0.7, 0.04, 0.48, toon(C.soft))
  const screen = box(0.7, 0.46, 0.03, toon(['#0e2a2a', '#2f6f6a'], { glow: 0.6 }))
  screen.position.set(0, 0.23, -0.24)
  screen.rotation.x = -0.25
  laptop.add(base, screen)
  laptop.position.y = -0.22
  scene.add(table, stem, laptop)
  const speakers: Pair[] = [C.cyan, C.green, C.gold, C.violet]
  const people = speakers.map((c, i) => {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4
    const p = new THREE.Group()
    p.position.set(Math.cos(a) * 2.15, -0.3, Math.sin(a) * 2.15)
    const mat = toon(c, { glow: 0.35 })
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.5, 6, 16), mat)
    body.position.y = 0.1
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 24), mat)
    head.position.y = 0.72
    p.add(body, head)
    const waves = [0, 1, 2].map(() => {
      const w = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.018, 6, 48), flat(c, 0.8, { additiveAtNight: true }))
      w.position.y = 0.72
      w.rotation.y = -a + Math.PI / 2
      p.add(w)
      return w
    })
    scene.add(p)
    return { head, waves }
  })

  // the minutes, filling up line by line
  const doc = new THREE.Group()
  doc.position.set(2.9, 0.5, 0)
  doc.rotation.y = -0.35
  doc.add(box(2.1, 2.7, 0.04, toon(C.paper, { glow: 0.12 })))
  const title = label('minutes.txt · on-device', { size: 32, height: 0.17, color: C.soft })
  title.position.set(0, 1.12, 0.04)
  doc.add(title)
  const LINES = 9
  const rows = Array.from({ length: LINES }, (_, i) => {
    const who = box(0.16, 0.1, 0.03, flat(C.soft))
    who.position.set(-0.8, 0.82 - i * 0.24, 0.04)
    const text = box(1, 0.06, 0.03, flat(C.soft))
    text.position.set(-0.6, 0.82 - i * 0.24, 0.04)
    doc.add(who, text)
    return { who, text }
  })
  const action = label('→ summary + action items emailed', { size: 30, height: 0.15, color: C.green })
  action.position.set(0, -1.18, 0.04)
  doc.add(action)
  group.add(doc)

  const colors = speakers.map(() => new THREE.Color())
  themed((t) => speakers.forEach((c, i) => colors[i].set(c[t === 'dark' ? 0 : 1])))
  const order = Array.from({ length: LINES }, (_, i) => (i * 3 + (i % 2)) % 4)
  const widths = Array.from({ length: LINES }, () => 0.5 + Math.random() * 0.9)
  return {
    group,
    center,
    radius: 6,
    update(time) {
      const turn = 1.4
      const step = Math.floor(time / turn)
      const written = (step % (LINES + 3)) + 1
      const speaking = order[Math.min(written - 1, LINES - 1)]
      const talking = written <= LINES
      people.forEach((pp, i) => {
        const on = talking && i === speaking
        pp.head.position.y = 0.72 + (on ? Math.abs(Math.sin(time * 10)) * 0.04 : 0)
        pp.waves.forEach((w, k) => {
          const f = (time * 1.2 + k / 3) % 1
          w.scale.setScalar(on ? 1 + f * 1.8 : 0.001)
          ;(w.material as THREE.MeshBasicMaterial).opacity = on ? 0.8 * (1 - f) : 0
        })
      })
      // a line per turn spoken; the page clears once it's full and emailed
      rows.forEach((r, i) => {
        const vis = i < written
        ;(r.who.material as THREE.MeshBasicMaterial).color.copy(colors[order[i]])
        r.who.visible = r.text.visible = vis
        const progress = i === written - 1 ? Math.min(1, ((time % turn) / turn) * 1.5) : 1
        r.text.scale.x = Math.max(0.001, widths[i] * progress)
        r.text.position.x = -0.66 + (widths[i] * progress) / 2
      })
      action.visible = written > LINES
    },
  }
}
