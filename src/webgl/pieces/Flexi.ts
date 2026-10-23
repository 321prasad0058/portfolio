import * as THREE from 'three'
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { FL_BLUE, FL_MARK, FL_WORD } from '../../data/flLogo'
import { getTheme } from '../../lib/theme'
import { C, blendFor, flat, ink, label, pulse, relabel, themed, toon, type Pair } from '../paint'
import { damp, type FrameCtx, type Piece } from '../util'

// FlexiLoans, in production: five systems I built, each as a small working machine that shows what it
// does. They stand in a ring around the FlexiLoans hub, facing outward; from above they read as a
// system map, and the camera then circles the ring visiting each one.

const R = 22 // radius of the ring the five scenes stand on, around the FlexiLoans hub
const TAU = Math.PI * 2

type Scene = { g: THREE.Group; update(time: number, dt: number, focus: number): void }

const box = (w: number, h: number, d: number, m: THREE.Material) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)

/** Extrude SVG path data (y down, in SVG units) into one centred, y-up geometry `width` units wide. */
function extrudeSvg(ds: string[], width: number, depth: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg">${ds.map((d) => `<path fill-rule="evenodd" d="${d}"/>`).join('')}</svg>`
  const parts: THREE.BufferGeometry[] = []
  for (const path of new SVGLoader().parse(svg).paths)
    for (const shape of SVGLoader.createShapes(path)) parts.push(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 16 }))
  const geo = mergeGeometries(parts)
  geo.computeBoundingBox()
  const bb = geo.boundingBox!
  const k = width / (bb.max.x - bb.min.x)
  geo.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, 0)
  geo.scale(k, -k, k) // SVG's y axis points down
  return geo
}

/**
 * 1 · Customer Journey Portal: an application travels the whole journey I built — onboarding gates,
 * a sanction, the post-sanction checks — and arrives as money. The partner each step talks to lights up
 * as it passes. Above it floats the customer dashboard.
 */
