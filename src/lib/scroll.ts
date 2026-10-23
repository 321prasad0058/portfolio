import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import Lenis from 'lenis'
import { reducedMotion } from './perf'

gsap.registerPlugin(ScrollTrigger, SplitText)

export let lenis: Lenis | null = null

/** Smooth scrolling driven by GSAP's ticker, so the page, ScrollTrigger and the 3D world share one clock. */
export function startScroll(onFrame: () => void) {
  if (!reducedMotion) {
    lenis = new Lenis({ duration: 1.25, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), touchMultiplier: 1.4 })
    lenis.on('scroll', ScrollTrigger.update)
  }
  const tick = (time: number) => {
    lenis?.raf(time * 1000)
    onFrame()
  }
  gsap.ticker.add(tick)
  gsap.ticker.lagSmoothing(0)
  return () => {
    gsap.ticker.remove(tick)
    lenis?.destroy()
    lenis = null
  }
}

/** Scroll to a story section so the top of its content sits just under the nav. */
export function scrollToEl(target: string | HTMLElement) {
  const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target
  if (!el) return
  const anchor = el.querySelector<HTMLElement>('.wrap > :first-child') ?? el
  const gap = innerWidth >= 900 ? 96 : 72
  let top = 0
  for (let n: HTMLElement | null = anchor; n; n = n.offsetParent as HTMLElement | null) top += n.offsetTop
  const y = el.id === 'hello' ? 0 : Math.max(0, top - gap)
  if (lenis) lenis.scrollTo(y, { duration: 2.2 })
  else window.scrollTo({ top: y, behavior: reducedMotion ? 'auto' : 'smooth' })
}

export { gsap, ScrollTrigger, SplitText }
