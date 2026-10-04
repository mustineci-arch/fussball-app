import { describe, expect, it } from 'vitest'
import { setLanguage } from '../../i18n'
import league from './__fixtures__/cup-league.json'
import cupMatch from './__fixtures__/cup-match-finished.json'
import team from './__fixtures__/cup-team.json'
import player from './__fixtures__/player.json'
import supercup from './__fixtures__/supercup-match.json'
import {
  fotmobTeam,
  mapFmStatus,
  mapLeagueFixtures,
  mapLeagueStandings,
  mapMatchDetails,
  mapPlayerData,
  mapTeamDetails,
  mapTeamFixtures,
  mapTeamSquad,
  roundLabel,
  type TeamResolver,
} from './cupMappers'
import type { RawFmLeague, RawFmMatchFull, RawFmPlayerData, RawFmTeamFull } from './raw'

setLanguage('de')
const resolve: TeamResolver = (id, name) => (id === 8637 ? { id: '432', slug: 'galatasaray', name: 'Galatasaray', shortName: 'Galatasaray' } : fotmobTeam(id, name))
const comp = (id: number | undefined) => (id === 151 ? 'c-turkish-cup' : id === 71 ? 'c-super-lig' : `fml-${id}`)

describe('Status', () => {
  it('erkennt Live-Phasen und Endstände', () => {
    expect(mapFmStatus({ started: true, liveTime: { short: '19‎’‎' } })).toEqual({ status: 'live_1h', minute: 19, extraMinute: undefined })
    expect(mapFmStatus({ started: true, liveTime: { short: '45+2’' } })).toMatchObject({ status: 'live_1h', minute: 45, extraMinute: 2 })
    expect(mapFmStatus({ started: true, liveTime: { short: '67’' }, halfs: { secondHalfStarted: 'x' } }).status).toBe('live_2h')
    expect(mapFmStatus({ started: true, liveTime: { short: 'HT' } }).status).toBe('halftime')
    expect(mapFmStatus({ started: true, finished: true, reason: { short: 'FT' } }).status).toBe('finished')
    expect(mapFmStatus({ started: true, finished: true, reason: { short: 'AET' } }).status).toBe('finished_aet')
    expect(mapFmStatus({ started: true, finished: true, reason: { short: 'Pen' } }).status).toBe('finished_pen')
    expect(mapFmStatus({ started: false }).status).toBe('scheduled')
    expect(mapFmStatus({ cancelled: true, reason: { short: 'PP' } }).status).toBe('postponed')
  })

  it('benennt Runden', () => {
    expect(roundLabel('3')).toBe('3. Runde')
    expect(roundLabel('1/4')).toBe('Viertelfinale')
    expect(roundLabel('final')).toBe('Finale')
  })
})

describe('Pokal: Spielplan und Gruppen', () => {
  const raw = league as RawFmLeague

  it('liest die Spiele', () => {
    const fixtures = mapLeagueFixtures(raw, 'c-turkish-cup', resolve)
    expect(fixtures.length).toBe(raw.fixtures!.allMatches!.length)
    const final = fixtures.at(-1)!
    expect(final).toMatchObject({ id: 'fm-5237912', competitionId: 'c-turkish-cup', round: 'Finale', status: 'finished', score: { home: 2, away: 1 } })
    expect(final.homeTeam).toMatchObject({ id: 'fmt-9752', name: 'Trabzonspor' })
    expect(final.homeTeam.logoUrl).toContain('/teamlogo/9752.png')
  })

  it('liest die Gruppentabellen mit Zonen', () => {
    const tables = mapLeagueStandings(raw, 'c-turkish-cup', resolve)
    expect(tables.map((t) => t.groupName)).toEqual(['Gruppe A', 'Gruppe B', 'Gruppe C'])
    const a = tables[0]!
    expect(a.rows[0]).toMatchObject({ rank: 1, played: 4, won: 4, goalsFor: 8, goalsAgainst: 3, points: 12 })
    expect(a.rows[0]!.team.id).toBe('432') // Galatasaray → ESPN-Team
    expect(a.zones).toEqual([
      { kind: 'qualification', label: 'qualification', fromRank: 1, toRank: 2 },
      { kind: 'playoff', label: 'playoff', fromRank: 3, toRank: 3 },
    ])
  })
})

