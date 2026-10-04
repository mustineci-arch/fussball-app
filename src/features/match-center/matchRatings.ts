import { rateLineup } from '../../domain/rating'
import type { FixtureDetails, Lineup, LineupPlayer, PlayerMatchStats, PlayerPosition } from '../../domain/types'
import { findPlayer, type FmMatch, type FmMatchPlayer } from '../../providers/fotmob/fotmob'

export interface RatingRow {
  key: string
  /** Spieler-ID der Hauptquelle – nur wenn zugeordnet (dann mit Profil-Link) */
  playerId?: string
  name: string
  shirtNumber?: number
  position?: PlayerPosition
  rating: number
  starter: boolean
  stats?: PlayerMatchStats
}

export interface MatchRatings {
  /** fotmob = Noten von FotMob; computed = eigene Berechnung aus den Einzelwerten */
  source: 'fotmob' | 'computed'
  home: RatingRow[]
  away: RatingRow[]
  bestKey?: string
  /** Noten je Spieler-ID der Hauptquelle – für Aufstellung und Bank */
  byPlayerId: Map<string, number>
}

const lineupEntries = (lineup: Lineup | undefined) =>
  lineup ? [...lineup.starters, ...lineup.substitutes].map((e) => ({ entry: e, name: e.player.name, shirtNumber: e.shirtNumber })) : []

function fotmobRows(players: FmMatchPlayer[], lineup: Lineup | undefined, side: string): RatingRow[] {
  const entries = lineupEntries(lineup)
  return players
    .filter((p) => p.rating !== undefined && (p.starter || p.subbedIn))
    .map((p, i): RatingRow => {
      const entry: LineupPlayer | undefined = findPlayer(p, entries)?.entry
      return {
        key: `${side}-${entry?.player.id ?? `${p.name}-${i}`}`,
        playerId: entry?.player.id,
        name: entry?.player.name ?? p.name,
        shirtNumber: p.shirtNumber ?? entry?.shirtNumber,
        position: entry?.player.position,
        rating: p.rating as number,
        starter: p.starter,
        stats: entry?.stats,
      }
    })
    .sort((a, b) => b.rating - a.rating)
}

/** Noten eines Spiels: bevorzugt FotMob, sonst eigene Berechnung aus den Einzelwerten der Hauptquelle */
export function buildMatchRatings(details: FixtureDetails, fm: FmMatch | null | undefined): MatchRatings | undefined {
  const { fixture, lineups } = details
  if (fm) {
    const home = fotmobRows(fm.home.players, lineups?.home, 'h')
    const away = fotmobRows(fm.away.players, lineups?.away, 'a')
    if (home.length + away.length > 0) {
      const all = [...home, ...away]
      const potm = [...fm.home.players, ...fm.away.players].find((p) => p.playerOfTheMatch)
      const best = (potm && all.find((r) => r.name === potm.name || findPlayer(potm, [r]))) ?? [...all].sort((a, b) => b.rating - a.rating)[0]
      return {
        source: 'fotmob',
        home,
        away,
        bestKey: best?.key,
        byPlayerId: new Map(all.flatMap((r) => (r.playerId ? [[r.playerId, r.rating] as const] : []))),
      }
    }
  }

  const score = fixture.status === 'scheduled' ? undefined : fixture.score
  const toRows = (lineup: Lineup | undefined, side: string, gf?: number, ga?: number) =>
    rateLineup(lineup, gf, ga).map(
      (r): RatingRow => ({
        key: `${side}-${r.entry.player.id}`,
        playerId: r.entry.player.id,
        name: r.entry.player.name,
        shirtNumber: r.entry.shirtNumber,
        position: r.entry.player.position,
        rating: r.rating,
        starter: r.starter,
        stats: r.entry.stats,
      }),
    )
  const home = toRows(lineups?.home, 'h', score?.home, score?.away)
  const away = toRows(lineups?.away, 'a', score?.away, score?.home)
  if (home.length + away.length === 0) return undefined
  const all = [...home, ...away]
  return {
    source: 'computed',
    home,
    away,
    bestKey: [...all].sort((a, b) => b.rating - a.rating)[0]?.key,
    byPlayerId: new Map(all.map((r) => [r.playerId as string, r.rating])),
  }
}