function cjp(): Scene {
  const g = new THREE.Group()
  const L = 17.6
  const track = box(L, 0.14, 1.3, toon(C.body))
  track.position.y = -1.25
  const rail = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(L, 0.14, 1.3)), ink(C.green, 0.7))
  rail.position.y = -1.25
  g.add(track, rail)
  const phase = (t: string, x: number, c: Pair) => {
    const s = label(t, { size: 34, height: 0.22, color: c, weight: 700 })
    s.position.set(x, -1.62, 0.75)
    g.add(s)
  }
  phase('ONBOARDING', -4.6, C.green)
  phase('POST-SANCTION', 5, C.cyan)

  const steps: { name: string; partners: string[] }[] = [
    { name: 'Apply', partners: [] },
    { name: 'Bureau', partners: ['CIBIL', 'Experian', 'Equifax'] },
    { name: 'KYC', partners: ['IDfy', 'NSDL', 'DigiLocker', 'Udyam'] },
    { name: 'Bank data', partners: ['Finarkein', 'Setu'] },
    { name: 'Sanction', partners: [] },
    { name: 'VKYC', partners: [] },
    { name: 'e-Sign · MITC', partners: ['Leegality'] },
    { name: 'e-NACH', partners: ['Digio'] },
    { name: 'Disburse', partners: ['Razorpay', 'Synoriq LMS'] },
  ]
  const onboardMat = toon(C.green, { glow: 0.4 })
  const postMat = toon(C.cyan, { glow: 0.4 })
  const goldMat = toon(C.gold, { glow: 0.5 })
  const tagBg: Pair = ['rgba(4,10,8,0.82)', 'rgba(255,250,238,0.94)']
  const gates = steps.map((st, i) => {
    const x = -8 + i * 2
    const mat = i === 4 ? goldMat : i < 4 ? onboardMat : postMat
    const big = i === 4 ? 1.18 : 1
    const arch = new THREE.Group()
    const l = box(0.12, 1.9, 0.12, mat)
    l.position.set(-0.55, -0.25, 0)
    const r = l.clone()
    r.position.x = 0.55
    const top = box(1.25, 0.14, 0.14, mat)
    top.position.y = 0.72
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 16), flat(C.white))
    lamp.position.y = 0.95
    const tag = label(st.name, { size: 42, height: 0.28, bg: tagBg })
    tag.position.y = 1.32
    arch.add(l, r, top, lamp, tag)
    arch.position.x = x
    arch.scale.setScalar(big)
    g.add(arch)
    // the partners this step calls, stacked above it
    const ptags = st.partners.map((p, k) => {
      const s = label(p, { size: 34, height: 0.22, color: i < 4 ? C.green : C.cyan, bg: tagBg, weight: 600 })
      s.position.set(x, 1.85 + k * 0.32, -0.15)
      g.add(s)
      return s
    })
    if (ptags.length) {
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, 1.0, -0.1), new THREE.Vector3(x, 1.72, -0.15)]), ink(C.soft, 0.5))
      g.add(line)
    }
    return { lamp, x, flash: 0, ptags }
  })

  const cardMat = toon(C.paper, { glow: 0.15 })
  const coinMat = toon(C.gold, { glow: 0.5 })
  const tokens = Array.from({ length: 5 }, () => {
    const card = box(0.62, 0.42, 0.06, cardMat)
    const stripe = box(0.4, 0.05, 0.07, flat(C.green))
    stripe.position.y = 0.08
    card.add(stripe)
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 32), coinMat)
    coin.rotation.x = Math.PI / 2
    g.add(card, coin)
    return { card, coin, stripe }
  })
  const stripeOn = new THREE.Color()
  const stripeSanctioned = new THREE.Color()
  themed((t) => {
    stripeOn.set(C.green[t === 'dark' ? 0 : 1])
    stripeSanctioned.set(C.gold[t === 'dark' ? 0 : 1])
  })

  // the customer dashboard, floating above the journey
  const dash = new THREE.Group()
  dash.position.set(0, 4.5, -1.4)
  const panel = box(7.4, 3.7, 0.12, toon(C.paper, { glow: 0.12 }))
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(7.4, 3.7, 0.12)), ink(C.cyan, 0.7))
  dash.add(panel, frame)
  const dl = (t: string, x: number, y: number, size = 32, c: Pair = C.soft) => {
    const s = label(t, { size, height: size / 150, color: c, weight: 600 })
    s.position.set(x, y, 0.1)
    dash.add(s)
    return s
  }
  dl('My dashboard', -2.55, 1.45, 40, C.ink)
  dl('application · 4 of 5 steps done', 1.45, 1.45, 30, C.green)
  // credit score dial
  const dialBg = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.78, 64, 1, -0.6, Math.PI + 1.2), flat(C.soft, 0.25, { side: THREE.DoubleSide }))
  dialBg.position.set(-2.6, 0.15, 0.08)
  const dialFg = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.78, 64, 1, Math.PI + 0.6 - (Math.PI + 1.2) * 0.78, (Math.PI + 1.2) * 0.78), toon(C.green, { glow: 0.5, side: THREE.DoubleSide }))
  dialFg.position.copy(dialBg.position)
  dialFg.position.z = 0.1 // never at the same depth as the track behind it
  dash.add(dialBg, dialFg)
  dl('762', -2.6, 0.18, 54, C.ink)
  dl('credit score', -2.6, -0.85, 28)
  // cash-flow insights: bars from the bank statement
  const BARS = 9
  const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 1, 0.06), toon(['#ffffff', '#ffffff'], { glow: 0, glowColor: ['#000000', '#000000'] }), BARS)
  const barIn = new THREE.Color()
  const barOut = new THREE.Color()
  themed((t) => {
    barIn.set(t === 'dark' ? '#39d353' : '#5c9a3f')
    barOut.set(t === 'dark' ? '#ff6b5a' : '#c8553d')
  })
  dash.add(bars)
  dl('cash-flow insights', 0.2, -0.85, 28)
  // rewards: a turning star
  const starShape = new THREE.Shape()
  for (let k = 0; k < 10; k++) {
    const rr = k % 2 ? 0.22 : 0.5
    const a = (k / 10) * TAU + Math.PI / 2
    if (k === 0) starShape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
    else starShape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
  }
  const star = new THREE.Mesh(new THREE.ExtrudeGeometry(starShape, { depth: 0.1, bevelEnabled: false }), toon(C.gold, { glow: 0.5 }))
  star.position.set(2.75, 0.35, 0.1)
  dash.add(star)
  dl('rewards', 2.75, -0.4, 28)
  ;['My loans', 'Refer & earn', 'Profile'].forEach((t, k) => {
    const s = label(t, { size: 30, height: 0.2, color: C.ink, bg: [`rgba(46,230,214,0.14)`, 'rgba(61,124,184,0.12)'] })
    s.position.set(-2.4 + k * 2.1, -1.4, 0.1)
    dash.add(s)
  })
  g.add(dash)
  const tether = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 2.6, -1.4), new THREE.Vector3(0, 0.95, -0.2)]), ink(C.cyan, 0.35))
  g.add(tether)

  const dummy = new THREE.Object3D()
  return {
    g,
    update(time, dt) {
      tokens.forEach((t, i) => {
        const p = (time * 0.05 + i / tokens.length) % 1
        const x = -9.4 + p * 19
        const done = x > 8.6
        t.card.visible = !done
        t.coin.visible = done
        t.card.position.set(x, -0.55 + Math.sin(time * 3 + i) * 0.04, 0)
        t.card.rotation.y = Math.sin(time * 2 + i) * 0.2
        // the application turns gold once it is sanctioned
        ;(t.stripe.material as THREE.MeshBasicMaterial).color.copy(x > 0 ? stripeSanctioned : stripeOn)
        const rise = Math.max(0, x - 8.6)
        t.coin.position.set(x, -0.55 + rise * 1.6, 0)
        t.coin.rotation.y = time * 4
        t.coin.scale.setScalar(Math.max(0, 1 - rise * 1.2))
        for (const gt of gates) if (Math.abs(x - gt.x) < 0.12) gt.flash = 1
      })
      for (const gt of gates) {
        gt.flash = Math.max(0, gt.flash - dt * 1.2)
        gt.lamp.scale.setScalar(1 + gt.flash * 0.9)
        for (const s of gt.ptags) pulse(s, 1 + gt.flash * 0.12)
      }
      for (let k = 0; k < BARS; k++) {
        const v = 0.25 + Math.abs(Math.sin(time * 0.8 + k * 0.9)) * 0.75 * (0.6 + 0.4 * Math.sin(k * 1.7))
        dummy.position.set(-0.75 + k * 0.24, -0.6 + v * 0.5, 0.13) // clear of the panel face
        dummy.scale.set(1, v, 1)
        dummy.updateMatrix()
        bars.setMatrixAt(k, dummy.matrix)
        bars.setColorAt(k, k % 4 === 3 ? barOut : barIn)
      }
      bars.instanceMatrix.needsUpdate = true
      bars.instanceColor!.needsUpdate = true
      star.rotation.y = time * 1.2
      dash.position.y = 4.5 + Math.sin(time * 0.8) * 0.06
    },
  }
}

