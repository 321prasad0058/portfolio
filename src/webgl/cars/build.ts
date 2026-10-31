// Builds a car from a CarSpec traced from real photographs: a lofted body and glasshouse with raked
// pillars, cladding with its own traced top line, and "decals" — lamp, grille, skid-plate and trim outlines
// traced from front/rear/side photos and projected onto the curved body. Static parts are merged by material.
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { curve, loft, ring, ringZ, stationsU, type Pts, type Tag } from './loft'

export type Mat = 'gloss' | 'trim' | 'chrome' | 'silver' | 'drl' | 'head' | 'tail' | 'amber' | 'mesh' | 'hex' | 'slats' | 'body' | 'glass'
/** An outline traced from a photo. Front/rear: [z, y] in metres (z across the car, + = right); side: [u, y]. */
export interface Decal {
  mat: Mat
  poly: [number, number][]
  /** also place a mirror image on the other side */
  mirror?: boolean
  /** stacking: decals drawn on top of others sit a little further out */
  layer?: number
}
export type WheelStyle = 'turbine' | 'twin' | 'aero' | 'multi' | 'blade'

export interface CarSpec {
  id: string
  name: string
  L: number
  W: number
  H: number
  /** u (0 = tail … 1 = nose) of the rear and front axles, measured from a side photo */
  axles: [number, number]
  tyreR: number
  tyreW: number
  rim: number
  wheel: { style: WheelStyle; spokes: number }
  /** gap between tyre and arch opening, and how square the arch is (0 round … 1 square) */
  archGap: number
  archSquare: number
  sill: Pts
  top: Pts
  width: Pts
  crown?: number
  bulge?: number
  shoulder?: { y: Pts; inset: number }
  /** how far the corners of the nose / tail sweep back from the centre line (plan view), metres */
  noseSweep?: number
  tailSweep?: number
  greenhouse: { u0: number; u1: number; top: Pts; tumble: number }
  roof: { u0: number; u1: number; black: boolean }
  /** glass that wraps up into the roof edge */
  alpine?: [number, number]
  /** raked pillars: u range at the beltline and at the roof */
  pillars: { bottom: [number, number]; top: [number, number]; black: boolean }[]
  /** black plastic over the lower body: its traced top line, and how far the arch flares reach */
  cladding?: { top: Pts; flare: number }
  /** door shut lines: u at the sill and at the beltline */
  doors: [number, number][]
  front: Decal[]
  rear: Decal[]
  side?: Decal[]
  plates: { front: number; rear: number }
  rails?: 'silver' | 'black'
  spoiler?: boolean
  sunroof?: [number, number]
  mirrors: 'black' | 'body'
  windowChrome?: boolean
  paint: string
  ev?: boolean
  plate: string
}

export interface CarRig {
  group: THREE.Group
  paint: THREE.MeshPhysicalMaterial
  spec: CarSpec
  setLights(v: number): void
  spin(dx: number): void
  dispose(): void
}

export interface BuildOptions {
  detail: 'high' | 'low'
  /** generic body-style mode: keep the shape, drop the reference car's lamp and grille signature */
  generic?: boolean
  paint?: string
  size?: { length?: number | null; width?: number | null; height?: number | null }
}

// ── shared resources, built once

