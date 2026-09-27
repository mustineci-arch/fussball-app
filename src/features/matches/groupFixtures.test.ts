import { describe, expect, it } from 'vitest'
import type { Competition, Fixture } from '../../domain/types'
import { groupFixturesByCompetition } from './groupFixtures'

const comp = (id: string, priority: number): Competition => ({ id, slug: id, name: id, shortName: id, type: 'league', priority })
const team = { id: 't', slug: 't', name: 'T', shortName: 'T' }
const fixture = (id: string, competitionId: string, kickoffAt: string): Fixture => ({
  id,
  competitionId,
  kickoffAt,
  status: 'scheduled',
  homeTeam: team,
  awayTeam: team,
})

describe('groupFixturesByCompetition', () => {
  const competitions = [comp('a', 2), comp('b', 1)]
  const fixtures = [
    fixture('1', 'a', '2026-09-27T18:00:00Z'),
    fixture('2', 'b', '2026-09-27T20:00:00Z'),
    fixture('3', 'b', '2026-09-27T15:00:00Z'),
    fixture('4', 'unbekannt', '2026-09-27T15:00:00Z'),
  ]

  it('sortiert nach Priorität und Anstoß und verwirft unbekannte Wettbewerbe', () => {
    const groups = groupFixturesByCompetition(fixtures, competitions)
    expect(groups.map((g) => g.competition.id)).toEqual(['b', 'a'])
    expect(groups[0]?.fixtures.map((f) => f.id)).toEqual(['3', '2'])
  })

  it('stellt favorisierte Wettbewerbe nach oben', () => {
    const groups = groupFixturesByCompetition(fixtures, competitions, new Set(['a']))
    expect(groups.map((g) => g.competition.id)).toEqual(['a', 'b'])
  })
})