/** 4 · Statement parser: bank statements go through a scanner and come out as rows in a table. */
function parser(): Scene {
  const g = new THREE.Group()
  const sheetMat = toon(C.paper, { glow: 0.12, side: THREE.DoubleSide })
  const lineMat = flat(C.soft)
  const sheets = Array.from({ length: 3 }, () => {
    const s = box(1.3, 1.7, 0.03, sheetMat)
    for (let k = 0; k < 8; k++) {
      const l = box(k % 3 === 0 ? 0.9 : 0.7, 0.05, 0.04, lineMat)
      l.position.set(-0.08 + (k % 3 === 0 ? 0.05 : 0), 0.6 - k * 0.16, 0)
      s.add(l)
    }
    g.add(s)
    return s
  })
  const pdf = label('statement.pdf', { size: 40, height: 0.28, color: C.soft })
  pdf.position.set(-3.6, 1.55, 0)
  g.add(pdf)

  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.3, 2.4, 2)), ink(C.cyan))
  frame.position.x = -1.1
  const laser = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 2.0), flat(C.red, 0.9, { additiveAtNight: true }))
  laser.rotation.y = Math.PI / 2
  laser.position.x = -1.1
  laser.scale.set(1, 1, 1)
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.04), flat(C.red, 0.9, { additiveAtNight: true }))
  beam.position.x = -1.1
  g.add(frame, laser, beam)

  const COLS = 4
  const ROWS = 7
  const cell = new THREE.InstancedMesh(new THREE.BoxGeometry(0.62, 0.2, 0.06), toon(['#ffffff', '#ffffff'], { glow: 0, glowColor: ['#000000', '#000000'] }), COLS * ROWS)
  const off = new THREE.Color()
  const head = new THREE.Color()
  const on = new THREE.Color()
  themed((t) => {
    off.set(t === 'dark' ? '#14201b' : '#e7dcc0')
    head.set(t === 'dark' ? '#2ee6d6' : '#3d7cb8')
    on.set(t === 'dark' ? '#39d353' : '#6aa84f')
  })
  const dummy = new THREE.Object3D()
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      dummy.position.set(0.9 + c * 0.7, 1.0 - r * 0.3, 0)
      dummy.updateMatrix()
      cell.setMatrixAt(r * COLS + c, dummy.matrix)
    }
  const cols = label('date · narration · debit · credit', { size: 36, height: 0.24, color: C.soft })
  cols.position.set(1.95, 1.45, 0)
  g.add(cell, cols)

  return {
    g,
    update(time) {
      const period = 2.2
      const cycle = time / period
      sheets.forEach((s, i) => {
        const p = (cycle + i / sheets.length) % 1
        const x = -4.4 + p * 3.3
        const into = Math.max(0, (x + 1.5) / 0.4)
        s.position.set(Math.min(x, -1.1), Math.sin(p * Math.PI) * 0.15, 0)
        s.rotation.y = 0.5 * (1 - p)
        s.scale.set(1, Math.max(0, 1 - into), 1)
        s.visible = into < 1
      })
      const sweep = Math.sin(time * 5) * 0.95
      beam.position.y = sweep
      // the table fills one row per sheet, then clears
      const filled = Math.floor(cycle * sheets.length) % (ROWS + 2)
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) cell.setColorAt(r * COLS + c, r === 0 ? head : r <= filled ? on : off)
      cell.instanceColor!.needsUpdate = true
    },
  }
}

