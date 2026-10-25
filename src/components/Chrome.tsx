import { useEffect, useRef, useState } from 'react'
import { chapters, profile, projects } from '../data/profile'
import { track } from '../lib/analytics'
import { coarsePointer } from '../lib/perf'
import { getTheme, setTheme, type Theme } from '../lib/theme'
import { scrollToEl } from '../lib/scroll'

/** Boot sequence shown while fonts, shaders and the contribution data load. */
export function Loader({ steps, done, onGone }: { steps: { label: string; value?: string; ok: boolean }[]; done: boolean; onGone: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const pct = Math.round((steps.filter((s) => s.ok).length / steps.length) * 100)
  useEffect(() => {
    if (!done) return
    const el = ref.current!
    el.classList.add('out')
    const t = setTimeout(onGone, 1100)
    return () => clearTimeout(t)
  }, [done, onGone])
  return (
    <div className="loader" ref={ref} aria-live="polite">
      <div className="loader-panel top" />
      <div className="loader-panel bottom" />
      <div className="loader-term mono">
        <p className="dim">$ ssh guest@prasad.dev</p>
        {steps.map((s) => (
          <p key={s.label} className={s.ok ? 'ok' : ''}>
            <span className="dim">&gt;</span> {s.label} <span className="dots" /> {s.ok ? <span className="okv">{s.value ?? 'ok'}</span> : <span className="spin" />}
          </p>
        ))}
        <div className="loader-bar">
          <i style={{ width: `${pct}%` }} />
        </div>
        <p className="loader-pct">{String(pct).padStart(3, '0')}%</p>
      </div>
    </div>
  )
}

const CHAPTER_LABELS = chapters.map((c) => c.label)
const TARGETS = chapters.map((c) => `#${c.id}`)

/** Fixed frame: logo, chapter nav, the git-graph progress rail and the current commit. */
export function Hud({
  chapter,
  progressRef,
  onTerminal,
  theme,
  onTheme,
}: {
  chapter: number
  progressRef: React.RefObject<HTMLDivElement | null>
  onTerminal: () => void
  theme: Theme
  onTheme: (e: React.MouseEvent) => void
}) {
  const c = chapters[chapter]
  return (
    <div className="hud" data-ui>
      <button className="logo mono" onClick={() => scrollToEl('#hello')} aria-label="Back to top" data-magnetic>
        <span>PA</span>
        <i>_</i>
      </button>
      <nav className="nav mono" aria-label="Chapters">
        {CHAPTER_LABELS.slice(1).map((l, i) => (
          <button key={l} className={chapter === i + 1 ? 'on' : ''} onClick={() => scrollToEl(TARGETS[i + 1])}>
            <span>0{i + 1}</span>
            {l}
          </button>
        ))}
      </nav>
      <div className="hud-actions">
        <button className="theme-btn" onClick={onTheme} data-magnetic aria-label={theme === 'dark' ? 'Switch to daylight' : 'Switch to night'} title={theme === 'dark' ? 'Daylight' : 'Night'}>
          {theme === 'dark' ? (
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
              <circle cx="12" cy="12" r="4.2" fill="currentColor" />
              <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
              </g>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
              <path d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1Z" fill="currentColor" />
            </svg>
          )}
        </button>
        <button className="term-btn mono" onClick={onTerminal} data-magnetic aria-label="Open terminal">
          &gt;_
        </button>
      </div>
      <div className="rail" aria-hidden>
        <div className="rail-line">
          <div className="rail-fill" ref={progressRef} />
        </div>
        {chapters.map((ch, i) => (
          <button
            key={ch.id}
            className={`rail-dot ${i <= chapter ? 'past' : ''} ${i === chapter ? 'on' : ''}`}
            style={{ top: `${(i / (chapters.length - 1)) * 100}%` }}
            onClick={() => scrollToEl(TARGETS[i])}
            tabIndex={-1}
          >
            <span className="mono">{CHAPTER_LABELS[i]}</span>
          </button>
        ))}
      </div>
      <p className="commit mono" key={c.hash}>
        <span className="commit-head">HEAD</span>
        <span className="commit-hash">{c.hash}</span>
        <span className="commit-msg">{c.msg}</span>
      </p>
    </div>
  )
}

/** A dot and a trailing ring; the ring grows over links and shows a label over the 3D scene. */
export function Cursor({ label }: { label: string | null }) {
  const dot = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  const [hot, setHot] = useState(false)
  useEffect(() => {
    if (coarsePointer) return
    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, raf = 0
    const move = (e: PointerEvent) => {
      x = e.clientX
      y = e.clientY
      setHot(!!(e.target as Element)?.closest?.('a, button'))
    }
    const loop = () => {
      rx += (x - rx) * 0.18
      ry += (y - ry) * 0.18
      if (dot.current) dot.current.style.transform = `translate3d(${x}px, ${y}px, 0)`
      if (ring.current) ring.current.style.transform = `translate3d(${rx}px, ${ry}px, 0)`
      raf = requestAnimationFrame(loop)
    }
    addEventListener('pointermove', move, { passive: true })
    raf = requestAnimationFrame(loop)
    return () => {
      removeEventListener('pointermove', move)
      cancelAnimationFrame(raf)
    }
  }, [])
  if (coarsePointer) return null
  return (
    <>
      <div className="cursor-dot" ref={dot} />
      <div className={`cursor-ring ${hot ? 'hot' : ''} ${label ? 'labelled' : ''}`} ref={ring}>
        <span className="mono">{label}</span>
      </div>
    </>
  )
}

type Line = { kind: 'in' | 'out' | 'err'; text: string; href?: string }

const HELP = `commands:
  whoami          who is this
  ls              list chapters
  projects        side projects
  open <name>     open a project (kosha, vana, transcribo)
  goto <chapter>  fly to a chapter
  contact         ways to reach me
  resume          download the résumé
  theme [day|night]  switch the world
  sudo hire-me    try it
  clear · exit`

/** A small terminal, opened with ` or the >_ button. */
export function Terminal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [lines, setLines] = useState<Line[]>([{ kind: 'out', text: `prasad.dev shell — type "help" to begin` }])
  const [value, setValue] = useState('')
  const [hist, setHist] = useState<string[]>([])
  const [hi, setHi] = useState(-1)
  const input = useRef<HTMLInputElement>(null)
  const body = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (open) setTimeout(() => input.current?.focus(), 50)
  }, [open])
  useEffect(() => {
    body.current?.scrollTo({ top: body.current.scrollHeight })
  }, [lines])

  const run = (raw: string) => {
    const cmd = raw.trim()
    const [name, ...args] = cmd.split(/\s+/)
    if (name) track('terminal_command', { command: name.toLowerCase().slice(0, 20) })
    const out: Line[] = [{ kind: 'in', text: cmd }]
    const say = (text: string, href?: string) => out.push({ kind: 'out', text, href })
    switch (name.toLowerCase()) {
      case '':
        break
      case 'help':
        say(HELP)
        break
      case 'whoami':
        say(`${profile.name} — ${profile.role}, ${profile.location}.\n${profile.pitch}`)
        break
      case 'ls':
        say(CHAPTER_LABELS.map((c, i) => `0${i}  ${c}/`).join('\n'))
        break
      case 'projects':
        say(projects.map((p) => `${p.id.padEnd(12)} ${p.tagline}`).join('\n'))
        break
      case 'open': {
        const p = projects.find((x) => x.id === args[0]?.toLowerCase())
        if (!p) { out.push({ kind: 'err', text: `open: no such project "${args[0] ?? ''}"` }); break }
        const url = p.live ?? p.code!
        say(`opening ${url}`, url)
        window.open(url, '_blank', 'noopener')
        break
      }
      case 'goto':
      case 'cd': {
        const i = CHAPTER_LABELS.findIndex((c) => c.startsWith((args[0] ?? '').toLowerCase().replace('/', '')))
        if (i < 0 || !args[0]) { out.push({ kind: 'err', text: `goto: try one of ${CHAPTER_LABELS.join(', ')}` }); break }
        say(`flying to ${CHAPTER_LABELS[i]}…`)
        onClose()
        setTimeout(() => scrollToEl(TARGETS[i]), 250)
        break
      }
      case 'contact':
        say(`email     ${profile.email}`, `mailto:${profile.email}`)
        say(`linkedin  ${profile.links.linkedin}`, profile.links.linkedin)
        say(`github    ${profile.links.github}`, profile.links.github)
        break
      case 'resume':
        say('downloading Prasad_Alai_Resume.pdf', '/Prasad_Alai_Resume.pdf')
        window.open('/Prasad_Alai_Resume.pdf', '_blank')
        break
      case 'sudo':
        if (args.join(' ') === 'hire-me') {
          say('[sudo] password for recruiter: ********\naccess granted. opening a draft email…', `mailto:${profile.email}`)
          location.href = `mailto:${profile.email}?subject=${encodeURIComponent("Let's talk")}`
        } else out.push({ kind: 'err', text: 'sudo: nice try' })
        break
      case 'clear':
        setLines([])
        return
      case 'exit':
        onClose()
        break
      case 'theme': {
        const t = args[0] === 'light' || args[0] === 'day' ? 'light' : args[0] === 'dark' || args[0] === 'night' ? 'dark' : getTheme() === 'dark' ? 'light' : 'dark'
        setTheme(t)
        say(t === 'light' ? 'good morning. painting the sky…' : 'good evening. lights down.')
        break
      }
      case 'rm':
        out.push({ kind: 'err', text: 'rm: permission denied. this portfolio is immutable.' })
        break
      default:
        out.push({ kind: 'err', text: `${name}: command not found. try "help"` })
    }
    setLines((l) => [...l, ...out])
  }

  if (!open) return null
  return (
    <div className="term-wrap" data-ui onClick={onClose} data-lenis-prevent>
      <div className="term mono" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Terminal">
        <div className="term-bar">
          <i />
          <i />
          <i />
          <span>guest@prasad.dev: ~</span>
          <button onClick={onClose} aria-label="Close terminal">
            esc
          </button>
        </div>
        <div className="term-body" ref={body}>
          {lines.map((l, i) => (
            <pre key={i} className={l.kind}>
              {l.kind === 'in' && <span className="ps">$ </span>}
              {l.href ? (
                <a href={l.href} target="_blank" rel="noreferrer">
                  {l.text}
                </a>
              ) : (
                l.text
              )}
            </pre>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              run(value)
              if (value.trim()) setHist((h) => [value, ...h])
              setHi(-1)
              setValue('')
            }}
          >
            <span className="ps">$ </span>
            <input
              ref={input}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') onClose()
                if (e.key === 'ArrowUp' && hist.length) {
                  const n = Math.min(hi + 1, hist.length - 1)
                  setHi(n)
                  setValue(hist[n])
                  e.preventDefault()
                }
                if (e.key === 'ArrowDown') {
                  const n = Math.max(hi - 1, -1)
                  setHi(n)
                  setValue(n < 0 ? '' : hist[n])
                }
              }}
              spellCheck={false}
              autoComplete="off"
              aria-label="Command"
            />
          </form>
        </div>
      </div>
    </div>
  )
}
