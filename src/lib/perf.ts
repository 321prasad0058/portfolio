// Performance tier, after Kosha's: start from what the device reports, then step down if frames run slow.
export type Tier = 'high' | 'low'

type Nav = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean; effectiveType?: string } }

function detect(): Tier {
  try {
    const forced = new URLSearchParams(location.search).get('perf') ?? sessionStorage.getItem('pa-perf')
    if (forced === 'high' || forced === 'low') return forced
  } catch { /* storage blocked */ }
  const n = navigator as Nav
  const cores = n.hardwareConcurrency ?? 4
  const mem = n.deviceMemory ?? 4
  if (n.connection?.saveData || /2g/.test(n.connection?.effectiveType ?? '')) return 'low'
  if (cores <= 2 || mem <= 2 || (cores <= 4 && mem <= 4)) return 'low'
  // phones and tablets with 3 GB or less: budget GPUs, start without the glow passes
  if (coarse && mem <= 3) return 'low'
  return 'high'
}

const coarse = matchMedia('(pointer: coarse)').matches

let tier: Tier = detect()
const listeners = new Set<(t: Tier) => void>()
/** "lite" pages skip the costly CSS effects (background blur behind glass, animated grain): every
 *  touch device, and any device that has fallen to the low tier. */
function mark() {
  const root = document.documentElement
  root.dataset.perf = tier
  if (coarse || tier === 'low') root.dataset.lite = ''
  else delete root.dataset.lite
}
mark()

export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
export const coarsePointer = coarse
export const getTier = () => tier
export function setTier(t: Tier) {
  if (t === tier) return
  tier = t
  mark()
  try { sessionStorage.setItem('pa-perf', t) } catch { /* storage blocked */ }
  listeners.forEach((l) => l(t))
}
export function onTier(fn: (t: Tier) => void) {
  listeners.add(fn)
  return () => void listeners.delete(fn)
}

/**
 * Watches frame times and asks for less work when frames run slow, more when there is headroom.
 * Judged over windows of 40 frames: slower than ~48 fps → onSlow (then a short cool-down so the
 * change can take effect); six windows in a row at ~57 fps or better → onFast.
 */
export class FrameMeter {
  private sum = 0
  private n = 0
  private good = 0
  private waitUntil: number
  constructor(private onSlow: () => void, private onFast: () => void, warmupMs = 2500) {
    this.waitUntil = performance.now() + warmupMs
  }
  tick(dtMs: number) {
    if (dtMs > 250) return // tab switches and long pauses are not a verdict
    if (performance.now() < this.waitUntil) return
    this.sum += dtMs
    if (++this.n < 40) return
    const avg = this.sum / this.n
    this.sum = 0
    this.n = 0
    if (avg > 21) {
      this.good = 0
      this.onSlow()
      this.pause(900)
    } else if (avg < 17.5) {
      if (++this.good >= 6) {
        this.good = 0
        this.onFast()
        this.pause(900)
      }
    } else this.good = 0
  }
  /** Ignore frames for a moment (after a quality change, a theme switch, a resize…). */
  pause(ms: number) {
    this.sum = 0
    this.n = 0
    this.waitUntil = Math.max(this.waitUntil, performance.now() + ms)
  }
}