/**
 * 2 · Agent Workbench + Flexi-MCP: someone with no code snaps an agent together and deploys it; the agent
 * then calls real company tools through a guarded doorway.
 */
function agent(): Scene {
  const g = new THREE.Group()
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75, 2), toon(C.violet, { glow: 0.7 }))
  const shell = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.05, 1)), ink(C.violet, 0.5))
  const aiTag = label('AI agent', { size: 44, height: 0.3, bg: [`rgba(4,10,8,0.8)`, 'rgba(255,250,238,0.92)'] })
  aiTag.position.y = -1.3
  const shield = new THREE.Mesh(new THREE.IcosahedronGeometry(2.1, 2), flat(C.cyan, 0.08, { additiveAtNight: true }))
  const shieldWire = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(2.1, 2)), ink(C.cyan, 0.22))
  const mcpTag = label('Flexi-MCP · guardrails', { size: 38, height: 0.26, color: C.cyan })
  mcpTag.position.y = 2.45
  g.add(core, shell, aiTag, shield, shieldWire, mcpTag)

  // the no-code builder
  const builder = new THREE.Group()
  builder.position.set(-7.2, 0.3, 0)
  builder.scale.setScalar(1.3)
  const bTitle = label('no-code agent builder', { size: 36, height: 0.26, color: C.soft })
  bTitle.position.y = 1.85
  builder.add(bTitle)
  const blockDefs: [string, Pair][] = [
    ['When · new application', C.green],
    ['Think · ask the LLM', C.violet],
    ['Act · call Loans API', C.cyan],
  ]
  const blocks = blockDefs.map(([t, c], k) => {
    const b = new THREE.Group()
    b.add(box(2.4, 0.5, 0.18, toon(c, { glow: 0.3 })))
    const tl = label(t, { size: 36, height: 0.25, color: ['#04100a', '#fffaf0'], weight: 700 })
    tl.position.z = 0.12
    b.add(tl)
    builder.add(b)
    return { b, y: 1.2 - k * 0.62 }
  })
  const deploy = label('deploy ✓', { size: 36, height: 0.24, color: C.green, bg: ['rgba(4,10,8,0.82)', 'rgba(255,250,238,0.94)'], weight: 700 })
  deploy.position.y = -0.75
  builder.add(deploy)
  const wireMat = ink(C.violet, 0.2)
  const wire = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-5.6, 0.2, 0), new THREE.Vector3(-1.1, 0, 0)]), wireMat)
  g.add(builder, wire)

  const names = ['Loans API', 'CRM', 'Documents', 'Reports', 'Payments', 'Database']
  const toolMat = toon(C.body, { glow: 0.2 })
  const tools = names.map((n, i) => {
    const a = (i / names.length) * TAU + Math.PI / 6
    const p = new THREE.Vector3(Math.cos(a) * 4.2, Math.sin(a) * 2.5, 0)
    const t = box(1.3, 0.62, 0.3, toolMat)
    t.position.copy(p)
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.3, 0.62, 0.3)), ink(C.green, 0.8))
    t.add(edge)
    const tag = label(n, { size: 38, height: 0.24 })
    tag.position.z = 0.2
    t.add(tag)
    g.add(t)
    return { t, p, hit: 0 }
  })
  // three calls in flight at once: out to a tool, and back with the answer
  const packetMat = flat(C.white)
  const calls = Array.from({ length: 3 }, (_, k) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), packetMat)
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), ink(C.violet, 0.6))
    g.add(m, line)
    return { m, line, tool: (k * 2) % names.length, phase: k / 3 }
  })
  return {
    g,
    update(time, dt) {
      core.rotation.set(time * 0.4, time * 0.5, 0)
      shell.rotation.set(-time * 0.3, time * 0.2, 0)
      shieldWire.rotation.y = shield.rotation.y = time * 0.08
      core.scale.setScalar(1 + Math.sin(time * 3) * 0.04)
      for (const c of calls) {
        const raw = time * 0.45 + c.phase
        const p = raw % 1
        const idx = Math.floor(raw)
        c.tool = (idx * 5 + Math.round(c.phase * 3) * 2) % tools.length
        const tool = tools[c.tool]
        const f = p < 0.5 ? p * 2 : 2 - p * 2
        c.m.position.copy(tool.p).multiplyScalar(f)
        if (p > 0.46 && p < 0.54) tool.hit = 1
        const pos = c.line.geometry.attributes.position as THREE.BufferAttribute
        pos.setXYZ(1, tool.p.x, tool.p.y, tool.p.z)
        pos.needsUpdate = true
      }
      for (const t of tools) {
        t.hit = Math.max(0, t.hit - dt * 2)
        t.t.scale.setScalar(1 + t.hit * 0.18)
      }
      // blocks snap in one by one, then the agent deploys
      const p = (time % 7) / 7
      blocks.forEach((bk, k) => {
        const q = Math.min(1, Math.max(0, (p - 0.05 - k * 0.16) / 0.12))
        const e = 1 - Math.pow(1 - q, 3)
        bk.b.position.set(-1.4 * (1 - e), bk.y + 1.2 * (1 - e), 0)
        bk.b.scale.setScalar(Math.max(0.001, e))
      })
      const live = p > 0.6
      deploy.visible = live
      pulse(deploy, live ? 1 + Math.max(0, 0.68 - p) * 2 : 1)
      wireMat.opacity = live ? 0.75 : 0.15
    },
  }
}

