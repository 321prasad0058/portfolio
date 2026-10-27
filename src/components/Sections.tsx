import { achievements, certifications, education, flexiloans, impact, languages, leadership, pillars, profile, projects, stack } from '../data/profile'
import type { Activity, Stats } from '../lib/activity'
import { scrollToEl } from '../lib/scroll'
import { ContactForm } from './ContactForm'
import { FlLogo } from './FlLogo'

const Arrow = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
    <path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

function Head({ n, hash, msg, title }: { n: string; hash: string; msg: string; title: string }) {
  return (
    <header className="head">
      <p className="mono head-commit" data-reveal>
        <span className="head-n">{n}</span>
        <span className="head-hash">commit {hash}</span>
        <span className="head-msg">{msg}</span>
      </p>
      <h2 className="head-title" data-split>
        {title}
      </h2>
    </header>
  )
}

function Count({ value, prefix = '', suffix = '', decimals = 0 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  return (
    <span className="count" data-count={value} data-decimals={decimals} data-prefix={prefix} data-suffix={suffix}>
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </span>
  )
}

const TONE: Record<string, string> = { Backend: 'g', Frontend: 'c', 'Agentic AI': 'v' }

export function Hello() {
  return (
    <section id="hello" className="sec sec-hello" data-stop="hello">
      <div className="wrap hello-inner">
        <p className="mono eyebrow hero-in">
          <span className="prompt">~/prasad</span> $ whoami
        </p>
        <h1 className="hello-name" aria-label={profile.name}>
          <span className="hello-line" data-hero>
            {profile.first}
          </span>
          <span className="hello-line hello-second" data-hero>
            {profile.last}
          </span>
        </h1>
        <p className="hello-role hero-in">
          {profile.role} <span className="slash">/</span>{' '}
          <span className="scramble" data-roles={profile.roles.join('|')}>
            {profile.roles[0]}
          </span>
          <span className="caret" />
        </p>
        <p className="hello-tag hero-in">{profile.pitch}</p>
        <ul className="pillar-tags hero-in">
          {pillars.map((p) => (
            <li key={p.name} className={`tone-${p.tone}`}>
              <i /> {p.name}
            </li>
          ))}
        </ul>
        <p className="hello-langs mono hero-in">
          <span className="dim">speaks</span>
          {languages.map((l, i) => (
            <span key={l.name} title={l.name}>
              {i > 0 && <i aria-hidden>·</i>}
              {l.hero ?? l.native}
            </span>
          ))}
        </p>
        <div className="hello-cta hero-in" data-ui>
          <button className="btn btn-solid" data-magnetic onClick={() => scrollToEl('#flexiloans')}>
            See it in production <span aria-hidden>↓</span>
          </button>
          <button className="btn" data-magnetic onClick={() => scrollToEl('#contact')}>
            Get in touch
          </button>
        </div>
      </div>
      <div className="impact-strip hero-in" data-ui>
        <p className="mono impact-label">
          <i className="dot" /> in production at FlexiLoans
        </p>
        <ul>
          {impact.map((m) => (
            <li key={m.label}>
              <b>
                <Count value={m.value} suffix={m.suffix} />
              </b>
              <span>{m.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function Flexi() {
  return (
    <>
      <section id="flexiloans" className="sec" data-stop="flx">
        <div className="wrap split-left">
          <Head n="01" hash="f1e8a5e" msg="release: in production @ FlexiLoans" title="In production." />
          <div className="card" data-reveal data-ui>
            <div className="role-row">
              <div>
                <h3 className="card-title fl-title">
                  <FlLogo className="fl-logo" />
                </h3>
                <p className="muted">{flexiloans.role}</p>
              </div>
              <p className="mono dim right">
                {flexiloans.period}
                <br />
                {flexiloans.location}
              </p>
            </div>
            <p>{flexiloans.about}</p>
            <ul className="pillars">
              {pillars.map((p) => (
                <li key={p.name} className={`tone-${p.tone}`}>
                  <strong>
                    <i /> {p.name}
                  </strong>
                  <span>{p.summary}</span>
                </li>
              ))}
            </ul>
            <p className="mono hint">↓ what I built, one system at a time</p>
          </div>
        </div>
      </section>
      {flexiloans.systems.map((s) => {
        return (
          <section key={s.id} id={s.id} className="sec" data-stop={s.stop}>
            <div className="wrap split-left">
              <article className="card sys" data-reveal data-ui>
                <p className="mono sys-idx">
                  <span>
                    0{s.scene + 1} / 0{flexiloans.scenes.length}
                  </span>
                  {s.pillars.map((p) => (
                    <em key={p} className={`pill tone-${TONE[p]}`}>
                      {p}
                    </em>
                  ))}
                </p>
                <h3 className="card-title">{s.name}</h3>
                <p className="plain">{s.plain}</p>
                {s.parts ? (
                  <ol className="parts">
                    {s.parts.map((p) => (
                      <li key={p.title}>
                        <strong className="mono">{p.title}</strong>
                        <span className="muted">{p.text}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <>
                    <p className="label mono">built</p>
                    <p className="muted built">{s.built}</p>
                  </>
                )}
                {s.metrics.length > 0 && (
                  <div className="metrics">
                    {s.metrics.map((m) => (
                      <div className="metric" key={m.label}>
                        <b>
                          <Count value={m.value} prefix={m.prefix} suffix={m.suffix} />
                        </b>
                        <span>{m.label}</span>
                      </div>
                    ))}
                  </div>
                )}
                {s.more && (
                  <ol className="parts more">
                    {s.more.map((p) => (
                      <li key={p.title}>
                        <strong className="mono">{p.title}</strong>
                        <span className="muted">{p.text}</span>
                      </li>
                    ))}
                  </ol>
                )}
                {s.partners && (
                  <>
                    <p className="label mono">integrated partners</p>
                    <ul className="chips small partners">
                      {s.partners.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  </>
                )}
                {s.tags.length > 0 && (
                  <ul className="chips small">
                    {s.tags.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                )}
                {s.link && (
                  <a className="link mono" href={s.link.href} target="_blank" rel="noreferrer" data-magnetic>
                    {s.link.label} <Arrow />
                  </a>
                )}
              </article>
            </div>
          </section>
        )
      })}
    </>
  )
}

export function Projects() {
  return (
    <>
      {projects.map((p, i) => (
        <section key={p.id} id={i === 0 ? 'projects' : undefined} className="sec" data-stop={p.id}>
          <div className={`wrap ${i === 1 ? 'split-right' : 'split-left'}`}>
            {i === 0 && <Head n="02" hash="3d9b0a7" msg="merge: things I built on my own" title="Built on my own." />}
            <article className="card project" data-reveal data-ui style={{ ['--accent' as string]: p.accent }}>
              <p className="mono sys-idx">
                <span>02.{i + 1}</span> · branch/{p.id}
              </p>
              <h3 className="project-name">{p.name}</h3>
              <p className="project-kicker">{p.tagline}</p>
              <p className="plain">{p.plain}</p>
              <p className="label mono">how it works</p>
              <ol className="steps">
                {p.how.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ol>
              {p.impact && <p className="project-impact mono">{p.impact}</p>}
              <ul className="chips small">
                {p.stack.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              <div className="project-links">
                {p.live && (
                  <a className="btn btn-solid" href={p.live} target="_blank" rel="noreferrer" data-magnetic>
                    Live <Arrow />
                  </a>
                )}
                {p.code && (
                  <a className="btn" href={p.code} target="_blank" rel="noreferrer" data-magnetic>
                    Code <Arrow />
                  </a>
                )}
              </div>
            </article>
          </div>
        </section>
      ))}
    </>
  )
}

export function Proof({ stats }: { stats: Stats }) {
  return (
    <section id="proof" className="sec sec-top" data-stop="proof">
      <div className="wrap">
        <Head n="03" hash="c0de400" msg="perf: code, every single day" title="Every single day." />
        <p className="lede" data-reveal>
          My last twelve months of coding, day by day: commits across my GitHub accounts and LeetCode submissions, together. Taller means busier.
        </p>
        <div className="grind-bar" data-reveal data-ui>
          <div className="stats">
            <div>
              <b>
                <Count value={stats.active} />
                <small>/{stats.windowDays}</small>
              </b>
              <span>days active this year</span>
            </div>
            <div>
              <b>
                <Count value={stats.longest} suffix="d" />
              </b>
              <span>longest streak</span>
            </div>
            <div>
              <b>
                <Count value={stats.current} suffix="d" />
              </b>
              <span>current streak</span>
            </div>
          </div>
          <div className="filters">
          <div className="gh-links" data-ui>
            <a className="btn btn-solid" href={profile.links.github} target="_blank" rel="noreferrer" data-magnetic>
              GitHub <Arrow />
            </a>
            <a className="btn" href={profile.links.leetcode} target="_blank" rel="noreferrer" data-magnetic>
              LeetCode <Arrow />
            </a>
          </div>
          <ul className="legend mono" aria-label="Legend">
            <li>
              <i className="sw sw-0" /> rest day
            </li>
            <li>
              <i className="sw sw-1" />
              <i className="sw sw-2" />
              <i className="sw sw-3" />
              <i className="sw sw-4" /> busier
            </li>
            <li>last 12 months</li>
          </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

export function LeetCode({ a }: { a: Activity }) {
  const lc = a.leetcode
  const monthly = lc.badges.filter((b) => /LeetCoding Challenge/.test(b)).length
  const yearly = lc.badges.filter((b) => /^200 Days Badge \d{4}$/.test(b)).map((b) => b.slice(-4)).sort()
  const big = lc.badges.find((b) => /^\d+ Days Badge$/.test(b))
  const diffs = [
    ['Easy', lc.solved.easy, 'e'],
    ['Medium', lc.solved.medium, 'm'],
    ['Hard', lc.solved.hard, 'h'],
  ] as const
  return (
    <section id="leetcode" className="sec" data-stop="leetcode">
      <div className="wrap split-left">
        <article className="card lc" data-reveal data-ui>
          <div className="role-row">
            <div>
              <p className="mono sys-idx">
                <span>03.2</span> · problem solving
              </p>
              <h3 className="card-title">LeetCode</h3>
            </div>
            <a className="link mono" href={profile.links.leetcode} target="_blank" rel="noreferrer">
              @{lc.user} <Arrow />
            </a>
          </div>
          <div className="lc-top">
            <b className="big">
              <Count value={lc.solved.all} />
            </b>
            <span>
              problems solved
              <em className="mono">{lc.languages[0] ? `${lc.languages[0].problemsSolved} of them in ${lc.languages[0].languageName}` : ''}</em>
            </span>
          </div>
          <ul className="diff">
            {diffs.map(([name, n, k]) => (
              <li key={name} className={`d-${k}`}>
                <span>{name}</span>
                <i style={{ ['--w' as string]: `${(n / lc.solved.all) * 100}%` }} />
                <b>{n}</b>
              </li>
            ))}
          </ul>
          <ul className="badges mono">
            <li>
              <b>{lc.maxStreak}d</b> longest daily streak
            </li>
            {big && (
              <li>
                <b>{big.replace(' Badge', '')}</b> badge
              </li>
            )}
            {monthly > 0 && (
              <li>
                <b>{monthly}</b> monthly daily-challenge badges
              </li>
            )}
            {yearly.length > 0 && (
              <li>
                <b>200-day</b> badge in {yearly.join(', ')}
              </li>
            )}
          </ul>
          <div className="trio">
            {achievements.map((g) => (
              <div className="stat-card" key={g.label}>
                <b className="big">
                  <Count value={g.value} prefix={g.prefix} suffix={g.suffix} />
                </b>
                <strong>{g.label}</strong>
                <span className="muted">{g.note}</span>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  )
}

export function Origin() {
  return (
    <section id="origin" className="sec" data-stop="origin">
      <div className="wrap split-left">
        <Head n="04" hash="7b2e91d" msg="feat: B.E. Information Technology" title="Foundations." />
        <div className="card" data-reveal data-ui>
          <div className="edu-top">
            <div>
              <h3 className="card-title">{education.school}</h3>
              <p className="muted">
                {education.degree} · {education.university}
              </p>
              <p className="mono dim">{education.period}</p>
            </div>
            <div className="gauge" style={{ ['--p' as string]: education.cgpa / 10 }}>
              <svg viewBox="0 0 100 100" aria-hidden>
                <circle cx="50" cy="50" r="44" className="gauge-bg" />
                <circle cx="50" cy="50" r="44" className="gauge-fg" pathLength="1" />
              </svg>
              <div className="gauge-val">
                <Count value={education.cgpa} decimals={2} />
                <span className="mono dim">CGPA / 10</span>
              </div>
            </div>
          </div>
          <p className="label mono">undergraduate</p>
          <ul className="chips small">
            {education.coursework.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p className="label mono">leadership</p>
          <ul className="lead">
            {leadership.map((l) => (
              <li key={l.org}>
                <strong>{l.role}</strong>
                <span className="muted">{l.org}</span>
                <span className="mono dim">{l.period}</span>
              </li>
            ))}
          </ul>
          <p className="label mono">certifications</p>
          <ul className="certs">
            {certifications.map((c) => (
              <li key={c.name}>
                <a href={c.link} target="_blank" rel="noreferrer" className="link">
                  {c.name} <Arrow />
                </a>
              </li>
            ))}
          </ul>
          <p className="label mono">languages</p>
          <ul className="langs">
            {languages.map((l) => (
              <li key={l.name} className="lang" tabIndex={0}>
                <span className="lang-word">
                  <b className="lang-native">{l.native}</b>
                  <b className="lang-hello" aria-hidden>
                    {l.hello}
                  </b>
                </span>
                <span className="lang-meta">
                  <span className="lang-name">{l.name}</span>
                  <span className="lang-level mono">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <i key={n} className={n <= l.dots ? 'on' : ''} />
                    ))}
                    {l.level}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

const TONES = ['g', 'c', 'v', 'y']

export function Toolchain() {
  return (
    <section id="stack" className="sec" data-stop="stack">
      <div className="wrap split-left">
        <Head n="05" hash="5ac7e11" msg="chore: toolchain" title="The toolchain." />
        <div className="card" data-reveal data-ui>
          {Object.entries(stack).map(([group, items], gi) => (
            <div className="tool-group" key={group}>
              <p className={`label mono tone-${TONES[gi]}`}>{group}</p>
              <ul className="chips small">
                {items.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mono hint" data-reveal>
          ↳ drag the constellation to spin it
        </p>
      </div>
    </section>
  )
}

export function Contact() {
  const links = [
    ['GitHub', profile.links.github],
    ['LinkedIn', profile.links.linkedin],
    ['LeetCode', profile.links.leetcode],
    ['Dev Fable · blog', profile.links.blog],
    ['Résumé (PDF)', '/Prasad_Alai_Resume.pdf'],
  ]
  return (
    <section id="contact" className="sec sec-contact" data-stop="contact">
      <div className="wrap contact-inner">
        <p className="mono head-commit" data-reveal>
          <span className="head-n">06</span>
          <span className="head-hash">HEAD → main</span>
          <span className="head-msg">git push origin future</span>
        </p>
        <h2 className="contact-title" data-split>
          Let’s build something that ships.
        </h2>
        <p className="lede center" data-reveal>
          Backend that holds up under load, frontends people actually finish, AI agents that do real work. If your team needs that, I’d love to talk.
        </p>
        <ContactForm />
        <ul className="socials" data-stagger data-ui>
          {links.map(([name, href]) => (
            <li key={name}>
              <a href={href} target="_blank" rel="noreferrer" data-magnetic>
                {name} <Arrow />
              </a>
            </li>
          ))}
        </ul>
      </div>
      <footer className="foot mono">
        <span>© {new Date().getFullYear()} Prasad Anil Alai</span>
        <span>Three.js · GSAP · React, written by hand</span>
        <span>
          press <kbd>`</kbd> for a terminal
        </span>
      </footer>
    </section>
  )
}
