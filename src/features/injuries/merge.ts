import type { Player } from '../../domain/types'
import { findPlayer, type FmSquadPlayer } from '../../providers/fotmob/fotmob'

/** Kennzeichen für Spieler, die nur die Zusatzquelle kennt – für sie gibt es keine Profilseite */
export const EXTERNAL_PREFIX = 'fm-'
export const hasProfile = (p: Pick<Player, 'id'>) => !p.id.startsWith(EXTERNAL_PREFIX)

/**
 * Kader der Hauptquelle + Verletzungen der Zusatzquelle.
 * Verletzte, die der Kader der Hauptquelle nicht kennt, kommen als eigene Einträge dazu.
 */
export function withInjuries(squad: Player[] | undefined, extras: FmSquadPlayer[] | undefined): Player[] {
  const base = squad ?? []
  const fm = extras ?? []
  const used = new Set<number>()
  const merged = base.map((p) => {
    const match = findPlayer(p, fm)
    if (match) used.add(match.id)
    return match?.injury && !p.injury ? { ...p, injury: match.injury } : p
  })
  const extraInjured = fm
    .filter((m) => m.injury && !used.has(m.id))
    .map((m): Player => ({ id: `${EXTERNAL_PREFIX}${m.id}`, slug: '', name: m.name, shirtNumber: m.shirtNumber, injury: m.injury }))
  return [...merged, ...extraInjured]
}

/** Saisonnoten je Spieler-ID der Hauptquelle */
export function seasonRatings(squad: Player[] | undefined, extras: FmSquadPlayer[] | undefined): Map<string, number> {
  const fm = extras ?? []
  return new Map(
    (squad ?? []).flatMap((p) => {
      const rating = findPlayer(p, fm)?.seasonRating
      return rating ? [[p.id, rating] as const] : []
    }),
  )
}
