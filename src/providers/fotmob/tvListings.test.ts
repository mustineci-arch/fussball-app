import { describe, expect, it } from 'vitest'
import { channelUrl } from '../../tv/broadcasts'
import { broadcastsForFixture, mapTvListings, type RawTvListings } from './tvListings'

// Aufbau wie die echte FotMob-Antwort (gekürzt), Spiel Hoffenheim – HSV
const raw: RawTvListings = {
  '5881183': [
    {
      startTime: '/Date(1791639000000)/',
      qualifiers: ['Live'],
      station: { name: 'Sky Bundesliga 2', callSign: 'Sky Bundesliga 2', type: 'TV' },
      matchId: 5881183,
      program: { teams: [{ name: 'Hoffenheim', isHome: true }, { name: 'Hamburger SV', isHome: false }] },
    },
    { startTime: '/Date(1791639000000)/', qualifiers: ['Live'], station: { name: 'WOW', type: 'Stream' }, matchId: 5881183, program: { teams: [{ name: 'Hoffenheim', isHome: true }, { name: 'Hamburger SV', isHome: false }] } },
    { startTime: '/Date(1791639000000)/', qualifiers: ['Highlights'], station: { name: 'Sportschau', type: 'TV' }, matchId: 5881183, program: { teams: [{ name: 'Hoffenheim', isHome: true }, { name: 'Hamburger SV', isHome: false }] } },
  ],
}

const team = (id: string, name: string, shortName = name) => ({ id, slug: id, name, shortName })

describe('FotMob-Senderlisten', () => {
  const listings = mapTvListings(raw, 'DE')

  it('liest Sender, Art und Anstoß – nur Live-Übertragungen', () => {
    expect(listings).toHaveLength(1)
    expect(listings[0]).toMatchObject({ matchId: '5881183', home: 'Hoffenheim', away: 'Hamburger SV', kickoff: 1791639000000 })
    expect(listings[0]!.broadcasts).toEqual([
      { name: 'Sky Bundesliga 2', country: 'DE', kind: 'tv' },
      { name: 'WOW', country: 'DE', kind: 'stream' },
    ])
  })

  it('ordnet ESPN-Spiele über Anstoß und Teamnamen zu', () => {
    const fixture = {
      id: '401861200',
      competitionId: 'c-bundesliga',
      kickoffAt: new Date(1791639000000).toISOString(),
      status: 'scheduled' as const,
      homeTeam: team('7911', 'TSG Hoffenheim', 'Hoffenheim'),
      awayTeam: team('127', 'Hamburger SV', 'HSV'),
    }
    expect(broadcastsForFixture(fixture, listings).map((b) => b.name)).toEqual(['Sky Bundesliga 2', 'WOW'])
    // anderer Tag → keine Zuordnung
    expect(broadcastsForFixture({ ...fixture, kickoffAt: '2026-11-01T14:30:00Z' }, listings)).toEqual([])
    // FotMob-Spiel direkt über die ID
    expect(broadcastsForFixture({ ...fixture, id: 'fm-5881183', homeTeam: team('x', 'Anders'), awayTeam: team('y', 'Name') }, listings)).toHaveLength(2)
  })

  it('findet die offizielle Seite auch bei abweichenden Sendernamen', () => {
    expect(channelUrl('Sky Bundesliga 2', 'DE')).toBe('https://www.sky.de/sport')
    expect(channelUrl('Sky Sport Bundesliga 2', 'AT')).toBe('https://sport.sky.at')
    expect(channelUrl('Viaplay NL', 'NL')).toBe('https://viaplay.com')
    expect(channelUrl('Peacock (Español)', 'US')).toBe('https://www.peacocktv.com')
    expect(channelUrl('Unbekannter Sender', 'DE')).toBeUndefined()
  })
})
