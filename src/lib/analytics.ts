import { onTheme } from './theme'

// Visit analytics: Google Analytics 4 through the Firebase project `prasad-alai`. The measurement ID is
// public by design. The script loads only after the page is idle, so it never slows the first paint,
// and nothing is sent from local development.
const MEASUREMENT_ID = 'G-73F358X30N'

type Gtag = (...args: unknown[]) => void
declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: Gtag
  }
}

const enabled =
  typeof window !== 'undefined' &&
  !/^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname) &&
  !new URLSearchParams(location.search).has('notrack')

/** Send an event (queued until the script has loaded). */
export function track(name: string, params: Record<string, string | number | boolean> = {}) {
  if (enabled) window.gtag?.('event', name, params)
}

const seenChapters = new Set<string>()
/** The first time each chapter is reached in a visit — shows where visitors drop off. */
export function trackChapter(label: string) {
  if (seenChapters.has(label)) return
  seenChapters.add(label)
  track('chapter_view', { chapter: label, order: seenChapters.size })
}

// which link a click went to, in plain words
function linkTarget(a: HTMLAnchorElement) {
  const href = a.getAttribute('href') ?? ''
  if (href.startsWith('mailto:')) return 'email'
  if (href.endsWith('.pdf')) return 'resume'
  const rules: [RegExp, string][] = [
    [/linkedin\.com/, 'linkedin'],
    [/leetcode\.com/, 'leetcode'],
    [/github\.com\/[^/]+\/Kosha/i, 'kosha_code'],
    [/github\.com\/[^/]+\/VANA/i, 'vana_code'],
    [/github\.com\/[^/]+\/transcribo/i, 'transcribo_code'],
    [/github\.com/, 'github'],
    [/kosha-ai\.web\.app/, 'kosha_live'],
    [/vana-mind\.vercel\.app/, 'vana_live'],
    [/flexiloans\.com\/flexy/, 'flexy_live'],
    [/flexiloans\.com\/credit-score/, 'credit_score_live'],
    [/flexiloans\.com/, 'flexiloans'],
    [/hashnode\.dev/, 'blog'],
    [/coursera\.org/, 'certificate'],
  ]
  return rules.find(([re]) => re.test(href))?.[1] ?? (/^https?:/.test(href) ? 'other_external' : null)
}

/**
 * Visits that come from the résumé link (?utm_source=resume) get one extra lookup: the visitor's city,
 * state, PIN code and network owner (on an office network, that is usually the company's name), from
 * the free ipwho.is service. Sent once per visit as a `resume_visit` event; the IP address and exact
 * coordinates are never sent to Google Analytics.
 */
async function lookupResumeVisitor() {
  const q = new URLSearchParams(location.search)
  if (q.get('utm_source') !== 'resume') return
  try {
    if (sessionStorage.getItem('pa-resume-seen')) return
    sessionStorage.setItem('pa-resume-seen', '1')
  } catch { /* storage blocked: look up anyway */ }
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 5000)
    const r = await fetch('https://ipwho.is/?fields=success,city,region,postal,country,connection', { signal: ctrl.signal })
    clearTimeout(timer)
    const d = (await r.json()) as {
      success: boolean
      city?: string
      region?: string
      postal?: string
      country?: string
      connection?: { org?: string; isp?: string; domain?: string }
    }
    if (!d.success) throw new Error('lookup failed')
    track('resume_visit', {
      company: q.get('utm_campaign') ?? '(none)',
      city: d.city ?? '',
      region: d.region ?? '',
      postal: d.postal ?? '',
      country: d.country ?? '',
      network: (d.connection?.org || d.connection?.isp || '').slice(0, 100),
      network_domain: d.connection?.domain ?? '',
    })
  } catch {
    track('resume_visit', { company: q.get('utm_campaign') ?? '(none)', network: '(lookup failed)' })
  }
}

export function startAnalytics() {
  if (!enabled || window.gtag) return
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    // gtag expects the arguments object itself, not an array
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', MEASUREMENT_ID)

  const load = () => {
    const s = document.createElement('script')
    s.async = true
    s.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`
    document.head.appendChild(s)
  }
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback
  if (document.readyState === 'complete') (idle ? idle(load, { timeout: 3000 }) : setTimeout(load, 1500))
  else addEventListener('load', () => (idle ? idle(load, { timeout: 3000 }) : setTimeout(load, 1500)), { once: true })

  addEventListener(
    'click',
    (e) => {
      const a = (e.target as Element | null)?.closest?.('a')
      if (!a) return
      const target = linkTarget(a)
      if (target) track('link_click', { target })
    },
    { capture: true },
  )
  onTheme((t) => track('theme_change', { theme: t }))
  void lookupResumeVisitor()
}
