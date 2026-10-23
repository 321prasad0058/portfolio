// Snapshots real coding activity into src/data/activity.json:
//   • GitHub contribution calendars of both accounts (public contributions API)
//   • LeetCode submission calendar, solved counts, streak and badges (leetcode.com/graphql)
// LeetCode blocks browser requests (CORS), so the site ships this snapshot; `npm run build` refreshes it.
// --soft: keep the existing snapshot if the network is unavailable.
import { readFile, writeFile } from 'node:fs/promises'

const GH = ['321prasad0058', 'fl-prasad-alai']
const LC = 'Prasad_2472'
const soft = process.argv.includes('--soft')
const out = new URL('../src/data/activity.json', import.meta.url)

const lc = async (query, variables) => {
  const res = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com' },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`leetcode: HTTP ${res.status}`)
  const j = await res.json()
  if (j.errors) throw new Error(`leetcode: ${j.errors[0].message}`)
  return j.data
}

try {
  const github = {}
  for (const user of GH) {
    const res = await fetch(`https://github-contributions-api.jogruber.de/v4/${user}?y=all`)
    if (!res.ok) throw new Error(`${user}: HTTP ${res.status}`)
    for (const { date, count } of (await res.json()).contributions) if (count) github[date] = (github[date] ?? 0) + count
  }

  const profile = await lc(
    `query($u:String!){ matchedUser(username:$u){ profile{ ranking } submitStatsGlobal{ acSubmissionNum{ difficulty count } }
      badges{ displayName } userCalendar{ activeYears } languageProblemCount{ languageName problemsSolved } } }`,
    { u: LC },
  )
  const u = profile.matchedUser
  const leetcode = {}
  let maxStreak = 0
  for (const year of u.userCalendar.activeYears) {
    const { matchedUser } = await lc(`query($u:String!,$y:Int){ matchedUser(username:$u){ userCalendar(year:$y){ streak submissionCalendar } } }`, { u: LC, y: year })
    maxStreak = Math.max(maxStreak, matchedUser.userCalendar.streak)
    for (const [ts, n] of Object.entries(JSON.parse(matchedUser.userCalendar.submissionCalendar))) {
      const d = new Date(Number(ts) * 1000).toISOString().slice(0, 10)
      leetcode[d] = (leetcode[d] ?? 0) + n
    }
  }
  const solved = Object.fromEntries(u.submitStatsGlobal.acSubmissionNum.map((x) => [x.difficulty.toLowerCase(), x.count]))
  const data = {
    fetchedAt: new Date().toISOString(),
    github: { users: GH, days: github },
    leetcode: {
      user: LC,
      days: leetcode,
      solved,
      maxStreak,
      ranking: u.profile.ranking,
      badges: u.badges.map((b) => b.displayName),
      languages: u.languageProblemCount.sort((a, b) => b.problemsSolved - a.problemsSolved).slice(0, 3),
    },
  }
  await writeFile(out, JSON.stringify(data) + '\n')
  console.log(`activity: github ${Object.keys(github).length} days, leetcode ${Object.keys(leetcode).length} days, ${solved.all} solved`)
} catch (err) {
  if (!soft) throw err
  await readFile(out).catch(() => { throw err })
  console.warn(`activity: kept the existing snapshot (${err.message})`)
}
