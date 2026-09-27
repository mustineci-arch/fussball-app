import { describe, expect, it } from 'vitest'
import athlete from './__fixtures__/athlete.json'
import athleteStats from './__fixtures__/athlete-stats.json'
import leaders from './__fixtures__/leaders.json'
import scoreboard from './__fixtures__/scoreboard.json'
import search from './__fixtures__/search.json'
import standings from './__fixtures__/standings.json'
import summaryFinished from './__fixtures__/summary-finished.json'
import summaryScheduled from './__fixtures__/summary-scheduled.json'
import {
  mapAthlete,
  mapFixture,
  mapLeaders,
  mapSearch,
  mapStandings,
  mapStatus,
  mapSummary,
  parseClock,
  parseDisplayDob,
} from './mappers'
import type { RawEvent, RawSummary } from './raw'

describe('Grundfunktionen', () => {
  it('liest Spielminuten inkl. Nachspielzeit', () => {
    expect(parseClock("67'")).toEqual({ minute: 67 })
    expect(parseClock("90'+4'")).toEqual({ minute: 90, extraMinute: 4 })
    expect(parseClock("45'+2'")).toEqual({ minute: 45, extraMinute: 2 })
    expect(parseClock('')).toBeUndefined()
  })

  it('übersetzt ESPN-Status', () => {
    expect(mapStatus({ type: { name: 'STATUS_SECOND_HALF' }, displayClock: "78'" })).toEqual({ status: 'live_2h', minute: 78 })
    expect(mapStatus({ type: { name: 'STATUS_HALFTIME' }, displayClock: "45'" })).toEqual({ status: 'halftime' })
    expect(mapStatus({ type: { name: 'STATUS_FULL_TIME' }, displayClock: "90'+5'" })).toEqual({ status: 'finished' })
    expect(mapStatus({ type: { name: 'STATUS_FINAL_PEN' } }).status).toBe('finished_pen')
    // Unbekannter Name → Ableitung aus Zustand und Halbzeit
    expect(mapStatus({ type: { name: 'STATUS_NEW_THING', state: 'in' }, period: 2 }).status).toBe('live_2h')
    expect(mapStatus(undefined).status).toBe('unknown')
  })

  it('liest Geburtsdaten im Format Tag/Monat/Jahr', () => {
    const now = new Date(2026, 8, 27)
    expect(parseDisplayDob('15/6/1992', 34, now)).toBe('1992-06-15')
    expect(parseDisplayDob('10/11/1994', 31, now)).toBe('1994-11-10')
    // Mehrdeutig und das Alter passt nur zu Monat/Tag → Monat zuerst
    expect(parseDisplayDob('12/1/2000', 25, now)).toBe('2000-12-01')
    expect(parseDisplayDob('12/1/2000', 26, now)).toBe('2000-01-12')
    expect(parseDisplayDob('99/99/1990', undefined, now)).toBeUndefined()
    expect(parseDisplayDob(undefined)).toBeUndefined()
  })
})

