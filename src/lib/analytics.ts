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

// The landing URL as the visitor opened it, captured before the tracking tags are tidied away
const landingHref = typeof window === 'undefined' ? '' : location.href
const landingQuery = typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(location.search)

/** Remove utm_* tags from the address bar (they are only for attribution, not for the visitor to see). */
function cleanAddressBar() {
  const url = new URL(location.href)
  const tags = [...url.searchParams.keys()].filter((k) => k.startsWith('utm_'))
  if (!tags.length) return
  tags.forEach((k) => url.searchParams.delete(k))
  history.replaceState(history.state, '', url.pathname + url.search + url.hash)
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
    [/github\.com\/[^/]+\/SahiCar/i, 'sahicar_code'],
    [/github\.com/, 'github'],
    [/kosha-ai\.web\.app/, 'kosha_live'],
    [/vana-mind\.vercel\.app/, 'vana_live'],
    [/sahicar-in\.web\.app/, 'sahicar_live'],
    [/flexiloans\.com\/flexy/, 'flexy_live'],
    [/flexiloans\.com\/credit-score/, 'credit_score_live'],
    [/flexiloans\.com/, 'flexiloans'],
    [/hashnode\.dev/, 'blog'],
    [/coursera\.org/, 'certificate'],
  ]
  return rules.find(([re]) => re.test(href))?.[1] ?? (/^https?:/.test(href) ? 'other_external' : null)
}

/** Which tracked source this visit came from: the résumé link, or LinkedIn (tagged link or referrer). */
function lookupSource(): 'resume' | 'linkedin' | null {
  const src = landingQuery.get('utm_source')
  if (src === 'resume') return 'resume'
  if (src === 'linkedin') return 'linkedin'
  // untagged clicks from LinkedIn (a post, a message) — when the browser says where the visitor came from
  if (!src && /(^|\.)(linkedin\.com|lnkd\.in)$/.test(referrerHost())) return 'linkedin'
  return null
}

function referrerHost() {
  try {
    return document.referrer ? new URL(document.referrer).hostname : ''
  } catch {
    return ''
  }
}

/**
 * Visits from the résumé link or from LinkedIn get one extra lookup: the visitor's city, state, PIN
 * code and network owner (on an office network, that is usually the company's name), from the free
 * ipwho.is service. Sent once per visit as `resume_visit` or `linkedin_visit`; the IP address and exact
 * coordinates are never sent to Google Analytics.
 */
async function lookupVisitor() {
  const source = lookupSource()
  if (!source) return
  const event = `${source}_visit`
  try {
    if (sessionStorage.getItem(`pa-${source}-seen`)) return
    sessionStorage.setItem(`pa-${source}-seen`, '1')
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
    track(event, {
      city: d.city ?? '',
      region: d.region ?? '',
      postal: d.postal ?? '',
      country: d.country ?? '',
      network: (d.connection?.org || d.connection?.isp || '').slice(0, 100),
      network_domain: d.connection?.domain ?? '',
    })
  } catch {
    track(event, { network: '(lookup failed)' })
  }
}

export function startAnalytics() {
  if (!enabled || window.gtag) {
    cleanAddressBar()
    return
  }
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    // gtag expects the arguments object itself, not an array
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments)
  }
  window.gtag('js', new Date())
  // credit the visit with the original link (UTM tags included), then tidy the address bar
  window.gtag('config', MEASUREMENT_ID, { page_location: landingHref })
  cleanAddressBar()

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
  void lookupVisitor()
}
