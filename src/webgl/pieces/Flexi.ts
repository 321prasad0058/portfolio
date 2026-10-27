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

/** (not shown) · Statement parser: bank statements go through a scanner and come out as rows in a table. */
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

/**
 * 4 · Guarantor journey: the applicant shares a link (WhatsApp / SMS / email); the guarantor walks a
 * track of steps — OTP login, consent, Experian prefill, details — then three checks run side by side
 * (NSDL via IDfy, CIBIL, CKYC), followed by Aadhaar upload, Leegality e-sign and video KYC.
 */
function guarantor(): Scene {
  const g = new THREE.Group()
  const L = 18.6
  const track = box(L, 0.14, 1.3, toon(C.body))
  track.position.set(0, -1.25, 0)
  const rail = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(L, 0.14, 1.3)), ink(C.violet, 0.7))
  rail.position.copy(track.position)
  g.add(track, rail)
  const tagBg: Pair = ['rgba(4,10,8,0.82)', 'rgba(255,250,238,0.94)']

  // the applicant's phone, sending the invite
  const phone = new THREE.Group()
  phone.position.set(-9.9, -0.2, 0)
  phone.add(box(0.9, 1.7, 0.1, toon(C.body, { glow: 0.1 })))
  const screen = box(0.76, 1.42, 0.02, flat(['#123a2a', '#dfeedd']))
  screen.position.z = 0.06
  phone.add(screen)
  const phoneTag = label('applicant shares link', { size: 30, height: 0.25, color: C.soft })
  phoneTag.position.set(0, -1.15, 0)
  phone.add(phoneTag)
  g.add(phone)
  const channels = (['WhatsApp', 'SMS', 'Email'] as const).map((t, i) => {
    const s = label(t, { size: 32, height: 0.28, color: [C.green, C.cyan, C.gold][i], bg: tagBg, weight: 700 })
    g.add(s)
    return { s, phase: i / 3 }
  })

  const steps: { name: string; vendor?: string; x: number; mat: 'v' | 'g' }[] = [
    { name: 'Open link', x: -7.4, mat: 'v' },
    { name: 'OTP login', x: -5.65, mat: 'v' },
    { name: 'Consent', x: -3.9, mat: 'v' },
    { name: 'PAN prefill', vendor: 'Experian', x: -2.15, mat: 'v' },
    { name: 'Details', x: -0.4, mat: 'v' },
    { name: 'Aadhaar', vendor: 'CKYC OTP', x: 3.8, mat: 'v' },
    { name: 'e-Sign', vendor: 'Leegality', x: 5.55, mat: 'g' },
    { name: 'Video KYC', vendor: 'VCIP', x: 7.3, mat: 'g' },
  ]
  const vMat = toon(C.violet, { glow: 0.4 })
  const gMat = toon(C.gold, { glow: 0.45 })
  const gates = steps.map((st) => {
    const mat = st.mat === 'v' ? vMat : gMat
    const arch = new THREE.Group()
    const l = box(0.12, 1.9, 0.12, mat)
    l.position.set(-0.55, -0.25, 0)
    const r = l.clone()
    r.position.x = 0.55
    const top = box(1.25, 0.14, 0.14, mat)
    top.position.y = 0.72
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 16), flat(C.white))
    lamp.position.y = 0.95
    const tag = label(st.name, { size: 40, height: 0.36, bg: tagBg })
    tag.position.y = 1.36
    arch.add(l, r, top, lamp, tag)
    arch.position.x = st.x
    g.add(arch)
    let vtag: THREE.Sprite | null = null
    if (st.vendor) {
      vtag = label(st.vendor, { size: 34, height: 0.3, color: st.mat === 'v' ? C.violet : C.gold, bg: tagBg, weight: 600 })
      vtag.position.set(st.x, 1.95, -0.15)
      g.add(vtag)
    }
    return { lamp, x: st.x, flash: 0, vtag }
  })

  // three checks run side by side: the journey fans out, then merges
  const PX = 1.7
  const lanes = [
    { name: 'NSDL · IDfy', what: 'PAN verify', y: 1.55, c: C.green },
    { name: 'CIBIL', what: 'bureau pull', y: 0.55, c: C.cyan },
    { name: 'CKYC', what: 'KYC record', y: -0.45, c: C.gold },
  ].map((ln) => {
    const chip = box(1.4, 0.5, 0.18, toon(ln.c, { glow: 0.35 }))
    chip.position.set(PX, ln.y, 0)
    const t = label(ln.name, { size: 34, height: 0.27, color: ['#04100a', '#fffaf0'], weight: 700 })
    t.position.set(PX, ln.y, 0.12)
    const w = label(ln.what, { size: 28, height: 0.2, color: C.soft })
    w.position.set(PX, ln.y - 0.42, 0.05)
    const fan = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(new THREE.CatmullRomCurve3([new THREE.Vector3(PX - 1.15, -0.55, 0), new THREE.Vector3(PX - 0.8, ln.y, 0), new THREE.Vector3(PX + 0.8, ln.y, 0), new THREE.Vector3(PX + 1.15, -0.55, 0)]).getPoints(40)),
      ink(ln.c, 0.5),
    )
    g.add(chip, t, w, fan)
    const pk = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), flat(ln.c))
    g.add(pk)
    return { ...ln, chip, pk, hit: 0 }
  })
  const par = label('in parallel', { size: 30, height: 0.24, color: C.soft })
  par.position.set(PX, 2.25, 0)
  g.add(par)

  // the guarantor: a little figure walking the track, who turns gold once everything is signed
  const walker = new THREE.Group()
  const wMat = toon(C.violet, { glow: 0.5 })
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.3, 6, 12), wMat)
  body.position.y = 0.1
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), wMat)
  head.position.y = 0.5
  walker.add(body, head)
  g.add(walker)
  const done = new THREE.Group()
  const doneDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 32), toon(C.gold, { glow: 0.5 }))
  doneDisc.rotation.x = Math.PI / 2
  const tick = label('✓', { size: 70, height: 0.42, color: ['#3a2200', '#5a3a10'], font: 'body', weight: 800 })
  tick.position.z = 0.06
  done.add(doneDisc, tick)
  done.position.set(8.75, -0.4, 0)
  const doneTag = label('ready to disburse', { size: 30, height: 0.25, color: C.gold })
  doneTag.position.set(8.75, -1.0, 0.3)
  g.add(done, doneTag)
  const goldC = new THREE.Color()
  const violetC = new THREE.Color()
  themed((t) => {
    goldC.set(C.gold[t === 'dark' ? 0 : 1])
    violetC.set(C.violet[t === 'dark' ? 0 : 1])
  })

  return {
    g,
    update(time, dt) {
      const cycle = 11
      const p = (time % cycle) / cycle
      for (const ch of channels) {
        const q = (time * 0.35 + ch.phase) % 1
        ch.s.position.set(-9.9 + q * 1.4, 0.7 + q * 1.4, 0.2)
        ch.s.material.opacity = Math.sin(q * Math.PI)
      }
      // walk the track, pausing in the parallel block while the three checks run
      const x = p < 0.48 ? -8.4 + (p / 0.48) * (PX + 8.4) : p < 0.62 ? PX : PX + ((p - 0.62) / 0.38) * (8.75 - PX)
      walker.position.set(x, -0.95 + Math.abs(Math.sin(time * 7)) * 0.05, 0)
      walker.rotation.y = Math.sin(time * 3) * 0.2
      wMat.color.copy(x > 8.2 ? goldC : violetC)
      for (const gt of gates) {
        if (Math.abs(x - gt.x) < 0.12) gt.flash = 1
        gt.flash = Math.max(0, gt.flash - dt * 1.2)
        gt.lamp.scale.setScalar(1 + gt.flash * 0.9)
        if (gt.vtag) pulse(gt.vtag, 1 + gt.flash * 0.12)
      }
      const inPar = p >= 0.48 && p < 0.62
      const pp = inPar ? (p - 0.48) / 0.14 : 0
      for (const ln of lanes) {
        // all three packets travel together: out along their lane, across, and back
        const t = inPar ? pp : 0
        ln.pk.visible = inPar
        const pts = [PX - 1.15, PX + 1.15]
        ln.pk.position.set(pts[0] + t * (pts[1] - pts[0]), -0.55 + Math.sin(t * Math.PI) * (ln.y + 0.55), 0.15)
        if (inPar && Math.abs(t - 0.5) < 0.06) ln.hit = 1
        ln.hit = Math.max(0, ln.hit - dt * 1.5)
        ln.chip.scale.setScalar(1 + ln.hit * 0.12)
      }
      done.rotation.y = time * 1.5
      done.scale.setScalar(x > 8.5 ? 1.15 : 0.85)
    },
  }
}

