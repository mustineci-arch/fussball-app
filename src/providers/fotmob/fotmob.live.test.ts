// Prüft die FotMob-Zuordnung gegen die echten Schnittstellen. Läuft nur mit LIVE=1: LIVE=1 npx vitest run src/providers/fotmob/fotmob.live.test.ts
import { describe, expect, it } from 'vitest'
import { EspnProvider } from '../espn/EspnProvider'
import { findPlayer, findTeamId, getMatch, getSquad } from './fotmob'

describe.skipIf(!process.env.LIVE)('FotMob live', () => {
  const espn = new EspnProvider()

  it('findet Teams', async () => {
    for (const id of ['127', '132', '122', '110', '124', '7911', '436', '432', '359', '83']) {
      const { team } = await espn.getTeam(id)
      console.log('TEAM', id, team.name, '→', await findTeamId(team))
    }
  }, 60_000)

  it('Kader HSV: Verletzte und Noten', async () => {
    const espnSquad = await espn.getSquad('127')
    const fm = await getSquad(9790)
    const matched = espnSquad.filter((p) => findPlayer(p, fm))
    console.log('SQUAD espn', espnSquad.length, 'fotmob', fm.length, 'zugeordnet', matched.length)
    console.log('NICHT ZUGEORDNET', espnSquad.filter((p) => !findPlayer(p, fm)).map((p) => `${p.shirtNumber} ${p.name}`))
    console.log('VERLETZT', fm.filter((p) => p.injury).map((p) => `${p.name}: ${JSON.stringify(p.injury)}`))
    expect(fm.some((p) => p.seasonRating)).toBe(true)
  }, 60_000)

  it('Noten in Spielen', async () => {
    for (const id of ['401923763']) {
      const details = await espn.getFixtureDetails(id)
      const m = await getMatch(details.fixture)
      console.log('MATCH', details.fixture.homeTeam.name, '-', details.fixture.awayTeam.name)
      console.log('  home', m?.home.players.map((p) => `${p.name} ${p.rating}`))
      console.log('  away', m?.away.players.map((p) => `${p.name} ${p.rating}`))
      console.log('  unavailable', m?.home.unavailable.length, m?.away.unavailable.length)
    }
    const fixtures = await espn.getTeamFixtures('127')
    const league = fixtures.filter((f) => f.status === 'finished' && f.competitionId === 'c-bundesliga').at(-1)
    if (league) {
      const details = await espn.getFixtureDetails(league.id)
      const m = await getMatch(details.fixture)
      console.log('LEAGUE', league.homeTeam.name, '-', league.awayTeam.name, league.kickoffAt)
      console.log('  home', m?.home.players.map((p) => `${p.name} ${p.rating}`))
      console.log('  away', m?.away.players.map((p) => `${p.name} ${p.rating}`))
      const lineupNames = [...(details.lineups?.home?.starters ?? []), ...(details.lineups?.home?.substitutes ?? [])].map((e) => ({ name: e.player.name, shirtNumber: e.shirtNumber }))
      console.log('  espn lineup', lineupNames.length, 'zugeordnet', m?.home.players.filter((p) => findPlayer(p, lineupNames)).length)
      console.log('  espn stats sample', JSON.stringify(details.lineups?.home?.starters?.[0]))
    }
  }, 60_000)
})