let shared: ReturnType<typeof makeShared> | null = null
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat = false) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d')!)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}
function makeShared() {
  const glow = canvasTex(64, 64, (g) => {
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.25, 'rgba(255,255,255,0.45)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 64, 64)
  })
  const shadow = canvasTex(128, 128, (g) => {
    const grad = g.createRadialGradient(64, 64, 8, 64, 64, 64)
    grad.addColorStop(0, 'rgba(0,0,0,0.85)')
    grad.addColorStop(0.6, 'rgba(0,0,0,0.45)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 128, 128)
  })
  const pattern = (kind: 'mesh' | 'hex' | 'slats') =>
    canvasTex(
      128,
      128,
      (x) => {
        x.fillStyle = '#07090b'
        x.fillRect(0, 0, 128, 128)
        if (kind === 'slats') {
          x.fillStyle = '#22282d'
          for (let i = 6; i < 128; i += 21) x.fillRect(i, 0, 9, 128)
          return
        }
        x.strokeStyle = kind === 'hex' ? '#c9d1d8' : '#2c3238'
        x.lineWidth = kind === 'hex' ? 5 : 2.5
        const r = kind === 'hex' ? 15 : 8
        for (let row = -1; row < 12; row++)
          for (let col = -1; col < 12; col++) {
            const cx = col * r * 1.75 + (row % 2) * r * 0.87
            const cy = row * r * 1.5
            x.beginPath()
            for (let k = 0; k < 6; k++) {
              const a = (Math.PI / 3) * k + Math.PI / 6
              x.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
            }
            x.closePath()
            x.stroke()
          }
      },
      true,
    )
  return {
    glow,
    shadow,
    mesh: pattern('mesh'),
    hex: pattern('hex'),
    slats: pattern('slats'),
    glass: new THREE.MeshStandardMaterial({ color: '#020406', metalness: 0.2, roughness: 0.06, envMapIntensity: 0.045 }),
    trim: new THREE.MeshStandardMaterial({ color: '#111315', metalness: 0.1, roughness: 0.72, side: THREE.DoubleSide }),
    gloss: new THREE.MeshPhysicalMaterial({ color: '#050607', metalness: 0.5, roughness: 0.12, clearcoat: 1, side: THREE.DoubleSide }),
    chrome: new THREE.MeshStandardMaterial({ color: '#e4eaef', metalness: 1, roughness: 0.14, side: THREE.DoubleSide }),
    silver: new THREE.MeshStandardMaterial({ color: '#b3bbc2', metalness: 0.85, roughness: 0.3, side: THREE.DoubleSide }),
    tyre: new THREE.MeshStandardMaterial({ color: '#111214', roughness: 0.88 }),
    rimDark: new THREE.MeshStandardMaterial({ color: '#3a4147', metalness: 0.75, roughness: 0.32 }),
    rimFace: new THREE.MeshStandardMaterial({ color: '#d7dee4', metalness: 1, roughness: 0.2 }),
    brake: new THREE.MeshStandardMaterial({ color: '#44484c', metalness: 0.8, roughness: 0.5 }),
    well: new THREE.MeshBasicMaterial({ color: '#020203' }),
  }
}

const plateCache = new Map<string, THREE.CanvasTexture>()
function plateTexture(text: string, ev: boolean) {
  const key = `${text}|${ev}`
  if (plateCache.has(key)) return plateCache.get(key)!
  const t = canvasTex(512, 120, (x) => {
    x.fillStyle = ev ? '#0f7a3a' : '#f4f4f0' // India: green plates for electric cars
    x.fillRect(0, 0, 512, 120)
    x.strokeStyle = ev ? '#e9f5ee' : '#111'
    x.lineWidth = 6
    x.strokeRect(5, 5, 502, 110)
    x.fillStyle = '#1d4ea0'
    x.fillRect(14, 16, 34, 88)
    x.fillStyle = '#fff'
    x.font = 'bold 18px sans-serif'
    x.fillText('IND', 15, 98)
    x.fillStyle = ev ? '#ffffff' : '#111'
    x.font = 'bold 74px "Arial Narrow", Arial, sans-serif'
    x.textAlign = 'center'
    x.textBaseline = 'middle'
    x.fillText(text, 278, 64)
  })
  t.anisotropy = 4
  plateCache.set(key, t)
  return t
}

// ── polygon helpers

function inside(p: [number, number], poly: [number, number][]) {
  let c = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}
function nearestOnPoly(p: [number, number], poly: [number, number][]): [number, number] {
  let best: [number, number] = poly[0]
  let bd = Infinity
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length]
    const dx = b[0] - a[0], dy = b[1] - a[1]
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)))
    const q: [number, number] = [a[0] + t * dx, a[1] + t * dy]
    const d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2
    if (d < bd) { bd = d; best = q }
  }
  return best
}

// ── the builder

