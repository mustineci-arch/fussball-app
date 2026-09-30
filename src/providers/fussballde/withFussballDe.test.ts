import { describe, expect, it } from 'vitest'
import { MockProvider } from '../mock/MockProvider'
import type { FdeData } from './types'
import { withFussballDe } from './withFussballDe'

const data: FdeData = {
  updatedAt: '2026-09-30T12:00:00Z',
  competitions: [
    {
      id: 'fde-liga',
      name: 'U13-Kreisliga',
      shortName: 'U13-KL',
      region: 'Hamburg',
      season: '2026/27',
      teams: [
        { id: 'fde-a', name: 'Team A', sourceUrl: 'https://www.fussball.de/mannschaft/a' },
        { id: 'fde-b', name: 'Team B' },
      ],
      table: [
        { teamId: 'fde-b', rank: 2, played: 1, won: 0, drawn: 0, lost: 1, goalsFor: 1, goalsAgainst: 3, points: 0 },
        { teamId: 'fde-a', rank: 1, played: 1, won: 1, drawn: 0, lost: 0, goalsFor: 3, goalsAgainst: 1, points: 3 },
      ],
      matches: [
        { id: 'fde-m1', kickoffAt: '2026-09-12T08:00:00Z', homeTeamId: 'fde-a', awayTeamId: 'fde-b', score: { home: 3, away: 1 } },
        { id: 'fde-m2', kickoffAt: '2026-10-10T08:00:00Z', homeTeamId: 'fde-b', awayTeamId: 'fde-a' },
      ],
    },
  ],
}

const provider = withFussballDe(new MockProvider(), async () => data)

describe('withFussballDe', () => {
  it('ergänzt die Liga und lässt den Basisanbieter unverändert', async () => {
    const all = await provider.getCompetitions()
    const base = await new MockProvider().getCompetitions()
    expect(all).toHaveLength(base.length + 1)
    expect(all.at(-1)).toMatchObject({ id: 'fde-liga', type: 'league', country: 'Hamburg' })
  })

  it('liefert Tabelle, Spiele und Teams der Liga', async () => {
    const [table] = await provider.getStandings('fde-liga')
    expect(table?.rows.map((r) => [r.rank, r.team.name])).toEqual([
      [1, 'Team A'],
      [2, 'Team B'],
    ])
    const fixtures = await provider.getSeasonFixtures('fde-liga')
    expect(fixtures.map((f) => f.status)).toEqual(['finished', 'scheduled'])
    const { competitionIds } = await provider.getTeam('fde-b')
    expect(competitionIds).toEqual(['fde-liga'])
    expect(await provider.getTeamFixtures('fde-b')).toHaveLength(2)
  })

  it('reicht den Link zur fussball.de-Seite durch', async () => {
    expect((await provider.getTeam('fde-a')).team.externalUrl).toBe('https://www.fussball.de/mannschaft/a')
    expect((await provider.getTeam('fde-b')).team.externalUrl).toBeUndefined()
  })

  it('findet Teams in der Suche', async () => {
    const results = await provider.search('team a')
    expect(results.teams.map((t) => t.id)).toContain('fde-a')
  })

  it('funktioniert weiter, wenn die Zusatzdaten fehlen', async () => {
    const broken = withFussballDe(new MockProvider(), () => Promise.reject(new Error('offline')))
    expect((await broken.getCompetitions()).length).toBeGreaterThan(0)
  })
})
