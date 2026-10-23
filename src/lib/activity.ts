import snap from '../data/activity.json'

// Real coding activity, day by day: GitHub contributions (two accounts) and LeetCode submissions.
// The LeetCode half comes from the build-time snapshot (its API refuses browsers); GitHub refreshes live.
export type Source = 'all' | 'github' | 'leetcode'

export type Activity = {
  fetchedAt: string
  github: { users: string[]; days: Record<string, number> }
  leetcode: {
    user: string
    days: Record<string, number>
    solved: { all: number; easy: number; medium: number; hard: number }
    maxStreak: number
    ranking: number
    badges: string[]
    languages: { languageName: string; problemsSolved: number }[]
  }
}

export type Cell = { date: string; gh: number; lc: number; count: number; level: number }
export type Calendar = { weeks: Cell[][]; total: number }

export const snapshot = snap as Activity

const iso = (d: Date) => d.toISOString().slice(0, 10)
const addDays = (d: Date, n: number) => {
  const x = new Date(d)
  x.setUTCDate(x.getUTCDate() + n)
  return x
}
const today = () => new Date(`${iso(new Date())}T00:00:00Z`)

export function count(a: Activity, date: string, src: Source) {
  const gh = a.github.days[date] ?? 0
  const lc = a.leetcode.days[date] ?? 0
  return src === 'github' ? gh : src === 'leetcode' ? lc : gh + lc
}

/** Refresh the GitHub half live; keep the snapshot if that fails. */
export async function refresh(a: Activity): Promise<Activity> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 6000)
    const res = await Promise.all(
      a.github.users.map((u) =>
        fetch(`https://github-contributions-api.jogruber.de/v4/${u}?y=last`, { signal: ctrl.signal }).then((r) => {
          if (!r.ok) throw new Error(String(r.status))
          return r.json() as Promise<{ contributions: { date: string; count: number }[] }>
        }),
      ),
    )
    clearTimeout(timer)
    const days = { ...a.github.days }
    const fresh: Record<string, number> = {}
    for (const { contributions } of res) for (const { date, count } of contributions) if (count) fresh[date] = (fresh[date] ?? 0) + count
    // live data only ever adds: a day keeps the higher of the snapshot and the fresh count
    for (const [k, v] of Object.entries(fresh)) days[k] = Math.max(days[k] ?? 0, v)
    return { ...a, github: { ...a.github, days } }
  } catch {
    return a
  }
}

export type Stats = { windowDays: number; active: number; current: number; longest: number; github: number; leetcode: number }

/** The last `n` days: how many were active, streaks, and totals per source. */
export function stats(a: Activity, src: Source, n = 365): Stats {
  const end = today()
  let active = 0, github = 0, leetcode = 0
  for (let i = 0; i < n; i++) {
    const d = iso(addDays(end, -i))
    const gh = a.github.days[d] ?? 0
    const lc = a.leetcode.days[d] ?? 0
    github += gh
    leetcode += lc
    if (count(a, d, src) > 0) active++
  }
  // current streak: today may still be empty, so count back from yesterday in that case
  let current = 0
  let i = count(a, iso(end), src) > 0 ? 0 : 1
  while (count(a, iso(addDays(end, -i)), src) > 0) { current++; i++ }
  // longest streak, all time
  const keys = new Set([...(src !== 'leetcode' ? Object.keys(a.github.days) : []), ...(src !== 'github' ? Object.keys(a.leetcode.days) : [])])
  const sorted = [...keys].filter((k) => count(a, k, src) > 0).sort()
  let longest = 0, run = 0, prev = ''
  for (const k of sorted) {
    run = prev && iso(addDays(new Date(`${prev}T00:00:00Z`), 1)) === k ? run + 1 : 1
    longest = Math.max(longest, run)
    prev = k
  }
  return { windowDays: n, active, current, longest, github, leetcode }
}

export function years(a: Activity): string[] {
  const all = [...Object.keys(a.github.days), ...Object.keys(a.leetcode.days)].map((d) => d.slice(0, 4))
  return [...new Set(all)].sort()
}

/** The last `n` days of one source, oldest first (for the LeetCode helix). */
export function lastDays(a: Activity, src: Source, n = 365) {
  const end = today()
  return Array.from({ length: n }, (_, i) => count(a, iso(addDays(end, -(n - 1 - i))), src))
}

/** A GitHub-style 53 × 7 calendar: the last year, or one calendar year. */
export function calendar(a: Activity, src: Source, year?: string): Calendar {
  const end = year ? new Date(`${year}-12-31T00:00:00Z`) : today()
  const lastCol = addDays(end, 6 - end.getUTCDay())
  const start = addDays(lastCol, -53 * 7 + 1)
  const now = today()
  const weeks: Cell[][] = []
  const counts: number[] = []
  let total = 0
  for (let w = 0; w < 53; w++) {
    const col: Cell[] = []
    for (let d = 0; d < 7; d++) {
      const day = addDays(start, w * 7 + d)
      const key = iso(day)
      const inRange = (!year || key.startsWith(year)) && day <= end && day <= now
      const gh = inRange ? (src === 'leetcode' ? 0 : a.github.days[key] ?? 0) : 0
      const lc = inRange ? (src === 'github' ? 0 : a.leetcode.days[key] ?? 0) : 0
      const c = inRange ? gh + lc : -1
      if (c > 0) { counts.push(c); total += c }
      col.push({ date: key, gh, lc, count: c, level: 0 })
    }
    weeks.push(col)
  }
  counts.sort((x, y) => x - y)
  const q = (p: number) => counts[Math.min(counts.length - 1, Math.floor(p * counts.length))] ?? 1
  const [q1, q2, q3] = [q(0.25), q(0.5), q(0.75)]
  for (const col of weeks) for (const c of col) if (c.count > 0) c.level = c.count <= q1 ? 1 : c.count <= q2 ? 2 : c.count <= q3 ? 3 : 4
  return { weeks, total }
}
