import type { Competition, Fixture, Id } from '../../domain/types'

export interface FixtureGroup {
  competition: Competition
  fixtures: Fixture[]
}

/**
 * Gruppiert Spiele nach Wettbewerb.
 * Sortierung: favorisierte Wettbewerbe zuerst, dann nach Wettbewerbs-Priorität; innerhalb nach Anstoß.
 * Spiele unbekannter Wettbewerbe werden ausgelassen (statt einen Wettbewerb zu erfinden).
 */
export function groupFixturesByCompetition(
  fixtures: readonly Fixture[],
  competitions: readonly Competition[],
  favoriteCompetitionIds: ReadonlySet<Id> = new Set(),
): FixtureGroup[] {
  const byId = new Map(competitions.map((c) => [c.id, c]))
  const groups = new Map<Id, FixtureGroup>()

  for (const fixture of fixtures) {
    const competition = byId.get(fixture.competitionId)
    if (!competition) continue
    const group = groups.get(competition.id) ?? { competition, fixtures: [] }
    group.fixtures.push(fixture)
    groups.set(competition.id, group)
  }

  const rank = (c: Competition) => (favoriteCompetitionIds.has(c.id) ? -1000 : 0) + c.priority
  return [...groups.values()]
    .sort((a, b) => rank(a.competition) - rank(b.competition))
    .map((g) => ({ ...g, fixtures: g.fixtures.sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt)) }))
}
