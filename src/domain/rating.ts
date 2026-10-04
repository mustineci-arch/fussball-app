/**
 * Spielerbewertung (Note 1–10, wie bei gängigen Fußball-Apps: höher = besser).
 * Die Datenquelle liefert keine fertigen Bewertungen – die Note wird transparent aus den
 * gelieferten Einzelwerten berechnet und in der UI als eigene Berechnung gekennzeichnet.
 */
import type { Lineup, LineupPlayer, PlayerMatchStats } from './types'

const BASE = 6.0
const MIN = 3.0
const MAX = 10.0

export type MatchOutcome = 'win' | 'draw' | 'loss'

export interface RatingInput {
  entry: LineupPlayer
  /** Ergebnis aus Sicht des Spielerteams */
  outcome?: MatchOutcome
  /** Gegentore des Teams – für Weiße Weste */
  teamConceded?: number
}


/**
 * Note eines Spielers. undefined, wenn keine Einzelwerte vorliegen – dann wird nichts angezeigt.
 */
export function ratePlayer({ entry, outcome, teamConceded }: RatingInput): number | undefined {
  const s: PlayerMatchStats | undefined = entry.stats
  if (!s) return undefined
  const n = (v?: number) => v ?? 0
  const position = entry.player.position
  // Eingewechselte spielen weniger – kleinere Ausschläge bei Mannschaftswerten
  const share = entry.subbedIn ? 0.5 : 1

  let r = BASE
  r += n(s.goals) * (position === 'DF' || position === 'GK' ? 1.2 : 1.0)
  r += n(s.assists) * 0.7
  r += n(s.shotsOnTarget) * 0.2
  r += Math.max(0, n(s.shots) - n(s.shotsOnTarget)) * 0.05
  r += Math.min(n(s.foulsSuffered), 5) * 0.08
  r -= n(s.foulsCommitted) * 0.1
  r -= n(s.offsides) * 0.05
  r -= n(s.yellowCards) * 0.4
  r -= n(s.redCards) * 1.5
  r -= n(s.ownGoals) * 1.0

  if (position === 'GK') {
    r += n(s.saves) * 0.3
    r -= n(s.goalsConceded) * 0.35
  }
  if (teamConceded === 0 && !entry.subbedOut && !entry.subbedIn) {
    if (position === 'GK') r += 0.6
    else if (position === 'DF') r += 0.4
  }
  if (outcome === 'win') r += 0.3 * share
  if (outcome === 'loss') r -= 0.3 * share

  return Math.round(Math.min(MAX, Math.max(MIN, r)) * 10) / 10
}

/** Farbstufe einer Note – wie in gängigen Apps (rot → orange → gelb → grün → blau) */
export type RatingTier = 'poor' | 'weak' | 'average' | 'good' | 'great'

export function ratingTier(rating: number): RatingTier {
  if (rating >= 8.0) return 'great'
  if (rating >= 7.0) return 'good'
  if (rating >= 6.5) return 'average'
  if (rating >= 6.0) return 'weak'
  return 'poor'
}

export interface RatedPlayer {
  entry: LineupPlayer
  rating: number
  starter: boolean
}

/** Noten aller eingesetzten Spieler eines Teams, beste zuerst */
export function rateLineup(lineup: Lineup | undefined, goalsFor?: number, goalsAgainst?: number): RatedPlayer[] {
  if (!lineup) return []
  const outcome: MatchOutcome | undefined =
    goalsFor === undefined || goalsAgainst === undefined ? undefined : goalsFor > goalsAgainst ? 'win' : goalsFor < goalsAgainst ? 'loss' : 'draw'
  const played = [
    ...lineup.starters.map((entry) => ({ entry, starter: true })),
    ...lineup.substitutes.filter((e) => e.subbedIn).map((entry) => ({ entry, starter: false })),
  ]
  return played
    .flatMap(({ entry, starter }) => {
      const rating = ratePlayer({ entry, outcome, teamConceded: goalsAgainst })
      return rating === undefined ? [] : [{ entry, rating, starter }]
    })
    .sort((a, b) => b.rating - a.rating)
}
