import { useRef } from 'react'
import { linkedin, profile } from '../data/profile'
import { coarsePointer, reducedMotion } from '../lib/perf'

const LiLogo = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
    <path
      fill="currentColor"
      d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"
    />
  </svg>
)

// a cover banner drawn in code: a field of commit squares that breathes (painted sky by day, via CSS)
const CELLS = Array.from({ length: 52 * 6 }, (_, i) => {
  const r = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1
  return { level: r < 0.12 ? 0 : 1 + Math.floor(r * 4) - (r > 0.97 ? 1 : 0), delay: ((i * 37) % 50) / 10 }
})

export function LinkedIn() {
  const card = useRef<HTMLAnchorElement>(null)
  const tilt = (e: React.PointerEvent) => {
    if (coarsePointer || reducedMotion || !card.current) return
    const r = card.current.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    card.current.style.setProperty('--rx', `${-y * 8}deg`)
    card.current.style.setProperty('--ry', `${x * 10}deg`)
    card.current.style.setProperty('--gx', `${(x + 0.5) * 100}%`)
    card.current.style.setProperty('--gy', `${(y + 0.5) * 100}%`)
  }
  const reset = () => {
    card.current?.style.setProperty('--rx', '0deg')
    card.current?.style.setProperty('--ry', '0deg')
  }
  return (
    <section id="linkedin" className="sec sec-li">
      <div className="wrap li-wrap">
        <p className="mono eyebrow" data-reveal>
          <span className="prompt">~/prasad</span> $ open linkedin
        </p>
        <a
          ref={card}
          className="li-card"
          href={linkedin.url}
          target="_blank"
          rel="noreferrer"
          data-reveal
          data-ui
          onPointerMove={tilt}
          onPointerLeave={reset}
          aria-label={`${profile.name} on LinkedIn`}
        >
          <div className="li-cover" style={linkedin.cover ? { backgroundImage: `url(${linkedin.cover})` } : undefined}>
            {!linkedin.cover && (
              <div className="li-grid" aria-hidden>
                {CELLS.map((c, i) => (
                  <i key={i} className={`l${c.level}`} style={{ animationDelay: `${c.delay}s` }} />
                ))}
              </div>
            )}
            <span className="li-cover-tag mono">{'<build what ships />'}</span>
          </div>
          <div className="li-body">
            <div className="li-photo-ring">
              <img className="li-photo" src={linkedin.photo} alt={profile.name} width="180" height="180" loading="lazy" decoding="async" />
            </div>
            <span className="li-badge" aria-hidden>
              <LiLogo />
            </span>
            <div className="li-main">
              <h3 className="li-name">{profile.name}</h3>
              <p className="li-headline">{linkedin.headline}</p>
              <p className="li-meta">{linkedin.location}</p>
              {linkedin.followers !== null && (
                <p className="li-stats">
                  <b>{linkedin.followers}</b> followers
                </p>
              )}
              <div className="li-actions">
                <span className="li-btn li-btn-solid">
                  <LiLogo /> Connect
                </span>
                <span className="li-btn">View profile ↗</span>
              </div>
            </div>
            <ul className="li-orgs">
              <li>
                <i className="li-org-logo fl">FL</i>
                {linkedin.org}
              </li>
              <li>
                <i className="li-org-logo db">DB</i>
                {linkedin.school}
              </li>
            </ul>
          </div>
          <span className="li-shine" aria-hidden />
        </a>
      </div>
    </section>
  )
}
