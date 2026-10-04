import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setLanguage } from '../i18n'
import { CombinedProvider, TURKISH_CUP_ID } from './CombinedProvider'
import type { EspnProvider } from './espn/EspnProvider'
import league from './fotmob/__fixtures__/cup-league.json'
import cupMatch from './fotmob/__fixtures__/cup-match-finished.json'

const espnTeam = (id: string, name: string) => ({ id, slug: name.toLowerCase(), name, shortName: name })
const espnFixture = { id: '1', competitionId: 'c-super-lig', kickoffAt: '2026-05-22T15:00:00.000Z', status: 'finished' as const, homeTeam: espnTeam('432', 'Galatasaray'), awayTeam: espnTeam('436', 'Fenerbahçe') }

function stubEspn() {
  return {
    topPlayerCategories: ['goals', 'assists'],
    getCompetitions: vi.fn(async () => [{ id: 'c-super-lig', slug: 'super-lig', name: 'Süper Lig', shortName: 'Süper Lig', type: 'league', priority: 1 }, { id: 'c-bundesliga', slug: 'bundesliga', name: 'Bundesliga', shortName: 'Bundesliga', type: 'league', priority: 2 }]),
    getCompetitionTeams: vi.fn(async () => [espnTeam('432', 'Galatasaray'), espnTeam('436', 'Fenerbahçe'), espnTeam('997', 'Trabzonspor'), espnTeam('7914', 'İstanbul Başakşehir')]),
    getFixturesByDate: vi.fn(async () => [espnFixture]),
    getTeamFixtures: vi.fn(async () => [espnFixture]),
    getFixtureDetails: vi.fn(),
  } as unknown as EspnProvider
}

beforeEach(() => {
  setLanguage('de')
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const body = url.includes('/leagues?') ? league : url.includes('/matchDetails?') ? cupMatch : undefined
    return new Response(JSON.stringify(body ?? {}), { status: body ? 200 : 404 })
  }))
})
afterEach(() => vi.unstubAllGlobals())

describe('CombinedProvider', () => {
  it('führt den türkischen Pokal direkt nach der Süper Lig', async () => {
    const p = new CombinedProvider(stubEspn())
    const list = await p.getCompetitions()
    expect(list.map((c) => c.id)).toEqual(['c-super-lig', TURKISH_CUP_ID, 'c-bundesliga'])
  })

  it('ergänzt Pokalspiele in der Tagesliste und ordnet bekannte Teams ESPN zu', async () => {
    const p = new CombinedProvider(stubEspn())
    const day = await p.getFixturesByDate('2026-05-22')
    const final = day.find((f) => f.id === 'fm-5237912')!
    expect(day).toContainEqual(espnFixture)
    expect(final.competitionId).toBe(TURKISH_CUP_ID)
    expect(final.homeTeam.id).toBe('997') // Trabzonspor → ESPN
    expect(final.awayTeam.id).toBe('fmt-8622') // Konyaspor kennt der ESPN-Stub nicht
  })

  it('zeigt Pokalspiele auf der Seite türkischer Teams', async () => {
    const p = new CombinedProvider(stubEspn())
    const fixtures = await p.getTeamFixtures('997')
    expect(fixtures.some((f) => f.id === 'fm-5237912')).toBe(true)
    expect(fixtures).toContainEqual(espnFixture)
  })

  it('liest Spieldetails und Tabellen aus FotMob', async () => {
    const p = new CombinedProvider(stubEspn())
    const details = await p.getFixtureDetails('fm-5237912')
    expect(details.fixture.homeTeam.id).toBe('997')
    expect(details.lineups?.home?.starters).toHaveLength(11)
    const tables = await p.getStandings(TURKISH_CUP_ID)
    expect(tables).toHaveLength(3)
    expect(tables[0]!.rows[0]!.team.id).toBe('432')
    expect(tables[0]!.rows.find((r) => r.team.name.includes('Başakşehir'))?.team.id).toBe('7914')
  })

  it('liefert für den Pokal keine Bestenlisten statt eines Fehlers', async () => {
    const p = new CombinedProvider(stubEspn())
    await expect(p.getTopPlayers(TURKISH_CUP_ID, 'goals')).resolves.toEqual([])
  })
})