export function buildCar(spec: CarSpec, opt: BuildOptions): CarRig {
  const S = (shared ??= makeShared())
  const hi = opt.detail === 'high'
  const { L, W } = spec
  const sill = curve(spec.sill), top = curve(spec.top), width = curve(spec.width), ghTop = curve(spec.greenhouse.top)
  const shoulderY = spec.shoulder ? curve(spec.shoulder.y) : null
  const cladTop = spec.cladding ? curve(spec.cladding.top) : null
  const xOf = (u: number) => (u - 0.5) * L
  const uOf = (x: number) => x / L + 0.5
  const axles = [xOf(spec.axles[1]), xOf(spec.axles[0])]
  const archR = spec.tyreR + spec.archGap
  const archY = spec.tyreR

  const archLine = (x: number) => {
    let y = -1
    for (const ax of axles) {
      const t = (x - ax) / archR
      if (Math.abs(t) >= 1) continue
      const p = 2 + spec.archSquare * 2.2
      y = Math.max(y, archY + archR * Math.pow(1 - Math.pow(Math.abs(t), p), 1 / p))
    }
    return y
  }

  const paint = new THREE.MeshPhysicalMaterial({ color: opt.paint ?? spec.paint, metalness: 0.55, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 })
  const disposables: { dispose(): void }[] = [paint]
  const parts = new Map<THREE.Material, THREE.BufferGeometry[]>()
  const add = (mat: THREE.Material, g: THREE.BufferGeometry, m?: THREE.Matrix4) => {
    if (m) g.applyMatrix4(m)
    if (!parts.has(mat)) parts.set(mat, [])
    parts.get(mat)!.push(g)
  }
  const group = new THREE.Group()

  // ── lower body
  const nSt = hi ? 160 : 100
  const seg = hi ? 40 : 26
  const stations = stationsU(nSt).map((u) => {
    const x = xOf(u)
    const yb = Math.max(sill(u), archLine(x))
    const yt = top(u)
    const hw = (width(u) * W) / 2
    return {
      x,
      ring: ring(hw, yb, yt, 0.07, 0.17, seg, {
        bulge: spec.bulge ?? 0.025,
        crown: u > spec.greenhouse.u1 ? spec.crown ?? 0.025 : 0,
        shoulder: shoulderY ? shoulderY(u) : undefined,
        inset: spec.shoulder?.inset,
      }),
    }
  })
  const body = loft(stations, (_c, tag) => (tag === 'bottom' ? 1 : 0), 2)
  disposables.push(body.geometry)
  group.add(new THREE.Mesh(body.geometry, [paint, S.trim]))

  const rings = body.rings
  const bracket = (x: number) => {
    let lo = 0, hiI = rings.length - 1
    while (hiI - lo > 1) {
      const m = (lo + hiI) >> 1
      if (rings[m].x < x) lo = m
      else hiI = m
    }
    return [lo, hiI]
  }
  const zAt = (x: number, y: number) => {
    const [lo, hiI] = bracket(x)
    const a = rings[lo], b = rings[hiI]
    const t = Math.max(0, Math.min(1, (x - a.x) / (b.x - a.x || 1)))
    return ringZ(a.ring, y) * (1 - t) + ringZ(b.ring, y) * t
  }
  /** where the body surface is, seen from the nose (end 1) or tail (end -1), at lateral z and height y */
  const endPoint = (end: 1 | -1, z: number, y: number): THREE.Vector3 | null => {
    const az = Math.abs(z)
    const n = rings.length
    for (let k = 0; k < n; k++) {
      const i = end > 0 ? n - 1 - k : k
      // a front/rear outline may wrap round a corner, but never run back along the flank over a wheel
      if (Math.abs(rings[i].x - rings[end > 0 ? n - 1 : 0].x) > 0.3) return null
      const zi = ringZ(rings[i].ring, y)
      if (zi >= az) {
        if (k === 0) return new THREE.Vector3(rings[i].x, y, z)
        const j = end > 0 ? i + 1 : i - 1
        const zj = ringZ(rings[j].ring, y)
        const t = (zi - az) / (zi - zj || 1)
        return new THREE.Vector3(rings[i].x + t * (rings[j].x - rings[i].x), y, z)
      }
    }
    return null
  }
  let ghZRef: ((x: number, y: number) => number) | null = null
  const sidePoint = (u: number, y: number, side: 1 | -1) =>
    new THREE.Vector3(xOf(u), y, side * (ghZRef && y > top(u) - 0.01 ? ghZRef(xOf(u), y) : zAt(xOf(u), y)))

  // ── cladding: a thin black skin with its own traced top edge and flared arches
  if (spec.cladding && cladTop) {
    const flare = spec.cladding.flare
    const cTop = (x: number) => {
      let y = cladTop(uOf(x))
      for (const ax of axles) {
        const d = Math.abs(x - ax)
        const R = archR + flare
        if (d < R) y = Math.max(y, archY + Math.sqrt(R * R - d * d))
      }
      return y
    }
    const clad = loft(
      stations.map(({ x }, i) => {
        const u = uOf(x)
        const yb = Math.max(sill(u), archLine(x)) - 0.004
        const yt = Math.min(cTop(x), top(u) - 0.04)
        const xx = i === 0 ? x - 0.008 : i === stations.length - 1 ? x + 0.008 : x
        let out = 0.008
        for (const ax of axles) if (Math.abs(x - ax) < archR + flare) out = 0.024
        return { x: xx, ring: ring((width(u) * W) / 2 + out, yb, Math.max(yb + 0.01, yt), 0.075, 0.02, seg) }
      }),
      () => 0,
      1,
    )
    disposables.push(clad.geometry)
    group.add(new THREE.Mesh(clad.geometry, S.trim))
  }

  // ── glasshouse with raked pillars
  const gh = spec.greenhouse
  const ghSt = stationsU(hi ? 140 : 60).map((t) => {
    const u = gh.u0 + (gh.u1 - gh.u0) * t
    const x = xOf(u)
    const yb = top(u) - 0.025
    const yt = Math.max(yb + 0.004, ghTop(u))
    return { x, yb, yt, ring: ring(((width(u) * W) / 2) * 0.955, yb, yt, 0.005, 0.11, hi ? 32 : 20, { tumble: gh.tumble }) }
  })
  const inRange = (u: number, r?: [number, number]) => !!r && u >= r[0] && u <= r[1]
  /** the glasshouse surface at (x, y), for drawing pillars on it */
  const ghZ = (x: number, y: number) => {
    let lo = 0, hiI = ghSt.length - 1
    while (hiI - lo > 1) {
      const m = (lo + hiI) >> 1
      if (ghSt[m].x < x) lo = m
      else hiI = m
    }
    const a = ghSt[lo], b = ghSt[hiI]
    const t = Math.max(0, Math.min(1, (x - a.x) / (b.x - a.x || 1)))
    return ringZ(a.ring, y) * (1 - t) + ringZ(b.ring, y) * t
  }
  ghZRef = ghZ

  const glassHouse = loft(
    ghSt,
    (c, tag: Tag) => {
      const u = uOf(c.x)
      const roofed = u >= spec.roof.u0 && u <= spec.roof.u1 && !inRange(u, spec.alpine)
      if (tag === 'top') return roofed ? 1 : 0
      if (tag === 'tarc') return roofed ? 1 : inRange(u, spec.alpine) ? 0 : 2
      if (tag === 'side') return 0 // pillars are drawn as traced outlines on top (below)
      return 2
    },
    4,
  )
  disposables.push(glassHouse.geometry)
  group.add(new THREE.Mesh(glassHouse.geometry, [S.glass, spec.roof.black ? S.gloss : paint, S.gloss, paint]))

  // ── lights and decals
  const lightMats: { mat: THREE.MeshBasicMaterial; base: THREE.Color; k: number }[] = []
  const lightMat = (hex: string, k: number) => {
    const base = new THREE.Color(hex)
    const mat = new THREE.MeshBasicMaterial({ color: base.clone(), toneMapped: false, side: THREE.DoubleSide })
    disposables.push(mat)
    lightMats.push({ mat, base, k })
    return mat
  }
  const glows: { sprite: THREE.Sprite; k: number }[] = []
  const glow = (p: THREE.Vector3, color: string, scale: number, k: number) => {
    const m = new THREE.SpriteMaterial({ map: S.glow, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })
    disposables.push(m)
    const sp = new THREE.Sprite(m)
    sp.position.copy(p)
    sp.scale.setScalar(scale)
    group.add(sp)
    glows.push({ sprite: sp, k })
  }
  const texMat = (t: THREE.Texture, metal: number) => {
    const m = new THREE.MeshStandardMaterial({ map: t, metalness: metal, roughness: 0.35, side: THREE.DoubleSide })
    disposables.push(m)
    return m
  }
  const mats: Record<Mat, THREE.Material> = {
    gloss: S.gloss,
    trim: S.trim,
    chrome: S.chrome,
    silver: S.silver,
    body: paint,
    glass: S.glass,
    drl: lightMat('#e2f6ff', 2.3),
    head: lightMat('#ffffff', 1.6),
    tail: lightMat('#ff1a2e', 2.4),
    amber: lightMat('#ffad33', 1.6),
    mesh: texMat(S.mesh, 0.5),
    hex: texMat(S.hex, 0.9),
    slats: texMat(S.slats, 0.4),
  }

  /** Rasterise a traced outline on a fine grid, snap edge vertices onto the outline, project onto the body. */
  const decal = (d: Decal, where: 'front' | 'rear' | 'left' | 'right' | 'ghLeft' | 'ghRight') => {
    if (opt.generic && d.mat !== 'trim' && d.mat !== 'silver') return
    const poly = d.poly
    const endOn = where === 'front' || where === 'rear'
    const step = hi ? 0.011 : 0.02
    const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1])
    const a0 = Math.min(...xs), a1 = Math.max(...xs), b0 = Math.min(...ys), b1 = Math.max(...ys)
    const sa = endOn ? step : step / L
    const na = Math.max(1, Math.ceil((a1 - a0) / sa)), nb = Math.max(1, Math.ceil((b1 - b0) / step))
    const da = (a1 - a0) / na, db = (b1 - b0) / nb
    // decals ride on the outermost skin: over the cladding where there is one
    const out = (spec.cladding ? 0.016 : 0.004) + (d.layer ?? 0) * 0.003
    const end: 1 | -1 = where === 'rear' ? -1 : 1
    const sideSign: 1 | -1 = where === 'left' || where === 'ghLeft' ? -1 : 1
    const onGlass = where === 'ghLeft' || where === 'ghRight'
    const project = (a: number, b: number) =>
      endOn ? endPoint(end, a, b) : onGlass ? new THREE.Vector3(xOf(a), b, sideSign * ghZ(xOf(a), b)) : sidePoint(a, b, sideSign)
    const cache = new Map<number, THREE.Vector3 | null>()
    const vert = (i: number, j: number) => {
      const key = i * 10007 + j
      if (cache.has(key)) return cache.get(key)!
      let p: [number, number] = [a0 + i * da, b0 + j * db]
      if (!inside(p, poly)) p = nearestOnPoly(p, poly)
      const v = project(p[0], p[1])
      cache.set(key, v)
      return v
    }
    const pos: number[] = []
    const uv: number[] = []
    const uScale = endOn ? 1 : L
    for (let i = 0; i < na; i++)
      for (let j = 0; j < nb; j++) {
        if (!inside([a0 + (i + 0.5) * da, b0 + (j + 0.5) * db], poly)) continue
        const q = [vert(i, j), vert(i + 1, j), vert(i + 1, j + 1), vert(i, j + 1)]
        if (q.some((v) => !v)) continue
        const [p00, p10, p11, p01] = q as THREE.Vector3[]
        for (const p of [p00, p10, p11, p00, p11, p01]) pos.push(p.x, p.y, p.z)
        for (const [ii, jj] of [[i, j], [i + 1, j], [i + 1, j + 1], [i, j], [i + 1, j + 1], [i, j + 1]]) uv.push(((a0 + ii * da) * uScale) / 0.09, (b0 + jj * db) / 0.09)
      }
    if (!pos.length) return
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    g.computeVertexNormals()
    // push the skin out along the surface normal so it sits on the paint, not in it
    const nrm = g.attributes.normal as THREE.BufferAttribute
    const P = g.attributes.position as THREE.BufferAttribute
    const outward = new THREE.Vector3(where === 'front' ? 1 : where === 'rear' ? -1 : 0, 0, endOn ? 0 : sideSign)
    const n = new THREE.Vector3()
    for (let k = 0; k < P.count; k++) {
      n.set(nrm.getX(k), nrm.getY(k), nrm.getZ(k))
      if (endOn && Math.abs(n.z) > 0.2) n.z = Math.sign(P.getZ(k)) * Math.abs(n.z)
      if (n.dot(outward) < 0 && !(endOn && Math.abs(n.z) > 0.6)) n.negate()
      P.setXYZ(k, P.getX(k) + n.x * out, P.getY(k) + n.y * out, P.getZ(k) + n.z * out)
    }
    add(mats[d.mat], g)
    if (d.mat === 'drl' || d.mat === 'tail' || d.mat === 'head') {
      const color = d.mat === 'tail' ? '#ff3344' : '#cfefff'
      const midB = (b0 + b1) / 2
      const count = Math.max(1, Math.round((a1 - a0) / (endOn ? 0.3 : 0.3 / L)))
      for (let k = 0; k <= count; k++) {
        const a = a0 + ((a1 - a0) * k) / count
        if (!inside([a, midB], poly)) continue
        const p = project(a, midB)
        if (p) glow(p.add(outward.clone().multiplyScalar(0.03)), color, d.mat === 'head' ? 0.22 : 0.16, d.mat === 'tail' ? 0.55 : 0.42)
      }
    }
  }
  const place = (list: Decal[] | undefined, where: 'front' | 'rear' | 'side') => {
    for (const d of list ?? []) {
      if (where === 'side') {
        decal(d, 'right')
        decal(d, 'left')
        continue
      }
      decal(d, where)
      if (d.mirror) decal({ ...d, poly: d.poly.map(([z, y]) => [-z, y] as [number, number]).reverse() }, where)
    }
  }
  place(spec.front, 'front')
  place(spec.rear, 'rear')
  place(spec.side, 'side')
  // raked pillars, traced as outlines from the belt to the roof edge so their edges stay clean
  for (const p of spec.pillars) {
    const yb = (u: number) => top(u) - 0.02
    const yt = (u: number) => ghTop(u) - 0.075
    const poly: [number, number][] = [
      [p.bottom[0], yb(p.bottom[0])],
      [p.bottom[1], yb(p.bottom[1])],
      [p.top[1], yt(p.top[1])],
      [p.top[0], yt(p.top[0])],
    ]
    for (const w of ['ghLeft', 'ghRight'] as const) decal({ mat: p.black ? 'gloss' : 'body', poly }, w)
  }

  // number plates (India: white, green for EVs)
  const plateMat = new THREE.MeshStandardMaterial({ map: plateTexture(spec.plate, !!spec.ev), roughness: 0.5 })
  disposables.push(plateMat)
  for (const end of [1, -1] as const) {
    const y = end > 0 ? spec.plates.front : spec.plates.rear
    const p = endPoint(end, 0, y)
    if (!p) continue
    const g = new THREE.PlaneGeometry(0.5, 0.11)
    g.rotateY(end > 0 ? Math.PI / 2 : -Math.PI / 2)
    disposables.push(g)
    const m = new THREE.Mesh(g, plateMat)
    m.position.set(p.x + end * 0.016, y, 0)
    group.add(m)
  }

  // ── side details
  const tube = (pts: THREE.Vector3[], r: number, mat: THREE.Material) => {
    if (pts.length < 2) return
    add(mat, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), Math.max(8, pts.length * 3), r, hi ? 8 : 5, false))
  }
  {
    // door mirrors on a stalk at the base of the A-pillar
    const u = gh.u1 - 0.04
    const x = xOf(u)
    const y = top(u) + 0.1
    const zBody = zAt(x, top(u) - 0.03)
    for (const side of [-1, 1]) {
      add(spec.mirrors === 'black' ? S.gloss : paint, new RoundedBoxGeometry(0.11, 0.1, 0.19, 2, 0.035), new THREE.Matrix4().makeTranslation(x - 0.01, y, side * (zBody + 0.105)))
      add(S.trim, new RoundedBoxGeometry(0.08, 0.04, 0.16, 2, 0.015), new THREE.Matrix4().makeTranslation(x + 0.01, y - 0.05, side * (zBody + 0.04)))
    }
  }
  for (const [ub, ut] of spec.doors) {
    for (const side of [-1, 1] as const) {
      const pts: THREE.Vector3[] = []
      for (let i = 0; i <= 8; i++) {
        const f = i / 8
        const u = ub + (ut - ub) * f
        const x = xOf(u)
        const y0 = Math.max(sill(u) + 0.04, archLine(x) + 0.02, cladTop ? Math.min(cladTop(u), top(u) - 0.05) + 0.01 : -1)
        const y = y0 + (top(u) - 0.02 - y0) * f
        pts.push(new THREE.Vector3(x, y, side * (zAt(x, y) + 0.0015)))
      }
      tube(pts, 0.0042, S.well)
    }
  }
  if (spec.windowChrome) {
    const us = Array.from({ length: 28 }, (_, i) => gh.u0 + 0.04 + ((gh.u1 - gh.u0 - 0.08) * i) / 27)
    for (const side of [-1, 1] as const) tube(us.map((u) => new THREE.Vector3(xOf(u), top(u) - 0.015, side * (zAt(xOf(u), top(u) - 0.015) + 0.004))), 0.007, S.chrome)
  }
  const roofY = (u: number) => ghTop(u)
  const roofHW = (u: number) => ((width(u) * W) / 2) * 0.955 * gh.tumble
  if (spec.rails) {
    const railMat = spec.rails === 'silver' ? S.silver : S.gloss
    const peak = Math.max(...spec.greenhouse.top.map((p) => p[1]))
    const flat = spec.greenhouse.top.filter((p) => p[1] > peak - 0.06).map((p) => p[0])
    const r0 = Math.min(...flat) + 0.01, r1 = Math.max(...flat) - 0.01
    const us = Array.from({ length: 18 }, (_, i) => r0 + ((r1 - r0) * i) / 17)
    for (const side of [-1, 1] as const) {
      tube(us.map((u) => new THREE.Vector3(xOf(u), roofY(u) + 0.04, side * (roofHW(u) - 0.09))), 0.014, railMat)
      for (const u of [us[0], us[us.length - 1]]) add(S.trim, new THREE.BoxGeometry(0.1, 0.045, 0.04), new THREE.Matrix4().makeTranslation(xOf(u), roofY(u) + 0.02, side * (roofHW(u) - 0.09)))
    }
  }
  if (spec.spoiler) {
    // a lip at the back of the roof, over the tailgate glass
    let su = gh.u0
    let best = -1
    for (let u = gh.u0; u < spec.roof.u0 + 0.05; u += 0.002) if (ghTop(u) > best - 0.0005) { best = Math.max(best, ghTop(u)); su = u; if (ghTop(u) >= ghTop(spec.roof.u0) - 0.05) break }
    add(spec.roof.black ? S.gloss : paint, new RoundedBoxGeometry(0.12, 0.025, roofHW(su) * 1.9, 2, 0.01), new THREE.Matrix4().makeTranslation(xOf(su) - 0.02, roofY(su) + 0.008, 0))
  }
  if (spec.sunroof) {
    const [a, b] = spec.sunroof
    add(S.glass, new RoundedBoxGeometry((b - a) * L, 0.012, roofHW((a + b) / 2) * 1.3, 2, 0.005), new THREE.Matrix4().makeTranslation(xOf((a + b) / 2), roofY((a + b) / 2) + 0.004, 0))
  }

  // ── wheels
  const wheels: THREE.Group[] = []
  const tyreG = tyreGeometry(spec.tyreR, spec.tyreW, spec.rim, hi ? 44 : 24)
  const rimG = rimGeometry(spec, hi)
  disposables.push(tyreG, ...rimG.map((r) => r.g))
  // At speed a camera never sees spokes, it sees their average; this disc fades in as the wheels turn faster,
  // so a moving rim smears instead of strobing.
  const blurTex = rimBlurTexture(spec)
  const blurMat = new THREE.MeshStandardMaterial({ map: blurTex, metalness: 0.7, roughness: 0.38, transparent: true, opacity: 0, depthWrite: false })
  const blurG = new THREE.CircleGeometry(spec.tyreR * spec.rim * 0.96, hi ? 40 : 24)
  blurG.translate(0, 0, spec.tyreW / 2 - 0.012 + 0.004)
  disposables.push(blurTex, blurMat, blurG)
  let blur = 0
  for (const ax of axles) {
    add(S.well, new THREE.BoxGeometry(archR * 2, archR, W - 0.5), new THREE.Matrix4().makeTranslation(ax, archY + archR * 0.45, 0))
    for (const side of [-1, 1]) {
      const w = new THREE.Group()
      w.add(new THREE.Mesh(tyreG, S.tyre))
      for (const r of rimG) w.add(new THREE.Mesh(r.g, r.mat === 'face' ? S.rimFace : r.mat === 'dark' ? S.rimDark : S.brake))
      const bd = new THREE.Mesh(blurG, blurMat)
      bd.visible = false
      w.add(bd)
      if (side < 0) w.rotation.y = Math.PI
      w.position.set(ax, spec.tyreR, side * (W / 2 - spec.tyreW / 2 - 0.03))
      group.add(w)
      wheels.push(w)
    }
  }

  // contact shadow
  let shadowMesh: THREE.Mesh | null = null
  {
    const m = new THREE.MeshBasicMaterial({ map: S.shadow, transparent: true, depthWrite: false, opacity: 0.95 })
    const p = new THREE.PlaneGeometry(L * 1.25, W * 1.45)
    p.rotateX(-Math.PI / 2)
    disposables.push(m, p)
    shadowMesh = new THREE.Mesh(p, m)
    shadowMesh.position.y = 0.004
    shadowMesh.renderOrder = -1
    group.add(shadowMesh)
  }

  // merge static parts by material
  for (const [mat, list] of parts) {
    const geos = list.map((g) => {
      const n = g.index ? g.toNonIndexed() : g
      for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') n.deleteAttribute(k)
      if (!n.attributes.uv) n.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2))
      if (!n.attributes.normal) n.computeVertexNormals()
      return n
    })
    const merged = mergeGeometries(geos, false)
    list.forEach((g) => g.dispose())
    geos.forEach((g) => g.dispose())
    if (!merged) continue
    disposables.push(merged)
    group.add(new THREE.Mesh(merged, mat))
  }

  // Plan-view curvature: real fascias curve back across their whole width, not just at the corners.
  // Sweep the nose and tail back by the square of the distance from the centre line — after everything is
  // built, so lamps, grilles and plates follow the body.
  {
    const zone = 0.55
    const nose = spec.noseSweep ?? 0.14
    const tail = spec.tailSweep ?? 0.09
    const beltFront = top(spec.greenhouse.u1)
    const beltRear = top(spec.greenhouse.u0)
    const smooth = (a: number, b: number, x: number) => {
      const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
      return t * t * (3 - 2 * t)
    }
    const bend = (g: THREE.BufferGeometry, mx = 0) => {
      const P = g.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < P.count; i++) {
        const x = P.getX(i) + mx
        const zf = Math.min(1.15, (P.getZ(i) / (W / 2)) ** 2)
        // only the bumpers and fascia curve; the glasshouse above the belt stays as traced
        const y = P.getY(i)
        const keep = 1 - smooth(beltFront - 0.12, beltFront + 0.05, y)
        const keepR = 1 - smooth(beltRear - 0.12, beltRear + 0.05, y)
        const f = smooth(L / 2 - zone, L / 2, x) * nose * keep - smooth(-L / 2 + zone, -L / 2, x) * tail * keepR
        if (f) P.setX(i, P.getX(i) - f * zf)
      }
      P.needsUpdate = true
      g.computeVertexNormals()
    }
    group.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh && !wheels.some((w) => w === m.parent) && m.geometry && m !== shadowMesh) bend(m.geometry, m.position.x)
      if ((o as THREE.Sprite).isSprite) {
        const zf = Math.min(1.15, (o.position.z / (W / 2)) ** 2)
        o.position.x -= (smooth(L / 2 - zone, L / 2, o.position.x) * nose - smooth(-L / 2 + zone, -L / 2, o.position.x) * tail) * zf
      }
    })
  }

  if (opt.size?.length && opt.size.width && opt.size.height) group.scale.set(opt.size.length / 1000 / L, opt.size.height / 1000 / spec.H, opt.size.width / 1000 / W)

  return {
    group,
    paint,
    spec,
    setLights(v) {
      for (const l of lightMats) l.mat.color.copy(l.base).multiplyScalar(0.06 + v * l.k)
      for (const g of glows) (g.sprite.material as THREE.SpriteMaterial).opacity = v * g.k
    },
    spin(dx) {
      const a = dx / spec.tyreR
      for (const w of wheels) w.rotation.z += (w.rotation.y ? 1 : -1) * a
      // blur by angle per frame: spokes read sharply below ~0.22 rad a frame and strobe above ~0.45
      const t = Math.max(0, Math.min(1, (Math.abs(a) - 0.22) / 0.23))
      blur += (t * t * (3 - 2 * t) - blur) * 0.15
      blurMat.opacity = blur * 0.92
      for (const w of wheels) w.children[w.children.length - 1].visible = blur > 0.01
    },
    dispose() {
      disposables.forEach((d) => d.dispose())
    },
  }
}

