// Dark ("night shift") or light (a painted, Ghibli-inspired daytime sky). Stored per visitor; the
// first visit always starts dark.
export type Theme = 'dark' | 'light'

const KEY = 'pa-theme'

function initial(): Theme {
  try {
    const q = new URLSearchParams(location.search).get('theme')
    if (q === 'dark' || q === 'light') return q
    const s = localStorage.getItem(KEY)
    if (s === 'dark' || s === 'light') return s
  } catch { /* storage blocked */ }
  return 'dark' // first visit always opens at night; daylight is one click away
}

let theme: Theme = initial()
const subs = new Set<(t: Theme) => void>()
document.documentElement.dataset.theme = theme

export const getTheme = () => theme
export function setTheme(t: Theme) {
  if (t === theme) return
  theme = t
  document.documentElement.dataset.theme = t
  try { localStorage.setItem(KEY, t) } catch { /* storage blocked */ }
  subs.forEach((f) => f(t))
}
export function onTheme(fn: (t: Theme) => void) {
  subs.add(fn)
  return () => void subs.delete(fn)
}
