import { describe, expect, it } from 'vitest'
import type { Fixture } from '../domain/types'
import { bundesligaGermany, tvInfoFor } from './broadcasts'

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