// ── wheels

function tyreGeometry(R: number, w: number, rim: number, seg: number) {
  const r0 = R * rim
  const s = 0.035
  const prof = [
    [r0, -w / 2 + 0.01], [R - s, -w / 2], [R - s * 0.3, -w / 2 + s * 0.4], [R, -w / 2 + s],
    [R, w / 2 - s], [R - s * 0.3, w / 2 - s * 0.4], [R - s, w / 2], [r0, w / 2 - 0.01],
  ].map(([x, y]) => new THREE.Vector2(x, y))
  const g = new THREE.LatheGeometry(prof, seg)
  g.rotateX(Math.PI / 2)
  return g
}

/** The rim as a fast camera sees it: the spoke pattern averaged round one spoke's turn, plus faint smear rings. */
function rimBlurTexture(spec: CarSpec) {
  const N = 256
  const k = N / 2 / 0.98 // pixels per rim radius
  const src = document.createElement('canvas')
  src.width = src.height = N
  const g = src.getContext('2d')!
  g.translate(N / 2, N / 2)
  g.fillStyle = '#3a4147'
  g.beginPath()
  g.arc(0, 0, N / 2, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#d7dee4'
  const n = spec.wheel.spokes
  const len = 0.78
  const bar = (a: number, w: number, l: number, off = 0) => {
    g.save()
    g.rotate(a)
    g.fillRect((off - w / 2) * k, -(0.18 + l) * k, w * k, l * k)
    g.restore()
  }
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    switch (spec.wheel.style) {
      case 'twin':
        bar(a - 0.09, 0.085, len)
        bar(a + 0.09, 0.085, len)
        break
      case 'turbine':
        bar(a, 0.32, len)
        break
      case 'aero':
        bar(a, 0.36, len)
        break
      case 'blade':
        bar(a, 0.14, len * 0.98, 0.02)
        bar(a, 0.14, len * 0.98, 0.2)
        g.save()
        g.rotate(a)
        g.beginPath()
        g.moveTo(0.14 * k - 0.17 * k, -0.9 * k)
        g.lineTo(0.14 * k + 0.17 * k, -0.9 * k)
        g.lineTo(0.14 * k, -0.7 * k)
        g.fill()
        g.restore()
        break
      default:
        bar(a, 0.065, len)
    }
  }
  g.beginPath()
  g.arc(0, 0, 0.18 * k, 0, Math.PI * 2)
  g.fill()

  // average over one spoke period: drawing copy j at alpha 1/(j+1) leaves the exact mean
  const c = document.createElement('canvas')
  c.width = c.height = N
  const o = c.getContext('2d')!
  const steps = 32
  for (let j = 0; j < steps; j++) {
    o.save()
    o.globalAlpha = 1 / (j + 1)
    o.translate(N / 2, N / 2)
    o.rotate(((j / steps) * Math.PI * 2) / n)
    o.drawImage(src, -N / 2, -N / 2)
    o.restore()
  }
  // a few thin concentric smears, the way machined faces streak in a photo
  o.translate(N / 2, N / 2)
  for (let j = 0; j < 14; j++) {
    o.strokeStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'
    o.lineWidth = 1 + Math.random() * 2
    o.beginPath()
    o.arc(0, 0, (0.22 + Math.random() * 0.74) * k, 0, Math.PI * 2)
    o.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function rimGeometry(spec: CarSpec, hi: boolean) {
  const R = spec.tyreR * spec.rim
  const face = spec.tyreW / 2 - 0.012
  const out: { g: THREE.BufferGeometry; mat: 'face' | 'dark' | 'brake' }[] = []
  const cyl = (r: number, d: number, z: number, n: number) => {
    const g = new THREE.CylinderGeometry(r, r, d, n)
    g.rotateX(Math.PI / 2)
    g.translate(0, 0, z)
    return g
  }
  out.push({ g: cyl(R * 0.98, 0.03, face - 0.03, hi ? 40 : 22), mat: 'dark' })
  out.push({ g: cyl(R * 0.72, 0.03, face - 0.07, 24), mat: 'brake' })
  const lip = new THREE.TorusGeometry(R * 0.97, 0.011, 6, hi ? 48 : 24)
  lip.translate(0, 0, face)
  out.push({ g: lip, mat: 'face' })
  out.push({ g: cyl(R * 0.18, 0.04, face - 0.004, 20), mat: 'face' })
  const spokes: THREE.BufferGeometry[] = []
  const n = spec.wheel.spokes
  const blade = (angle: number, w: number, len: number, z: number, sweep = 0, off = 0) => {
    const b = new THREE.BoxGeometry(w, len, 0.022, 1, 6, 1)
    b.translate(off, R * 0.18 + len / 2, z)
    if (sweep) {
      // bend the blade round as it goes out, like a turbine
      const pos = b.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i)
        const a = sweep * ((y - R * 0.18) / len)
        pos.setXY(i, x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a))
      }
    }
    b.rotateZ(angle)
    spokes.push(b)
  }
  const len = R * 0.78
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    switch (spec.wheel.style) {
      case 'twin':
        blade(a - 0.09, R * 0.085, len, face - 0.008)
        blade(a + 0.09, R * 0.085, len, face - 0.008)
        break
      case 'turbine':
        blade(a, R * 0.32, len, face - 0.008, 0.6)
        break
      case 'blade': {
        // off-centre spokes, two machined faces split by a dark groove, a wedge where each meets the rim
        blade(a, R * 0.14, len * 0.98, face - 0.006, 0.06, R * 0.02)
        blade(a, R * 0.14, len * 0.98, face - 0.006, 0.06, R * 0.2)
        const t = new THREE.CylinderGeometry(R * 0.2, R * 0.2, 0.02, 3)
        t.rotateX(Math.PI / 2)
        t.rotateZ(Math.PI)
        t.translate(R * 0.14, R * 0.8, face - 0.008)
        t.rotateZ(a + 0.08)
        spokes.push(t)
        break
      }
      case 'aero':
        blade(a, R * 0.36, len, face - 0.006, 0.25)
        break
      default:
        blade(a, R * 0.065, len, face - 0.008)
    }
  }
  const merged = mergeGeometries(spokes.map((s) => s.toNonIndexed()), false)
  spokes.forEach((s) => s.dispose())
  if (merged) out.push({ g: merged, mat: 'face' })
  return out
}
