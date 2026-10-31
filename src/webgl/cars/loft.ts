// A lofted car body. A car is described the way a designer sketches it, as lines along its length:
// the underside (with real wheel arches), the shoulder/bonnet/boot line, the glasshouse, and the plan-view
// width. Rounded cross-sections are swept along those lines, and every triangle is tagged as paint, cladding,
// roof, pillar or glass. Everything is procedural: zero downloads, built in a few milliseconds.
import * as THREE from 'three'

export type Pts = [number, number][]

/** Monotone cubic interpolation (Fritsch–Carlson) through [u, v] points sorted by u: smooth, never overshoots. */
export function curve(pts: Pts) {
  const n = pts.length
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const d = new Array(n - 1).fill(0).map((_, i) => (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i] || 1e-6))
  const m = new Array(n).fill(0)
  m[0] = d[0]
  m[n - 1] = d[n - 2]
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = m[i + 1] = 0; continue }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i] }
  }
  return (u: number) => {
    if (u <= xs[0]) return ys[0]
    if (u >= xs[n - 1]) return ys[n - 1]
    let i = 0
    while (u > xs[i + 1]) i++
    const h = xs[i + 1] - xs[i], t = (u - xs[i]) / h, t2 = t * t, t3 = t2 * t
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1]
  }
}

export type Tag = 'bottom' | 'barc' | 'side' | 'tarc' | 'top'

export interface Ring {
  pts: [number, number][] // [z, y]
  tags: Tag[]
}

/**
 * A rounded-rectangle cross-section, mirrored left/right, with a fixed vertex count so rings can be lofted.
 * `tumble` narrows the top (greenhouse), `bulge` pushes the sides out, `crown` domes the top surface.
 */
export function ring(
  hw: number,
  yb: number,
  yt: number,
  rb: number,
  rt: number,
  seg: number,
  opt: { tumble?: number; bulge?: number; crown?: number; shoulder?: number; inset?: number } = {},
): Ring {
  const h = Math.max(0.002, yt - yb)
  rb = Math.min(rb, hw * 0.95, h * 0.45)
  rt = Math.min(rt, hw * 0.95, h * 0.55)
  const nB = Math.max(1, Math.round(seg * 0.12)), nBA = Math.max(2, Math.round(seg * 0.18)), nS = Math.max(2, Math.round(seg * 0.22)), nTA = Math.max(3, Math.round(seg * 0.3)), nT = Math.max(2, Math.round(seg * 0.18))
  const half: [number, number, Tag][] = []
  for (let i = 0; i < nB; i++) half.push([((hw - rb) * i) / nB, yb, 'bottom'])
  for (let i = 0; i < nBA; i++) { const a = -Math.PI / 2 + (Math.PI / 2) * (i / nBA); half.push([hw - rb + rb * Math.cos(a), yb + rb + rb * Math.sin(a), 'barc']) }
  // side wall, with a vertex exactly on the shoulder line so the crease stays crisp
  const sideYs: number[] = []
  for (let i = 0; i < nS; i++) sideYs.push(yb + rb + ((h - rb - rt) * i) / nS)
  const shY = opt.shoulder
  if (shY != null && shY > yb + rb && shY < yt - rt) {
    let k = 0
    for (let i = 1; i < nS; i++) if (Math.abs(sideYs[i] - shY) < Math.abs(sideYs[k] - shY)) k = i
    if (k > 0) sideYs[k] = shY
  }
  for (const y of sideYs) half.push([hw, y, 'side'])
  for (let i = 0; i < nTA; i++) { const a = (Math.PI / 2) * (i / nTA); half.push([hw - rt + rt * Math.cos(a), yt - rt + rt * Math.sin(a), 'tarc']) }
  for (let i = 0; i <= nT; i++) half.push([(hw - rt) * (1 - i / nT), yt, 'top'])
  const tumble = opt.tumble ?? 1, bulge = opt.bulge ?? 0, crown = opt.crown ?? 0
  // a shoulder crease: above it the side leans inward, which catches the light as a line along the car
  const sh = opt.shoulder ?? Infinity, inset = opt.inset ?? 0
  const shape = ([z, y, t]: [number, number, Tag]): [number, number, Tag] => {
    const f = (y - yb) / h
    let zz = z * (1 + (tumble - 1) * f)
    if (inset && y > sh) zz *= 1 - (inset / hw) * Math.min(1, (y - sh) / Math.max(0.05, yt - sh))
    if (bulge && (t === 'side' || t === 'barc')) zz += hw * bulge * Math.sin(Math.PI * f)
    let yy = y
    if (crown && t === 'top') yy += crown * Math.cos((Math.PI / 2) * (z / hw))
    return [zz, yy, t]
  }
  const right = half.map(shape)
  // full ring: bottom centre → right side → top centre → left side → back (left mirrors right, reversed)
  const left = right.slice(1, -1).reverse().map(([z, y, t]) => [-z, y, t] as [number, number, Tag])
  const all = [...right, ...left]
  return { pts: all.map(([z, y]) => [z, y]), tags: all.map((p) => p[2]) }
}