/** 3 · Flexy: a voice agent that greets customers in their language and fills the application as they talk. */
function voice(): Scene {
  const g = new THREE.Group()
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.8, 48, 48), toon(C.cyan, { glow: 0.8 }))
  g.add(orb)
  const rings = [1.2, 1.55, 1.9].map((r, i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.03, 8, 120), flat(i % 2 ? C.green : C.cyan, 0.8, { additiveAtNight: true }))
    g.add(m)
    return m
  })
  // the "under 5 minutes" timer: an arc that fills
  const arcU = { uProg: { value: 0 }, uC: { value: new THREE.Color() } }
  themed((t) => arcU.uC.value.set(t === 'dark' ? '#39d353' : '#c8553d'))
  const arcMat = new THREE.ShaderMaterial({
    uniforms: arcU,
    transparent: true,
    depthWrite: false,
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader:
      'uniform float uProg; uniform vec3 uC; varying vec2 vP; void main(){ float a = fract(atan(-vP.x, vP.y) / 6.28318); if (a > uProg) discard; gl_FragColor = vec4(uC, 0.9); }',
  })
  const arc = new THREE.Mesh(new THREE.RingGeometry(2.35, 2.47, 160), arcMat)
  const arcBg = new THREE.Mesh(new THREE.RingGeometry(2.35, 2.47, 160), flat(C.soft, 0.18))
  const timer = label('0:00', { size: 44, height: 0.3, color: C.soft })
  timer.position.set(0, -2.85, 0)
  g.add(arcBg, arc, timer)

  const words = ['नमस्ते', 'Hello', 'नमस्कार', 'வணக்கம்', 'ನಮಸ್ಕಾರ', 'হ্যালো', 'నమస్తే', 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ']
  const bubbles = words.map((w, i) => {
    const s = label(w, { size: 48, height: 0.38, font: 'body', weight: 700, bg: [`rgba(4,14,12,0.85)`, 'rgba(255,250,238,0.95)'], color: i % 2 ? C.cyan : C.green })
    g.add(s)
    return { s, phase: i / words.length, a: -1.2 + (i % 4) * 0.8 }
  })
  // the application, filled in by voice
  const fields = ['Name', 'Business', 'PAN', 'Bank account', 'Loan amount']
  const checks = fields.map((f, i) => {
    const s = label(`○ ${f}`, { size: 38, height: 0.26, color: C.soft })
    s.position.set(2.85, 1.25 - i * 0.42, 0)
    s.center.set(0, 0.5)
    g.add(s)
    return { s, f, done: false }
  })
  const lead = label('high intent → sales CRM', { size: 34, height: 0.23, color: C.gold, bg: ['rgba(4,10,8,0.82)', 'rgba(255,250,238,0.94)'], weight: 700 })
  lead.position.set(2.85, -1.0, 0)
  lead.center.set(0, 0.5)
  g.add(lead)
  const form = label('loan application', { size: 34, height: 0.22, color: C.soft })
  form.position.set(2.85, 1.75, 0)
  form.center.set(0, 0.5)
  g.add(form)
  let lastSec = -1
  return {
    g,
    update(time) {
      const talk = Math.abs(Math.sin(time * 7) * Math.sin(time * 2.3)) * (Math.sin(time * 0.8) > -0.3 ? 1 : 0.2)
      orb.scale.setScalar(1 + talk * 0.12)
      rings.forEach((r, i) => r.scale.setScalar(1 + talk * (0.08 + i * 0.05) + Math.sin(time * 2 - i) * 0.02))
      const cycle = 10
      const p = (time % cycle) / cycle
      arcU.uProg.value = Math.min(1, p * 1.1)
      const secs = Math.floor(Math.min(1, p * 1.1) * 270) // done in 4:30
      if (secs !== lastSec) {
        lastSec = secs
        relabel(timer, `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')} min`)
      }
      lead.visible = p > 0.8
      checks.forEach((c, i) => {
        const done = p > 0.12 + i * 0.16
        if (done !== c.done) {
          c.done = done
          relabel(c.s, `${done ? '✓' : '○'} ${c.f}`)
        }
      })
      for (const b of bubbles) {
        const q = (time * 0.12 + b.phase) % 1
        const ang = b.a
        b.s.position.set(Math.sin(ang) * (1.2 + q * 1.6) - 0.6, 0.6 + q * 2.4, Math.cos(ang) * 0.6)
        b.s.material.opacity = Math.sin(q * Math.PI)
      }
    },
  }
}

