import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Cursor, Hud, Loader, Terminal } from './components/Chrome'
import { LinkedIn } from './components/LinkedIn'
import { chapters, flexiloans } from './data/profile'
import { Contact, Flexi, Hello, LeetCode, Origin, Projects, Proof, Toolchain } from './components/Sections'
import { calendar, lastDays, refresh, snapshot, stats as statsOf, type Activity } from './lib/activity'
import { heroIntro, setupCounts, setupMagnetic, setupReveals, setupScramble } from './lib/motion'
import { startAnalytics, track, trackChapter } from './lib/analytics'
import { reducedMotion } from './lib/perf'
import { ScrollTrigger, lenis, startScroll } from './lib/scroll'
import { getTheme, onTheme, setTheme, type Theme } from './lib/theme'
import { World } from './webgl/World'

// which chapter (0..6) each story stop belongs to
const CHAPTER_OF: Record<string, number> = { hello: 0, kosha: 2, vana: 2, sahicar: 2, transcribo: 2, proof: 3, leetcode: 3, origin: 4, stack: 5, contact: 6 }
for (const s of ['flx', ...flexiloans.systems.map((x) => x.stop)]) CHAPTER_OF[s] = 1
const chapterOf = (id: string) => CHAPTER_OF[id] ?? 0

type Step = { label: string; value?: string; ok: boolean }

