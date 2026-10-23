import * as THREE from 'three'
import { C, flat, ink, label, type Pair } from '../paint'
import { damp, type Piece } from '../util'

// The toolchain as a constellation: every tool a star on a sphere, linked to its nearest neighbours.
// Drag to spin it; it keeps the momentum.
export type StackPiece = Piece & { drag(dx: number, dy: number): void }

const COLORS: Pair[] = [C.green, C.cyan, C.violet, C.gold]

export function createStack(center: THREE.Vector3, groups: string[][]): StackPiece {
  const group = new THREE.Group()
  group.position.copy(center)
  const spin = new THREE.Group()
  group.add(spin)
  const R = 5

  const items = groups.flatMap((g, gi) => g.map((t) => ({ t, gi })))
  const golden = Math.PI * (3 - Math.sqrt(5))
  const pts: THREE.Vector3[] = []
  items.forEach(({ t, gi }, i) => {
    const y = 1 - (i / (items.length - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const p = new THREE.Vector3(Math.cos(golden * i) * r, y, Math.sin(golden * i) * r).multiplyScalar(R)
    pts.push(p)
    const s = label(t, { size: 46, height: 0.32, color: COLORS[gi], weight: 600 })
    s.position.copy(p)
    spin.add(s)
  })

  const seg: number[] = []
  pts.forEach((p, i) => {
    pts
      .map((q, j) => ({ j, d: p.distanceToSquared(q) }))
      .filter((x) => x.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2)
      .forEach(({ j }) => {
        if (j > i) seg.push(p.x, p.y, p.z, pts[j].x, pts[j].y, pts[j].z)
      })
  })
  const lineGeo = new THREE.BufferGeometry()
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3))
  spin.add(new THREE.LineSegments(lineGeo, ink(C.green, 0.22)))
  spin.add(new THREE.Mesh(new THREE.IcosahedronGeometry(R * 0.55, 2), flat(C.green, 0.07)))
  ;(spin.children.at(-1) as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>).material.wireframe = true
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 24), flat(['#4fbf74', '#e0a43a']))
  group.add(core)

  const vel = new THREE.Vector2(0.12, 0)
  const q = new THREE.Quaternion()
  const axisY = new THREE.Vector3(0, 1, 0)
  const axisX = new THREE.Vector3(1, 0, 0)
  return {
    group,
    center,
    radius: 7,
    drag(dx, dy) {
      vel.x += dx * 0.004
      vel.y += dy * 0.004
    },
    update(time, dt) {
      spin.quaternion.premultiply(q.setFromAxisAngle(axisY, vel.x * dt * 2))
      spin.quaternion.premultiply(q.setFromAxisAngle(axisX, vel.y * dt * 2))
      vel.x += (0.12 - vel.x) * damp(1.2, dt)
      vel.y += (0 - vel.y) * damp(1.2, dt)
      core.scale.setScalar(1 + Math.sin(time * 2) * 0.08)
    },
  }
}
