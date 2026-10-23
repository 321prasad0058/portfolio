// Performance tier, after Kosha's: start from what the device reports, then step down if frames run slow.
export type Tier = 'high' | 'low'

type Nav = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }

function detect(): Tier {
  try {
    const forced = new URLSearchParams(location.search).get('perf') ?? sessionStorage.getItem('pa-perf')
    if (forced === 'high' || forced === 'low') return forced
  } catch { /* storage blocked */ }
  const n = navigator as Nav
  const cores = n.hardwareConcurrency ?? 4
  const mem = n.deviceMemory ?? 4
  if (n.connection?.saveData) return 'low'
  if (cores <= 2 || mem <= 2 || (cores <= 4 && mem <= 4)) return 'low'
  return 'high'
}

let tier: Tier = detect()
const listeners = new Set<(t: Tier) => void>()
document.documentElement.dataset.perf = tier

export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
export const coarsePointer = matchMedia('(pointer: coarse)').matches
export const getTier = () => tier
export function setTier(t: Tier) {
  if (t === tier) return
  tier = t
  document.documentElement.dataset.perf = t
  try { sessionStorage.setItem('pa-perf', t) } catch { /* storage blocked */ }
  listeners.forEach((l) => l(t))
}
export function onTier(fn: (t: Tier) => void) {
  listeners.add(fn)
  return () => void listeners.delete(fn)
}

/** Calls onSlow once when the average frame stays over budget (~28 fps) for a full window. */
export class FrameGuard {
  private samples: number[] = []
  private fired = false
  private since = performance.now()
  constructor(private onSlow: () => void, private budgetMs = 36, private size = 90, private warmupMs = 2500) {}
  tick(dtMs: number) {
    if (this.fired || dtMs > 500) return // tab switches and long pauses are not a verdict
    if (performance.now() - this.since < this.warmupMs) return
    this.samples.push(dtMs)
    if (this.samples.length > this.size) this.samples.shift()
    if (this.samples.length === this.size && this.samples.reduce((a, b) => a + b, 0) / this.size > this.budgetMs) {
      this.fired = true
      this.onSlow()
    }
  }
  reset() { this.samples = []; this.since = performance.now() }
}