describe('mapFixture (Scoreboard)', () => {
  const events = scoreboard.events as RawEvent[]

  it('bildet ein laufendes Spiel ab', () => {
    const live = mapFixture(events[0]!, 'uefa.nations')!
    expect(live.competitionId).toBe('c-nations-league')
    expect(live.status).toBe('live_1h')
    expect(live.minute).toBeGreaterThan(0)
    expect(live.score).toBeDefined()
    // Nationalteams werden ins Deutsche übersetzt
    expect(live.homeTeam.name).toBe('Litauen')
    expect(live.homeTeam.isNational).toBe(true)
    expect(live.homeTeam.logoUrl).toMatch(/^https:\/\//)
  })

  it('zeigt bei geplanten Spielen keinen Spielstand', () => {
    const scheduled = mapFixture(events[1]!, 'uefa.nations')!
    expect(scheduled.status).toBe('scheduled')
    expect(scheduled.score).toBeUndefined()
    expect(scheduled.minute).toBeUndefined()
  })

  it('verwirft unvollständige Events statt Daten zu erfinden', () => {
    expect(mapFixture({ id: '1' }, 'eng.1')).toBeUndefined()
  })
})

describe('mapSummary', () => {
  const details = mapSummary(summaryFinished as RawSummary)!

  it('liefert Ergebnis, Stadion und Schiedsrichter', () => {
    expect(details.fixture.status).toBe('finished')
    expect(details.fixture.score).toEqual({ home: 2, away: 2 })
    expect(details.fixture.competitionId).toBe('c-premier-league')
    expect(details.fixture.venue).toBeTruthy()
    expect(details.fixture.referee).toBeTruthy()
  })

  it('bildet Tore, Eigentor und Vorlage korrekt ab', () => {
    const goals = details.events!.filter((e) => ['goal', 'own_goal', 'penalty_goal'].includes(e.type))
    expect(goals).toHaveLength(4)
    const ownGoal = goals.find((e) => e.type === 'own_goal')!
    // Eigentor wird dem begünstigten Team gutgeschrieben
    expect(ownGoal.teamId).toBe(details.fixture.awayTeam.id)
    const withAssist = goals.find((e) => e.relatedPlayer)!
    expect(withAssist.player?.name).toBe('Harvey Barnes')
    expect(withAssist.relatedPlayer?.name).toBe('Lewis Hall')
    // Anzahl Tore je Team = Spielstand
    const byTeam = (id: string) => goals.filter((g) => g.teamId === id).length
    expect(byTeam(details.fixture.homeTeam.id)).toBe(2)
    expect(byTeam(details.fixture.awayTeam.id)).toBe(2)
  })

  it('ordnet bei Wechseln ein- und ausgewechselten Spieler richtig zu', () => {
    const sub = details.events!.find((e) => e.type === 'substitution')!
    const roster = [...details.lineups!.home!.substitutes, ...details.lineups!.away!.substitutes].map((p) => p.player.id)
    expect(roster).toContain(sub.player!.id)
  })

  it('liefert Aufstellungen mit Spielfeldpositionen', () => {
    for (const lineup of [details.lineups!.home!, details.lineups!.away!]) {
      expect(lineup.starters).toHaveLength(11)
      expect(lineup.formation).toMatch(/^\d(-\d)+$/)
      expect(lineup.starters.every((p) => p.gridRow !== undefined && p.gridCol !== undefined)).toBe(true)
      expect(lineup.starters.filter((p) => p.gridRow === 1)).toHaveLength(1)
    }
  })

  it('liefert nur Statistiken, die ESPN tatsächlich hat', () => {
    const keys = details.statistics!.map((s) => s.key)
    expect(keys).toContain('possession')
    expect(keys).toContain('shots_on_target')
    expect(keys).not.toContain('xg')
    const possession = details.statistics!.find((s) => s.key === 'possession')!
    expect(possession.home + possession.away).toBe(100)
  })

  it('hat vor Anpfiff weder Ereignisse noch Statistiken oder Aufstellung', () => {
    const pre = mapSummary(summaryScheduled as RawSummary)!
    expect(pre.fixture.status).toBe('scheduled')
    expect(pre.events).toBeUndefined()
    expect(pre.statistics).toBeUndefined()
    expect(pre.lineups).toBeUndefined()
  })
})

describe('mapStandings', () => {
  const [table] = mapStandings(standings, 'c-super-lig')

  it('liest Tabelle mit allen Teams in Platzreihenfolge', () => {
    expect(table!.rows).toHaveLength(18)
    expect(table!.rows.map((r) => r.rank)).toEqual(Array.from({ length: 18 }, (_, i) => i + 1))
    for (const row of table!.rows) {
      expect(row.won + row.drawn + row.lost).toBe(row.played)
      expect(row.points).toBe(row.won * 3 + row.drawn)
    }
  })

  it('leitet Zonen aus den Anmerkungen der Datenquelle ab', () => {
    expect(table!.zones).toEqual([
      { kind: 'champions_league', label: 'Champions League', fromRank: 1, toRank: 1 },
      { kind: 'champions_league', label: 'Champions-League-Qualifikation', fromRank: 2, toRank: 2 },
      { kind: 'europa_league', label: 'Europa-League-Qualifikation', fromRank: 3, toRank: 3 },
      { kind: 'conference_league', label: 'Conference-League-Qualifikation', fromRank: 4, toRank: 4 },
      { kind: 'relegation', label: 'Abstieg', fromRank: 16, toRank: 18 },
    ])
  })
})

describe('Bestenlisten, Spieler, Suche', () => {
  it('liest Torschützen mit Team', () => {
    const top = mapLeaders(leaders, 'goalsLeaders')
    expect(top.length).toBeGreaterThan(0)
    expect(top[0]).toMatchObject({ rank: 1, player: { name: 'Mohamed Salah' }, team: { name: 'Trabzonspor' } })
    // absteigend sortiert
    expect(top.every((e, i) => i === 0 || e.value <= top[i - 1]!.value)).toBe(true)
  })

  it('liest ein Spielerprofil mit Saisonstatistiken', () => {
    const profile = mapAthlete(athlete, athleteStats)!
    expect(profile.player).toMatchObject({ name: 'Kaan Ayhan', birthDate: '1994-11-10', position: 'DF' })
    expect(profile.team?.name).toBe('Galatasaray')
    expect(profile.seasonStats[0]).toMatchObject({ competitionId: 'c-super-lig', seasonLabel: '2026/27' })
    // ESPN liefert keine Einsätze/Minuten – die bleiben leer statt geschätzt
    expect(profile.seasonStats[0]?.appearances).toBeUndefined()
  })

  it('liest Suchergebnisse (nur Fußball)', () => {
    const results = mapSearch(search)
    expect(results.teams[0]).toMatchObject({ id: '432', name: 'Galatasaray' })
    expect(results.players.length).toBeGreaterThan(0)
    expect(results.players.every((p) => p.teamName)).toBe(true)
  })
})
