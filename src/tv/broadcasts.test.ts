import { describe, expect, it } from 'vitest'
import type { Fixture } from '../domain/types'
import { bundesligaGermany, flagOf, tvInfoFor, tvWorldwide, TV_COUNTRIES } from './broadcasts'

const team = (id: string) => ({ id, slug: id, name: id, shortName: id })
const fixture = (competitionId: string, kickoffAt: string, home = '1', away = '2'): Fixture => ({
  id: 'f',
  competitionId,
  kickoffAt,
  status: 'scheduled',
  homeTeam: team(home),
  awayTeam: team(away),
})
const names = (info?: { channels: { name: string }[] }) => info?.channels.map((c) => c.name)

describe('Bundesliga in Deutschland (nach Anstoßzeit)', () => {
  // Anstoßzeiten in UTC – Oktober = Sommerzeit (UTC+2)
  it('Freitag 20:30 → Sky', () => {
    expect(names(bundesligaGermany({ kickoffAt: '2026-10-02T18:30:00Z' }))).toEqual(['Sky Sport', 'WOW'])
  })
  it('Samstag 15:30 → Sky (Einzelspiel) und DAZN (Konferenz)', () => {
    expect(names(bundesligaGermany({ kickoffAt: '2026-10-03T13:30:00Z' }))).toEqual(['Sky Sport', 'WOW', 'DAZN'])
  })
  it('Samstag 18:30 → Sky', () => {
    expect(names(bundesligaGermany({ kickoffAt: '2026-10-03T16:30:00Z' }))).toEqual(['Sky Sport', 'WOW'])
  })
  it('Sonntag → DAZN', () => {
    expect(names(bundesligaGermany({ kickoffAt: '2026-10-04T15:30:00Z' }))).toEqual(['DAZN'])
  })
  it('gilt auch im Winter (Normalzeit, UTC+1)', () => {
    expect(names(bundesligaGermany({ kickoffAt: '2026-12-05T14:30:00Z' }))).toEqual(['Sky Sport', 'WOW', 'DAZN'])
  })
})

describe('Nations League', () => {
  it('DFB-Heimspiel frei bei ARD/ZDF, Auswärtsspiel bei RTL', () => {
    const home = tvInfoFor(fixture('c-nations-league', '2026-09-27T18:45:00Z', '481', '999'), 'DE')
    expect(home?.channels.every((c) => c.free)).toBe(true)
    expect(names(tvInfoFor(fixture('c-nations-league', '2026-10-10T18:45:00Z', '999', '481'), 'DE'))).toEqual(['RTL', 'RTL+'])
  })
  it('nennt bei belegten Heimspielen den genauen Sender', () => {
    expect(names(tvInfoFor(fixture('c-nations-league', '2026-09-27T18:45:00Z', '481', '455'), 'DE'))).toEqual(['ARD'])
    expect(names(tvInfoFor(fixture('c-nations-league', '2026-10-01T18:45:00Z', '481', '6757'), 'DE'))).toEqual(['ZDF'])
  })
  it('macht bei anderen Spielen keine Angabe statt zu raten', () => {
    expect(tvInfoFor(fixture('c-nations-league', '2026-09-27T18:45:00Z', '10', '11'), 'DE')).toBeUndefined()
  })
})

describe('Türkei', () => {
  it('Champions League frei bei TRT, Süper Lig nur im Abo', () => {
    expect(tvInfoFor(fixture('c-champions-league', '2026-10-20T19:00:00Z'), 'TR')?.channels[0]).toMatchObject({ name: 'TRT', free: true })
    expect(tvInfoFor(fixture('c-super-lig', '2026-10-09T17:00:00Z'), 'TR')?.channels.every((c) => !c.free)).toBe(true)
  })
})

it('liefert nichts für Wettbewerbe ohne belegte Rechte (z. B. WM 2026/27)', () => {
  expect(tvInfoFor(fixture('c-world-cup', '2026-10-01T18:00:00Z'), 'DE')).toBeUndefined()
})

describe('Schauen: offizielle Links', () => {
  const base = { id: 'x', homeTeam: { id: '1', slug: 'a', name: 'A', shortName: 'A' }, awayTeam: { id: '2', slug: 'b', name: 'B', shortName: 'B' } }

  it('verlinkt jeden Sender auf ein offizielles https-Angebot', () => {
    const fixtures = ['c-bundesliga', 'c-super-lig', 'c-premier-league', 'c-champions-league', 'c-europa-league', 'c-la-liga'].map((competitionId) => ({
      ...base,
      competitionId,
      kickoffAt: '2026-10-10T13:30:00Z',
      status: 'scheduled' as const,
    }))
    for (const country of TV_COUNTRIES) {
      for (const f of fixtures) {
        for (const c of tvInfoFor(f, country)?.channels ?? []) expect(c.url).toMatch(/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}/)
      }
    }
  })
})

describe('Sender weltweit', () => {
  it('zeigt alle Länder mit Angaben, das gewählte zuerst', () => {
    const f = fixture('c-premier-league', '2026-10-10T14:00:00Z')
    const all = tvWorldwide(f, 'GB')
    expect(all[0]?.country).toBe('GB')
    expect(all.map((x) => x.country)).toEqual(expect.arrayContaining(['DE', 'AT', 'CH', 'TR', 'US']))
    expect(all.find((x) => x.country === 'US')?.info.channels.map((c) => c.name)).toContain('Peacock')
  })

  it('übernimmt die von der Datenquelle pro Spiel gemeldeten Sender – auch aus weiteren Ländern', () => {
    const f: Fixture = {
      ...fixture('c-serie-a', '2026-10-10T14:00:00Z'),
      broadcasts: [
        { name: 'Paramount+', country: 'US', kind: 'stream' },
        { name: 'TSN', country: 'CA', kind: 'tv' },
      ],
    }
    const us = tvInfoFor(f, 'US')!
    expect(us.reported).toBe(true)
    expect(us.channels[0]).toMatchObject({ name: 'Paramount+', url: 'https://www.paramountplus.com' })
    const ca = tvWorldwide(f, 'DE').find((x) => x.country === 'CA')
    expect(ca?.info.channels[0]).toMatchObject({ name: 'TSN', url: undefined })
  })

  it('erzeugt Flaggen aus Ländercodes', () => {
    expect(flagOf('DE')).toBe('🇩🇪')
    expect(flagOf('GB')).toBe('🇬🇧')
  })
})