/** 5 · Credit score engine: instant scores; most requests are answered by the caches, few reach the bureau. */
function credit(): Scene {
  const g = new THREE.Group()
  const gauge = new THREE.Group()
  gauge.position.x = -1.6
  const SEG = 14
  const start = Math.PI * 1.15
  const span = Math.PI * 1.3
  const segCols: Pair[] = Array.from({ length: SEG }, (_, i) => {
    const t = i / (SEG - 1)
    const c = new THREE.Color('#ff5a4a').lerp(new THREE.Color('#ffc01e'), Math.min(1, t * 2)).lerp(new THREE.Color('#39d353'), Math.max(0, t * 2 - 1))
    const d = new THREE.Color('#d0583f').lerp(new THREE.Color('#e0a43a'), Math.min(1, t * 2)).lerp(new THREE.Color('#5c9a3f'), Math.max(0, t * 2 - 1))
    return ['#' + c.getHexString(), '#' + d.getHexString()]
  })
  for (let i = 0; i < SEG; i++) {
    const th = start - (i / SEG) * span
    const m = new THREE.Mesh(new THREE.RingGeometry(1.7, 2.25, 8, 1, th - span / SEG + 0.02, span / SEG - 0.04), toon(segCols[i], { glow: 0.5, side: THREE.DoubleSide }))
    gauge.add(m)
  }
  const needle = new THREE.Group()
  const stick = box(0.08, 1.75, 0.06, toon(C.ink, { glow: 0.3 }))
  stick.position.y = 0.85
  needle.add(stick)
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 32), toon(C.ink, { glow: 0.3 }))
  hub.rotation.x = Math.PI / 2
  gauge.add(needle, hub)
  const score = label('742', { size: 90, height: 0.75, font: 'display', weight: 800, color: C.green })
  score.position.y = -0.85
  const lo = label('300', { size: 34, height: 0.22, color: C.soft })
  lo.position.set(-2.2, -1.05, 0)
  const hi = label('900', { size: 34, height: 0.22, color: C.soft })
  hi.position.set(2.2, -1.05, 0)
  const ms = label('< 1 s', { size: 36, height: 0.24, color: C.cyan })
  ms.position.set(0, -1.55, 0)
  gauge.add(score, lo, hi, ms)
  g.add(gauge)

  // the cache tiers on the right
  const tiers = [
    { y: 1.3, name: 'L1 · in-memory', c: C.green },
    { y: 0.1, name: 'L2 · Redis', c: C.red },
    { y: -1.1, name: 'credit bureau', c: C.gold },
  ].map((t) => {
    const disk = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.08, 40), toon(t.c, { glow: 0.35, opacity: 0.85 }))
    disk.position.set(3.4, t.y, 0)
    const tag = label(t.name, { size: 34, height: 0.22, color: C.soft })
    tag.position.set(3.4, t.y - 0.32, 0.9)
    g.add(disk, tag)
    return { ...t, disk }
  })
  const reqMat = flat(C.white)
  const reqs = Array.from({ length: 10 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), reqMat)
    g.add(m)
    // where this request is answered: mostly L1, some L2, rarely the bureau
    const depth = i % 10 === 0 ? 2 : i % 3 === 0 ? 1 : 0
    return { m, depth, phase: i / 10, x: 3.4 + (Math.random() - 0.5) * 1.2, z: (Math.random() - 0.5) * 1.0 }
  })
  let target = 742
  let current = 300
  let shown = -1
  let next = 0
  return {
    g,
    update(time, dt) {
      if (time > next) {
        next = time + 4.5
        target = 705 + Math.round(Math.random() * 110)
        current = 300
      }
      current += (target - current) * damp(2.2, dt)
      const v = Math.round(current)
      if (v !== shown) {
        shown = v
        relabel(score, String(v))
      }
      needle.rotation.z = start - Math.PI / 2 - ((current - 300) / 600) * span
      for (const r of reqs) {
        const p = (time * 0.5 + r.phase) % 1
        const floor = tiers[r.depth].y + 0.1
        const top = 2.6
        const down = p < 0.5
        const f = down ? p * 2 : (1 - p) * 2
        r.m.position.set(r.x, top + (floor - top) * f, r.z)
      }
      for (const t of tiers) t.disk.rotation.y = time * 0.3
    },
  }
}

export type FlexiPiece = Piece & {
  /** a point in scene `i`'s own coordinates, in world space */
  focus(i: number, local: THREE.Vector3): THREE.Vector3
  outward(i: number): THREE.Vector3
}