export default function App() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const main = useRef<HTMLElement>(null)
  const progress = useRef<HTMLDivElement>(null)
  const world = useRef<World | null>(null)

  const [activity, setActivity] = useState<Activity>(snapshot)
  const [cursor, setCursor] = useState<string | null>(null)
  const [chapter, setChapter] = useState(0)
  const [term, setTerm] = useState(false)
  const [theme, setThemeState] = useState<Theme>(getTheme())
  const [steps, setSteps] = useState<Step[]>([
    { label: 'resolving story', ok: true },
    { label: 'loading typefaces', ok: false },
    { label: 'compiling shaders', ok: false },
    { label: 'fetching activity', ok: false },
    { label: 'warming up the GPU', ok: false },
  ])
  const [minTime, setMinTime] = useState(false)
  const [loaderGone, setLoaderGone] = useState(false)
  const done = minTime && steps.every((s) => s.ok)

  const stats = useMemo(() => statsOf(activity, 'all'), [activity])
  const cal = useMemo(() => calendar(activity, 'all'), [activity])

  const mark = useCallback((label: string, value?: string) => setSteps((s) => s.map((x) => (x.label === label ? { ...x, ok: true, value } : x))), [])

  useEffect(() => onTheme(setThemeState), [])
  useEffect(() => startAnalytics(), [])
  useEffect(() => trackChapter(chapters[chapter].label), [chapter])
  useEffect(() => {
    if (term) track('terminal_open')
  }, [term])

  // the 3D world, the scroll clock and the boot sequence
  useEffect(() => {
    const stops = [...main.current!.querySelectorAll<HTMLElement>('[data-stop]')]
    let w: World
    try {
      w = new World(canvas.current!, { stops, onCursor: setCursor })
    } catch {
      // no WebGL: the page still reads as a story, without the 3D
      document.documentElement.dataset.nogl = ''
      ;['compiling shaders', 'warming up the GPU'].forEach((l) => mark(l, 'skipped'))
      setTimeout(() => setMinTime(true), 600)
      return startScroll(() => {})
    }
    world.current = w
    w.layout()
    lenis?.stop()

    let lastChapter = -1
    let frames = 0
    const stopScroll = startScroll(() => {
      w.tick()
      if (++frames === 20) mark('warming up the GPU')
      const s = w.storyIndex
      const ch = chapterOf(stops[Math.round(s)]?.dataset.stop ?? 'hello')
      if (ch !== lastChapter) {
        lastChapter = ch
        setChapter(ch)
      }
      if (progress.current) progress.current.style.transform = `scaleY(${s / (stops.length - 1)})`
    })
    w.warm().then(
      () => mark('compiling shaders'),
      () => mark('compiling shaders'),
    )
    const fontsDone = () => {
      mark('loading typefaces')
      w.layout()
      ScrollTrigger.refresh()
    }
    Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 3000))]).then(fontsDone)
    // on a slow connection or device, never hold the visitor at the loader for more than 5 seconds
    const failsafe = setTimeout(() => setSteps((st) => st.map((x) => (x.ok ? x : { ...x, ok: true }))), 5000)
    const t = setTimeout(() => setMinTime(true), 1900)
    const ro = new ResizeObserver(() => {
      w.layout()
      ScrollTrigger.refresh()
    })
    ro.observe(main.current!)
    return () => {
      clearTimeout(t)
      clearTimeout(failsafe)
      ro.disconnect()
      stopScroll()
      w.dispose()
      world.current = null
    }
  }, [mark])

  useEffect(() => {
    refresh(snapshot).then((a) => {
      setActivity(a)
      const s = statsOf(a, 'all')
      mark('fetching activity', `${s.active}/365 days`)
    })
  }, [mark])

  useEffect(() => {
    world.current?.setCalendar(cal)
  }, [cal])
  useEffect(() => {
    world.current?.setLeetCode({ ...activity.leetcode.solved, days: lastDays(activity, 'leetcode') })
  }, [activity])

  // DOM motion
  useEffect(() => setupReveals(main.current!), [])
  useEffect(() => setupMagnetic(document.body), [])
  // counters wait for the boot sequence so the hero's numbers count up in view
  useEffect(() => (done ? setupCounts(main.current!, 1.2) : undefined), [done, stats, activity])
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('.scramble')
    return el ? setupScramble(el) : undefined
  }, [])

  const onGone = useCallback(() => setLoaderGone(true), [])
  useEffect(() => {
    if (!done) return
    window.scrollTo(0, 0)
    world.current?.playIntro()
    heroIntro()
    const t = setTimeout(() => lenis?.start(), 900)
    return () => clearTimeout(t)
  }, [done])

  // day ↔ night: a circle of the new world opens from the toggle
  const toggleTheme = useCallback((e: React.MouseEvent) => {
    const next: Theme = getTheme() === 'dark' ? 'light' : 'dark'
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } }
    if (!doc.startViewTransition || reducedMotion) {
      setTheme(next)
      return
    }
    const x = e.clientX || innerWidth - 60
    const y = e.clientY || 40
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
    const vt = doc.startViewTransition(() => {
      flushSync(() => setTheme(next))
      world.current?.renderNow()
    })
    vt.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 1100, easing: 'cubic-bezier(0.7, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
      )
    })
  }, [])

  // the terminal: ` toggles it; the page stops scrolling while it's open
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === '`' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault()
        setTerm((o) => !o)
      }
      if (e.key === 'Escape') setTerm(false)
    }
    addEventListener('keydown', key)
    return () => removeEventListener('keydown', key)
  }, [])
  useEffect(() => {
    if (!done) return
    if (term) lenis?.stop()
    else lenis?.start()
  }, [term, done])

  return (
    <>
      <canvas ref={canvas} className="gl" aria-hidden />
      <div className="vignette" aria-hidden />
      <div className="grain" aria-hidden />
      {!loaderGone && <Loader steps={steps} done={done} onGone={onGone} />}
      <Cursor label={cursor} />
      <Hud chapter={chapter} progressRef={progress} onTerminal={() => setTerm(true)} theme={theme} onTheme={toggleTheme} />
      <main ref={main}>
        <Hello />
        <Flexi />
        <Projects />
        <Proof stats={stats} />
        <LeetCode a={activity} />
        <Origin />
        <Toolchain />
        <LinkedIn />
        <Contact />
      </main>
      <Terminal open={term} onClose={() => setTerm(false)} />
    </>
  )
}