/**
 * 5 · Credit score: a free public page. Name + mobile, an OTP, then a bureau "prefill" pulls the report
 * by mobile alone; 16 metrics are graded into "doing right / could be better / hurting".
 */
function credit(): Scene {
  const g = new THREE.Group()
  const gauge = new THREE.Group()
  gauge.position.x = -2.3
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
  const score = label('···', { size: 90, height: 0.75, font: 'display', weight: 800, color: C.green })
  score.position.y = -0.85
  const lo = label('300', { size: 34, height: 0.22, color: C.soft })
  lo.position.set(-2.2, -1.05, 0)
  const hi = label('900', { size: 34, height: 0.22, color: C.soft })
  hi.position.set(2.2, -1.05, 0)
  const soft = label('soft check · no score impact', { size: 30, height: 0.19, color: C.cyan })
  soft.position.set(0, -1.55, 0)
  gauge.add(score, lo, hi, soft)
  g.add(gauge)

  // the three steps a visitor goes through, lighting up in turn
  const tagBg: Pair = ['rgba(4,10,8,0.82)', 'rgba(255,250,238,0.94)']
  const stepsUi = [
    { t: '1  name + mobile', y: 2.1 },
    { t: '2  OTP verify', y: 1.45 },
    { t: '3  bureau prefill', y: 0.8 },
  ].map((s) => {
    const chip = label(s.t, { size: 34, height: 0.32, color: C.soft, bg: tagBg, weight: 600 })
    chip.position.set(2.3, s.y, 0)
    chip.center.set(0, 0.5)
    g.add(chip)
    return { chip, text: s.t, on: false }
  })
  // the report: 16 metrics graded into three health groups
  const groups = [
    { name: 'doing right', c: C.green, y: -0.15 },
    { name: 'could be better', c: C.gold, y: -0.75 },
    { name: 'hurting', c: C.red, y: -1.35 },
  ].map((gr) => {
    const card = box(2.8, 0.48, 0.12, toon(gr.c, { glow: 0.3 }))
    card.position.set(3.85, gr.y, 0)
    const t = label(gr.name, { size: 32, height: 0.28, color: ['#04100a', '#fffaf0'], weight: 700 })
    t.position.set(3.85, gr.y, 0.1)
    g.add(card, t)
    return { card, t }
  })
  const metricsTag = label('16 metrics from the report', { size: 28, height: 0.24, color: C.soft })
  metricsTag.position.set(3.85, -1.85, 0.05)
  g.add(metricsTag)

  let target = 742
  let current = 300
  let shown = ''
  let cycleStart = -1
  return {
    g,
    update(time, dt) {
      const cycle = 7
      const k = Math.floor(time / cycle)
      if (k !== cycleStart) {
        cycleStart = k
        target = 690 + Math.round(Math.random() * 130)
        current = 300
      }
      const p = (time % cycle) / cycle
      // steps light one by one; the score only appears after the prefill
      stepsUi.forEach((s, i) => {
        const on = p > 0.08 + i * 0.12
        if (on !== s.on) {
          s.on = on
          relabel(s.chip, on ? `${s.text}  ✓` : s.text)
        }
        pulse(s.chip, on && p < 0.12 + i * 0.12 ? 1.08 : 1)
      })
      const reveal = p > 0.45
      if (reveal) current += (target - current) * damp(2.4, dt)
      const v = reveal ? String(Math.round(current)) : '···'
      if (v !== shown) {
        shown = v
        relabel(score, v)
      }
      needle.rotation.z = start - Math.PI / 2 - ((current - 300) / 600) * span
      groups.forEach((gr, i) => {
        const show = Math.max(0, Math.min(1, (p - 0.62 - i * 0.07) / 0.1))
        gr.card.scale.set(Math.max(0.001, show), 1, 1)
        gr.t.material.opacity = show
      })
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
  // the bank-statement parser scene is kept below but left out of the ring for now
  const makers = [cjp, agent, voice, guarantor, credit]
  void parser // the statement-parser scene stays in the code, unused, until it returns
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
        // the long guarantor track grows less, so it stays inside the ring
        sc.g.scale.setScalar(1 + overview * (sc === scenes[3] ? 0.12 : 0.55))
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
