import { describe, expect, it } from 'vitest'
import { todayKey } from '../../domain/date'
import { isLive } from '../../domain/status'
import { NotFoundError } from '../errors'
import { MockProvider } from './MockProvider'

const provider = new MockProvider()

describe('MockProvider', () => {
  it('liefert heute Spiele, darunter laufende', async () => {
    const fixtures = await provider.getFixturesByDate(todayKey())
    expect(fixtures.length).toBeGreaterThan(5)
    expect(fixtures.some((f) => isLive(f.status))).toBe(true)
  })

  it('erzeugt konsistente Spieldetails', async () => {
    const [fixture] = (await provider.getFixturesByDate(todayKey())).filter((f) => isLive(f.status))
    expect(fixture).toBeDefined()
    const details = await provider.getFixtureDetails(fixture!.id)

    expect(details.lineups?.home?.starters).toHaveLength(11)
    expect(details.lineups?.away?.starters).toHaveLength(11)

    const goals = (teamId: string) =>
      details.events?.filter((e) => ['goal', 'own_goal', 'penalty_goal'].includes(e.type) && e.teamId === teamId).length
    expect(details.fixture.score?.home).toBe(goals(details.fixture.homeTeam.id))
    expect(details.fixture.score?.away).toBe(goals(details.fixture.awayTeam.id))
  })

  it('berechnet eine plausible Tabelle', async () => {
    const [table] = await provider.getStandings('c-bundesliga')
    expect(table?.rows).toHaveLength(8)
    for (const row of table!.rows) {
      expect(row.won + row.drawn + row.lost).toBe(row.played)
      expect(row.points).toBe(row.won * 3 + row.drawn)
    }
    const ranks = table!.rows.map((r) => r.rank)
    expect(ranks).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('wirft NotFoundError für unbekannte IDs', async () => {
    await expect(provider.getFixtureDetails('gibt-es-nicht')).rejects.toBeInstanceOf(NotFoundError)
    await expect(provider.getTeam('gibt-es-nicht')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('findet Einträge unabhängig von Sonderzeichen', async () => {
    const results = await provider.search('bogazici')
    expect(results.teams.map((t) => t.name)).toContain('Boğaziçi SK')
  })
})