export function createFlexi(center: THREE.Vector3, names: string[], sceneStops: string[][]): FlexiPiece {
  const group = new THREE.Group()
  group.position.copy(center)
  const makers = [cjp, agent, voice, parser, credit]
  const outs: THREE.Vector3[] = []
  const spots: THREE.Vector3[] = []
  const scenes = makers.map((make, i) => {
    const s = make()
    // the first scene stands front-left; the rest follow round the ring
    const a = Math.PI + 0.63 + (i / makers.length) * TAU
    const out = new THREE.Vector3(Math.sin(a), 0, -Math.cos(a))
    const spot = out.clone().multiplyScalar(R)
    spots.push(spot)
    outs.push(out)
    s.g.position.copy(spot)
    // the agent and the voice orb hover a little higher, clear of the grass
    s.g.position.y = i === 1 || i === 2 ? 1.2 : 0
    s.g.rotation.y = Math.atan2(out.x, out.z)
    group.add(s.g)
    // its name, big, on the ground just in front of it (toward the overview camera), so it sits below
    // the model on screen — readable from the overview, gone in the close-up
    const name = label(names[i], { size: 64, height: 1.9, font: 'display', weight: 700, color: C.ink, bg: ['rgba(4,10,8,0.82)', 'rgba(255,250,238,0.94)'] })
    name.position.set(spot.x * 0.92, -0.6, spot.z + 7.5)
    group.add(name)
    return { ...s, focus: 0, name, yaw: s.g.rotation.y }
  })

  // the hub: the FlexiLoans logo — the FL mark in its ring, the wordmark beneath — on a round dais,
  // with live lines out to every system
  const brand: Pair = [FL_BLUE, '#1f93cc']
  // the FL mark lies face-up inside the dais circle; the FLEXI LOANS wordmark lies outside it, in front
  const DAIS = 4.2
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(DAIS, DAIS + 0.3, 0.5, 72), toon(C.body, { glow: 0.2 }))
  hub.position.y = -1.4
  const hubEdge = new THREE.Mesh(new THREE.TorusGeometry(DAIS, 0.06, 8, 160), flat(brand, 0.9, { additiveAtNight: true }))
  hubEdge.rotation.x = Math.PI / 2
  hubEdge.position.y = -1.14
  const logoMat = toon(brand, { glow: 0.65, side: THREE.DoubleSide, opacity: 1 })
  const logo = new THREE.Group()
  logo.position.y = -1.12
  const mark = new THREE.Mesh(extrudeSvg(FL_MARK, 6.6, 0.5), logoMat)
  mark.rotation.x = -Math.PI / 2
  const word = new THREE.Mesh(extrudeSvg(FL_WORD, 11, 0.4), logoMat)
  word.rotation.x = -Math.PI / 2
  word.position.set(0, 0.2, DAIS + 2.2)
  logo.add(mark, word)
  group.add(hub, hubEdge, logo)
  const camLocal = new THREE.Vector3()

  // the ground they stand on — night: a dark disc ringed with light; day: a meadow on a floating island
  const ground = new THREE.Group()
  ground.position.y = -1.5
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(R + 5.5, R + 5, 0.5, 72), toon(['#05080d', '#79a94a'], { glow: 0.02 }))
  disc.position.y = -0.25
  ground.add(disc)
  const neon = new THREE.Group()
  for (const r of [R - 6, R, R + 5]) {
    const m = new THREE.Mesh(new THREE.RingGeometry(r - 0.04, r + 0.04, 160), flat(C.green, 0.4, { side: THREE.DoubleSide }))
    m.rotation.x = -Math.PI / 2
    m.position.y = 0.02
    neon.add(m)
  }
  ground.add(neon)
  const isle = new THREE.Group()
  const soil = new THREE.Mesh(new THREE.ConeGeometry(R + 5.2, 13, 11), toon(['#2a1c14', '#9c6b43']))
  soil.rotation.x = Math.PI
  soil.position.y = -7
  const lip = new THREE.Mesh(new THREE.CylinderGeometry(R + 6, R + 5.6, 0.4, 72), toon(['#14301d', '#5c9a3f']))
  lip.position.y = -0.55
  isle.add(soil, lip)
  const leaf = toon(['#14301d', '#4c8a3a'])
  const bark = toon(['#2a1c14', '#7a5236'])
  // trees stand in the gaps between scenes, near the rim and closer to the hub
  const gaps = Array.from({ length: 5 }, (_, i) => Math.PI + 0.63 + ((i + 0.5) / 5) * TAU)
  const treeAngles = [...gaps, ...gaps.map((g) => g + 0.06), ...gaps.map((g) => g - 0.04)]
  treeAngles.forEach((a, k) => {
    const rr = k < 5 ? R + 3.5 : k < 10 ? R + 1 : R - 8
    const tree = new THREE.Group()
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.2, 8), bark)
    trunk.position.y = 0.6
    const c1 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95, 1), leaf)
    c1.position.y = 1.7
    const c2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 1), leaf)
    c2.position.set(0.5, 1.3, 0.2)
    tree.add(trunk, c1, c2)
    tree.position.set(Math.sin(a) * rr, 0, -Math.cos(a) * rr)
    tree.scale.setScalar(0.8 + ((k * 37) % 10) / 20)
    isle.add(tree)
  })
  // grass tufts and a few flowers, so the meadow reads as a meadow
  const TUFTS = 700
  const tufts = new THREE.InstancedMesh(new THREE.ConeGeometry(0.07, 0.38, 4), toon(['#14301d', '#ffffff'], { glow: 0 }), TUFTS)
  const tuft = new THREE.Object3D()
  const greens = ['#5c9a3f', '#6aa84f', '#4c8a3a', '#86b85c', '#f4f1e4', '#f6c9d0'].map((c) => new THREE.Color(c))
  for (let k = 0; k < TUFTS; k++) {
    const a = Math.random() * TAU
    const rr = Math.sqrt(Math.random()) * (R + 5)
    tuft.position.set(Math.sin(a) * rr, 0.15, -Math.cos(a) * rr)
    tuft.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * TAU, (Math.random() - 0.5) * 0.4)
    tuft.scale.setScalar(0.7 + Math.random() * 0.8)
    tuft.updateMatrix()
    tufts.setMatrixAt(k, tuft.matrix)
    tufts.setColorAt(k, greens[k % 23 === 0 ? 4 + (k % 2) : k % 4])
  }
  isle.add(tufts)
  ground.add(isle)
  group.add(ground)
  themed((t) => {
    neon.visible = t === 'dark'
    isle.visible = t === 'light'
  })
  const packetMat = flat(C.green)
  blendFor(packetMat)
  const links = spots.map((o) => {
    const start = o.clone().multiplyScalar(DAIS / R).setY(-1.25)
    const end = o.clone().multiplyScalar((R - 6) / R).setY(-1.25)
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([start, end]), ink(C.green, 0.35))
    group.add(line)
    const packets = Array.from({ length: 3 }, () => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), packetMat)
      group.add(m)
      return m
    })
    return { start, end, packets }
  })

  return {
    group,
    center,
    radius: R + 7,
    focus: (i, local) => local.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), scenes[i].g.rotation.y).add(scenes[i].g.position).add(center),
    outward: (i) => outs[i].clone(),
    update(time, dt, ctx: FrameCtx) {
      // by day the island floats beside the hero as a green land on the horizon; at night it stays out
      // of the hero's glow and appears once the story moves on
      group.userData.hidden = getTheme() === 'dark' && ctx.story < ctx.storyOf('hello') + 0.3
      // beside the hero (by day) the island sits lower and further off, a green land on the horizon
      const hero = Math.max(0, 1 - (ctx.story - ctx.storyOf('hello')) / 0.8)
      group.position.set(center.x + hero * 6, center.y - hero * 5, center.z - hero * 6)
      for (let i = 0; i < scenes.length; i++) {
        const s = scenes[i]
        const near = sceneStops[i].some((id) => Math.abs(ctx.story - ctx.storyOf(id)) < 0.6) ? 1 : 0
        s.focus += (near - s.focus) * damp(4, dt)
        // only animate scenes that can be seen up close, or everything gently from the overview
        if (s.focus > 0.01 || Math.abs(ctx.story - ctx.storyOf('flx')) < 1.2) s.update(time, dt, s.focus)
      }
      links.forEach((l, i) =>
        l.packets.forEach((m, k) => {
          const f = (time * 0.35 + k / 3 + i * 0.13) % 1
          m.position.lerpVectors(l.start, l.end, f)
        }),
      )
      // every scene turns to face the camera, so none is ever seen from behind or edge-on;
      // the logo steps back while one system is in focus
      camLocal.copy(ctx.camera.position)
      group.worldToLocal(camLocal)
      // in the overview the systems stand larger, so they read from up here; normal size up close
      const overview = Math.max(0, 1 - Math.abs(ctx.story - ctx.storyOf('flx')))
      for (const sc of scenes) {
        sc.g.scale.setScalar(1 + overview * 0.55)
        const want = Math.atan2(camLocal.x - sc.g.position.x, camLocal.z - sc.g.position.z)
        let d = want - sc.yaw
        d = Math.atan2(Math.sin(d), Math.cos(d))
        sc.yaw += d * damp(3, dt)
        sc.g.rotation.y = sc.yaw
        // names belong to the system map only: hidden beside the hero and in the close-ups
        sc.name.material.opacity = overview
        sc.name.visible = overview > 0.02
      }
      const closeUp = Math.max(...scenes.map((sc) => sc.focus))
      logoMat.opacity = 1 - closeUp * 0.7
      logoMat.depthWrite = closeUp < 0.2
      hubEdge.scale.setScalar(1 + Math.sin(time * 1.2) * 0.012)
    },
  }
}
