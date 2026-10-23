import { coarsePointer, reducedMotion } from './perf'
import { ScrollTrigger, SplitText, gsap } from './scroll'

/** Scroll-triggered reveals for everything marked up with data-split / data-reveal / data-stagger / data-count. */
export function setupReveals(root: HTMLElement) {
  const ctx = gsap.context(() => {
    if (reducedMotion) return
    root.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
      const split = SplitText.create(el, { type: 'words,chars', mask: 'words', wordsClass: 'w' })
      gsap.from(split.chars, {
        yPercent: 110,
        rotate: 6,
        duration: 1.1,
        ease: 'expo.out',
        stagger: 0.022,
        scrollTrigger: { trigger: el, start: 'top 85%' },
      })
    })
    root.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
      gsap.from(el, {
        y: 48,
        autoAlpha: 0,
        filter: 'blur(8px)',
        duration: 1.1,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%' },
        clearProps: 'filter',
      })
    })
    root.querySelectorAll<HTMLElement>('[data-stagger]').forEach((el) => {
      gsap.from(el.children, {
        y: 24,
        autoAlpha: 0,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.06,
        scrollTrigger: { trigger: el, start: 'top 90%' },
      })
    })
  }, root)
  return () => ctx.revert()
}

/** Count-ups. Safe to re-run when numbers change: finished counters just snap to the new value. */
export function setupCounts(root: HTMLElement, startDelay = 0) {
  const triggers: ScrollTrigger[] = []
  root.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count)
    const dec = Number(el.dataset.decimals ?? 0)
    const pre = el.dataset.prefix ?? ''
    const suf = el.dataset.suffix ?? ''
    const fmt = (v: number) => `${pre}${dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-IN')}${suf}`
    if (reducedMotion || el.dataset.counted) {
      el.textContent = fmt(to)
      return
    }
    el.textContent = fmt(0)
    const o = { v: 0 }
    const run = (delay: number) => {
      el.dataset.counted = '1'
      gsap.to(o, { v: to, duration: 2, delay, ease: 'power3.out', onUpdate: () => void (el.textContent = fmt(o.v)) })
    }
    // already on screen (the hero): count once the intro has played
    if (el.getBoundingClientRect().top < innerHeight && scrollY < 10) {
      run(startDelay)
      return
    }
    triggers.push(ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => run(0) }))
  })
  return () => triggers.forEach((t) => t.kill())
}

const GLYPHS = '!<>-_\\/[]{}—=+*^?#01'

/** Scrambles through the hero's list of roles. */
export function setupScramble(el: HTMLElement) {
  const roles = (el.dataset.roles ?? '').split('|')
  let i = 0
  let raf = 0
  let timer = 0
  const to = (next: string) => {
    const from = el.textContent ?? ''
    const len = Math.max(from.length, next.length)
    const queue = Array.from({ length: len }, (_, k) => ({ from: from[k] ?? '', to: next[k] ?? '', start: Math.floor(Math.random() * 18), end: 18 + Math.floor(Math.random() * 22) }))
    let frame = 0
    const step = () => {
      let out = ''
      let done = 0
      for (const q of queue) {
        if (frame >= q.end) { done++; out += q.to }
        else if (frame >= q.start) out += `<span class="glyph">${GLYPHS[Math.floor(Math.random() * GLYPHS.length)]}</span>`
        else out += q.from
      }
      el.innerHTML = out
      frame++
      if (done < queue.length) raf = requestAnimationFrame(step)
    }
    step()
  }
  if (reducedMotion) return () => {}
  timer = window.setInterval(() => {
    i = (i + 1) % roles.length
    to(roles[i])
  }, 2800)
  return () => {
    clearInterval(timer)
    cancelAnimationFrame(raf)
  }
}

/** Buttons and links that lean toward the pointer. */
export function setupMagnetic(root: HTMLElement) {
  if (coarsePointer || reducedMotion) return () => {}
  const move = (e: PointerEvent) => {
    const el = (e.target as Element).closest<HTMLElement>('[data-magnetic]')
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - (r.left + r.width / 2)) * 0.3
    const y = (e.clientY - (r.top + r.height / 2)) * 0.4
    gsap.to(el, { x, y, duration: 0.5, ease: 'power3.out' })
  }
  const out = (e: PointerEvent) => {
    const el = (e.target as Element).closest<HTMLElement>('[data-magnetic]')
    if (el && !el.contains(e.relatedTarget as Node)) gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)' })
  }
  root.addEventListener('pointermove', move)
  root.addEventListener('pointerout', out)
  return () => {
    root.removeEventListener('pointermove', move)
    root.removeEventListener('pointerout', out)
  }
}

/** The hero's entrance, played as the loader opens. */
export function heroIntro() {
  const lines = document.querySelectorAll<HTMLElement>('[data-hero]')
  const tl = gsap.timeline({ delay: 0.35 })
  if (reducedMotion) {
    gsap.set(['[data-hero]', '.hero-in', '.hud'], { autoAlpha: 1 })
    return tl
  }
  lines.forEach((line, i) => {
    const split = SplitText.create(line, { type: 'chars', mask: 'chars' })
    // unwrap the masks afterwards: they clip the outline's glow
    tl.from(split.chars, { yPercent: 120, duration: 1.4, ease: 'expo.out', stagger: 0.05, onComplete: () => split.revert() }, i * 0.14)
  })
  tl.set('[data-hero]', { autoAlpha: 1 }, 0)
  tl.fromTo('.hero-in', { y: 28, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, ease: 'power3.out', stagger: 0.08 }, 0.5)
  tl.fromTo('.hud', { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.2 }, 0.9)
  return tl
}