describe('Pokal: Spieldetails', () => {
  const details = mapMatchDetails(cupMatch as RawFmMatchFull, resolve, comp)!

  it('liest Spiel, Ergebnis und Infos', () => {
    expect(details.fixture).toMatchObject({ id: 'fm-5237912', competitionId: 'c-turkish-cup', status: 'finished', score: { home: 2, away: 1 }, round: 'Finale' })
    expect(details.fixture.homeTeam.name).toBe('Trabzonspor')
  })

  it('liest Aufstellungen mit Feldpositionen', () => {
    const home = details.lineups!.home!
    expect(home.starters).toHaveLength(11)
    expect(home.formation).toBeTruthy()
    const keeper = home.starters.find((p) => p.gridRow === 1)!
    expect(keeper.player.position).toBe('GK')
    expect(home.starters.every((p) => p.gridRow! >= 1 && p.gridCol! >= 1)).toBe(true)
    expect(home.starters[0]!.player.id).toMatch(/^fmp-\d+$/)
    expect(home.substitutes.some((p) => p.subbedIn)).toBe(true)
  })

  it('liest Ereignisse und Statistik', () => {
    const goals = details.events!.filter((e) => e.type === 'goal' || e.type === 'penalty_goal' || e.type === 'own_goal')
    expect(goals).toHaveLength(3)
    expect(details.events!.some((e) => e.type === 'substitution' && e.player && e.relatedPlayer)).toBe(true)
    const keys = details.statistics!.map((s) => s.key)
    expect(keys).toEqual(expect.arrayContaining(['possession', 'shots_total', 'shots_on_target', 'corners', 'pass_accuracy']))
    const possession = details.statistics!.find((s) => s.key === 'possession')!
    expect(possession.home + possession.away).toBe(100)
  })

  it('liest auch Supercup-Spiele (andere FotMob-Liga) – mit Tor und Vorlage', () => {
    const sc = mapMatchDetails(supercup as RawFmMatchFull, resolve, comp)!
    expect(sc.fixture.competitionId).toBe('fml-166')
    expect(sc.fixture.homeTeam.id).toBe('432')
    const goal = sc.events!.find((e) => e.type === 'goal')!
    expect(goal).toMatchObject({ minute: 28, player: { name: 'Matteo Guendouzi' }, relatedPlayer: { name: 'Levent Mercan' } })
    expect(sc.events!.find((e) => e.type === 'yellow')?.player?.name).toBe('Davinson Sánchez')
  })
})

describe('Teams und Spieler', () => {
  it('liest Team, Kader und Spiele', () => {
    const raw = team as RawFmTeamFull
    const t = mapTeamDetails(raw, 8622)
    expect(t).toMatchObject({ id: 'fmt-8622', name: 'Konyaspor', coach: 'İlhan Palut' })
    expect(t.venue).toContain('Konya')
    const squad = mapTeamSquad(raw, t)
    expect(squad.length).toBeGreaterThan(15)
    expect(squad.every((p) => p.id.startsWith('fmp-') && p.position)).toBe(true)
    const fixtures = mapTeamFixtures(raw, resolve, comp)
    expect(fixtures.length).toBeGreaterThan(0)
    expect(fixtures.every((f) => f.id.startsWith('fm-'))).toBe(true)
  })

  it('liest ein Spielerprofil', () => {
    const profile = mapPlayerData(player as RawFmPlayerData, resolve, comp)!
    expect(profile.player).toMatchObject({ id: 'fmp-478527', name: 'Steve Mounié', birthDate: '1994-09-29', position: 'FW', shirtNumber: 15 })
    expect(profile.player.injury?.status).toBe('out')
    expect(profile.seasonStats[0]).toMatchObject({ competitionId: 'c-super-lig', goals: 2, appearances: 21 })
  })
})
