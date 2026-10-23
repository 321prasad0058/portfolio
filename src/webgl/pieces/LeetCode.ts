import * as THREE from 'three'
import { C, label, relabel, themed, toon, type Pair } from '../paint'
import { damp, type FrameCtx, type Piece } from '../util'

// LeetCode, in 3D: the solved-problems ring split by difficulty (as on the profile page), wrapped in a
// helix of the last 365 days — one block per day, lit if I solved something that day.
export type LeetPiece = Piece & { setData(d: { easy: number; medium: number; hard: number; all: number; days: number[] }): void }

const DIFF: { key: 'easy' | 'medium' | 'hard'; color: Pair; name: string }[] = [
  { key: 'easy', color: ['#00b8a3', '#2a9d8f'], name: 'Easy' },
  { key: 'medium', color: ['#ffc01e', '#e0a43a'], name: 'Medium' },
  { key: 'hard', color: ['#ef4743', '#c8553d'], name: 'Hard' },
]

export function createLeetCode(center: THREE.Vector3): LeetPiece {
  const group = new THREE.Group()
  group.position.copy(center)
  const ring = new THREE.Group()
  group.add(ring)
  const total = label('581', { size: 120, height: 1.0, font: 'display', weight: 800, color: C.ink })
  total.position.y = 0.2
  const sub = label('problems solved', { size: 40, height: 0.28, color: C.soft })
  sub.position.y = -0.55
  group.add(total, sub)
  const tags = DIFF.map((d) => {
    const s = label(d.name, { size: 40, height: 0.3, color: d.color, weight: 700 })
    group.add(s)
    return s
  })
  let arcs: THREE.Mesh[] = []

  // the helix of days
  const N = 365
  // emissive off: each day's colour comes from its instance colour alone (white glow would wash it out)
  const cubes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), toon(['#ffffff', '#ffffff'], { glow: 0, glowColor: ['#000000', '#000000'] }), N)
  group.add(cubes)
  const on = new THREE.Color()
  const off = new THREE.Color()
  const hot = new THREE.Color()
  themed((t) => {
    on.set(t === 'dark' ? '#ffc01e' : '#e0a43a')
    off.set(t === 'dark' ? '#1b222c' : '#d9cfb6')
    hot.set(t === 'dark' ? '#ffd76a' : '#c8553d')
  })
  const dummy = new THREE.Object3D()
  const place = (i: number) => {
    const t = i / (N - 1)
    const a = t * Math.PI * 2 * 3.2
    const r = 3.9
    dummy.position.set(Math.cos(a) * r, -2.6 + t * 5.4, Math.sin(a) * r)
    dummy.rotation.set(0, -a, 0)
  }
  for (let i = 0; i < N; i++) {
    place(i)
    dummy.updateMatrix()
    cubes.setMatrixAt(i, dummy.matrix)
    cubes.setColorAt(i, off)
  }
  let days: number[] = new Array(N).fill(0)
  let grow = 0
  let seen = false
  let litShown = -1
  let sparkShown = -1
  themed(() => (litShown = -1)) // repaint the days in the new theme's colours

  function setData(d: { easy: number; medium: number; hard: number; all: number; days: number[] }) {
    days = d.days.slice(-N)
    litShown = -1
    relabel(total, String(d.all))
    arcs.forEach((a) => {
      ring.remove(a)
      a.geometry.dispose()
    })
    const sum = d.easy + d.medium + d.hard
    const gap = 0.06
    let start = Math.PI / 2
    arcs = DIFF.map((df, i) => {
      const len = (d[df.key] / sum) * (Math.PI * 2) - gap
      const m = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.16, 16, 160, len), toon(df.color, { glow: 0.45 }))
      m.rotation.z = start - len
      const mid = start - len / 2
      tags[i].position.set(Math.cos(mid) * 2.75, Math.sin(mid) * 2.75, 0.3)
      relabel(tags[i], `${df.name} ${d[df.key]}`)
      start -= len + gap
      ring.add(m)
      return m
    })
  }

  return {
    group,
    center,
    radius: 7,
    setData,
    update(time, dt, ctx: FrameCtx) {
      if (!seen && Math.abs(ctx.story - ctx.storyOf('leetcode')) < 0.7) seen = true
      if (seen) grow = Math.min(1, grow + dt * 0.45)
      arcs.forEach((a, i) => a.scale.setScalar(Math.max(0.001, Math.min(1, grow * 2.2 - i * 0.25))))
      ring.rotation.y = Math.sin(time * 0.4) * 0.25
      // light the days one by one up the helix, then a soft spark travels along them
      const lit = Math.floor(grow * N)
      const spark = grow < 1 ? lit - 1 : Math.floor((time * 22) % N)
      if (lit !== litShown || spark !== sparkShown) {
        litShown = lit
        sparkShown = spark
        for (let i = 0; i < N; i++) cubes.setColorAt(i, days[i] > 0 && i < lit ? (Math.abs(i - spark) < 2 ? hot : on) : off)
        cubes.instanceColor!.needsUpdate = true
      }
      group.rotation.y += (Math.sin(time * 0.15) * 0.3 - group.rotation.y) * damp(1, dt)
    },
  }
}
