import * as THREE from 'three'
import { C, flat, ink, label, toon } from '../paint'
import { type Piece } from '../util'

// Foundations: the degree as a crystal, with the coursework in orbit around it.
export function createAcademy(center: THREE.Vector3, topics: string[]): Piece {
  const group = new THREE.Group()
  group.position.copy(center)

  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0), toon(['#0d2b1c', '#6aa84f'], { glow: 0.5, glowColor: ['#39d353', '#6aa84f'] }))
  const shell = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.OctahedronGeometry(1.45, 0)), ink(C.green, 0.8))
  group.add(crystal, shell)

  const orbits = topics.map((t, i) => {
    const pivot = new THREE.Group()
    pivot.rotation.set(Math.PI / 2 + (i - 2) * 0.32, (i * Math.PI) / 5, (i - 2) * 0.12)
    const r = 2.4 + i * 0.45
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.008, 6, 200), flat(i % 2 ? C.cyan : C.green, 0.4))
    const holder = new THREE.Group()
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), flat(['#d9ffe4', '#c8553d']))
    node.position.x = r
    const tag = label(t, { size: 44, height: 0.36, bg: ['rgba(6,14,10,0.72)', 'rgba(255,250,238,0.9)'] })
    tag.position.set(r, 0.32, 0)
    holder.add(node, tag)
    pivot.add(ring, holder)
    group.add(pivot)
    return { holder, speed: 0.16 + (4 - i) * 0.05, phase: i * 1.3 }
  })

  return {
    group,
    center,
    radius: 6,
    update(time) {
      crystal.rotation.set(time * 0.3, time * 0.4, 0)
      shell.rotation.set(-time * 0.2, -time * 0.25, 0)
      crystal.position.y = shell.position.y = Math.sin(time * 0.9) * 0.12
      for (const o of orbits) o.holder.rotation.z = o.phase + time * o.speed
    },
  }
}
