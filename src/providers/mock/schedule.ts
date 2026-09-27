/** Erzeugt den Demo-Spielplan relativ zum heutigen Tag, inkl. einiger laufender Spiele. */
import { addDays, parseDateKey, todayKey } from '../../domain/date'
import type { Id } from '../../domain/types'
import { CUPS, LEAGUES, leagueTeams, type TeamRecord } from './catalog'
import { createRng } from './random'

export interface ScheduledFixture {
  id: Id
  competitionId: Id
  round: string
  kickoffAt: string
  home: TeamRecord
  away: TeamRecord
  postponed?: boolean
}

const DAY_RANGE = 14
const mod = (n: number, m: number) => ((n % m) + m) % m

/** Rundenturnier (Kreismethode) für eine gerade Anzahl Teams. */
export function roundRobinPairs<T>(teams: readonly T[], round: number): [T, T][] {
  const [fixed, ...rest] = teams
  if (fixed === undefined || teams.length % 2 !== 0) return []
  const rotated = rest.map((_, i) => rest[mod(i + round, rest.length)] as T)
  const circle = [fixed, ...rotated]
  const pairs: [T, T][] = []
  for (let i = 0; i < circle.length / 2; i++) {
    pairs.push([circle[i] as T, circle[circle.length - 1 - i] as T])
  }
  return pairs
}

function kickoff(dateKey: string, time: string): string {
  const date = parseDateKey(dateKey) ?? new Date()
  const [h = 0, m = 0] = time.split(':').map(Number)
  date.setHours(h, m, 0, 0)
  return date.toISOString()
}

const minutesAgo = (now: number, minutes: number) => new Date(now - minutes * 60_000).toISOString()

/** Heute laufende Demo-Spiele: [Liga-Slug, Slot, Minuten seit Anpfiff] */
const LIVE_TODAY: readonly [string, number, number][] = [
  ['super-lig', 0, 67],
  ['bundesliga', 0, 24],
  ['premier-league', 1, 52],
  ['serie-a', 0, 101],
]

export function buildSchedule(now = Date.now()): ScheduledFixture[] {
  const today = todayKey()
  const fixtures: ScheduledFixture[] = []

  for (let d = -DAY_RANGE; d <= DAY_RANGE; d++) {
    const dateKey = addDays(today, d)
    const busy = new Set<string>()

    for (const league of LEAGUES) {
      const teams = leagueTeams(league.competition.id)
      const roundIndex = d + 70
      const pairs = roundRobinPairs(teams, mod(roundIndex, 7))
      const daily = mod(d, 2) === 0 ? pairs.slice(0, 2) : pairs.slice(2, 4)
      const swap = Math.floor(roundIndex / 7) % 2 === 1

      daily.forEach(([a, b], slot) => {
        const [home, away] = swap ? [b, a] : [a, b]
        const live = d === 0 && LIVE_TODAY.find(([slug, s]) => slug === league.competition.slug && s === slot)
        busy.add(home.team.id).add(away.team.id)
        fixtures.push({
          id: `f-${league.competition.slug}-${dateKey}-${slot}`,
          competitionId: league.competition.id,
          round: `${Math.floor((d + DAY_RANGE) / 2) + 1}. Spieltag`,
          kickoffAt: live ? minutesAgo(now, live[2]) : kickoff(dateKey, league.kickoffTimes[slot] ?? '18:00'),
          home,
          away,
          postponed: d === 0 && league.competition.slug === 'la-liga' && slot === 1,
        })
      })
    }

    const cupDays: [typeof CUPS[keyof typeof CUPS], number[]][] = [
      [CUPS.championsLeague, [-7, -6, 0, 1, 7]],
      [CUPS.europaLeague, [-3, 2, 4]],
      [CUPS.conferenceLeague, [-3, 2]],
    ]
    for (const [cup, days] of cupDays) {
      if (!days.includes(d)) continue
      const rng = createRng(`${cup.id}:${dateKey}`)
      const free = LEAGUES.flatMap((l) => leagueTeams(l.competition.id)).filter((t) => !busy.has(t.team.id))
      for (let slot = 0; slot < 2 && free.length >= 2; slot++) {
        const home = free.splice(rng.int(0, free.length - 1), 1)[0]
        const away = free.splice(rng.int(0, free.length - 1), 1)[0]
        if (!home || !away) break
        busy.add(home.team.id).add(away.team.id)
        fixtures.push({
          id: `f-${cup.slug}-${dateKey}-${slot}`,
          competitionId: cup.id,
          round: 'Ligaphase',
          kickoffAt: kickoff(dateKey, slot === 0 ? '18:45' : '21:00'),
          home,
          away,
        })
      }
    }
  }

  return fixtures.sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt))
}