export interface LoftOut {
  geometry: THREE.BufferGeometry
  /** positions of each ring, for placing lights and trim on the surface */
  rings: { x: number; ring: Ring }[]
}

/**
 * Sweeps rings along x. `classify` gets each triangle's centroid and the tag of its first vertex
 * and returns a material index; triangles are grouped by it. Ends are closed with fans.
 */
export function loft(stations: { x: number; ring: Ring }[], classify: (c: THREE.Vector3, tag: Tag, n: THREE.Vector3, x: number) => number, groups: number): LoftOut {
  const K = stations[0].ring.pts.length
  const pos: number[] = []
  for (const s of stations) for (const [z, y] of s.ring.pts) pos.push(s.x, y, z)
  // end-cap centres
  const capA = pos.length / 3
  const cA = centre(stations[0])
  pos.push(stations[0].x, cA[1], 0)
  const capB = capA + 1
  const last = stations[stations.length - 1]
  const cB = centre(last)
  pos.push(last.x, cB[1], 0)

  const tris: number[][] = Array.from({ length: groups }, () => [])
  const v = (i: number) => new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2])
  const put = (a: number, b: number, c: number, tag: Tag) => {
    const A = v(a), B = v(b), C = v(c)
    const cen = A.clone().add(B).add(C).divideScalar(3)
    const nrm = B.clone().sub(A).cross(C.clone().sub(A)).normalize()
    tris[classify(cen, tag, nrm, cen.x)].push(a, b, c)
  }
  for (let s = 0; s < stations.length - 1; s++) {
    for (let k = 0; k < K; k++) {
      const a = s * K + k, b = s * K + ((k + 1) % K), c = (s + 1) * K + k, d = (s + 1) * K + ((k + 1) % K)
      const tag = stations[s].ring.tags[k]
      put(a, c, b, tag)
      put(b, c, d, tag)
    }
  }
  const lastS = (stations.length - 1) * K
  // end caps are faces of the car, never "underside", whatever ring point they fan to
  for (let k = 0; k < K; k++) {
    put(capA, k, (k + 1) % K, 'side')
    put(capB, lastS + ((k + 1) % K), lastS + k, 'side')
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  const index: number[] = []
  let start = 0
  tris.forEach((t, i) => {
    index.push(...t)
    g.addGroup(start, t.length, i)
    start += t.length
  })
  g.setIndex(index)
  g.computeVertexNormals()
  return { geometry: g, rings: stations }
}

function centre(s: { ring: Ring }) {
  let y = 0
  for (const p of s.ring.pts) y += p[1]
  return [0, y / s.ring.pts.length]
}

/** Where a horizontal line at height y meets the outer surface of a ring, on the +z side. */
export function ringZ(r: Ring, y: number) {
  let best = 0
  const p = r.pts
  for (let i = 0; i < p.length; i++) {
    const [z1, y1] = p[i], [z2, y2] = p[(i + 1) % p.length]
    if (z1 < 0 && z2 < 0) continue
    if ((y1 - y) * (y2 - y) <= 0 && y1 !== y2) {
      const z = z1 + ((y - y1) / (y2 - y1)) * (z2 - z1)
      if (z > best) best = z
    }
  }
  return best
}

/** Cosine-spaced stations: dense at the nose and tail where the shape changes fastest. */
export function stationsU(n: number) {
  return Array.from({ length: n + 1 }, (_, i) => 0.5 - 0.5 * Math.cos((Math.PI * i) / n))
}
