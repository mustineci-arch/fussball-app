import { isOnDate } from '../../domain/date'
import { isFinished, isLive } from '../../domain/status'
import { normalizeText } from '../../domain/text'
import type {
  Competition,
  Fixture,
  FixtureDetails,
  FormResult,
  Id,
  Lineup,
  LineupPlayer,
  MatchEvent,
  MatchStatistic,
  Player,
  PlayerProfile,
  SearchResults,
  StandingRow,
  StandingTable,
  Team,
  TopPlayerCategory,
  TopPlayerEntry,
} from '../../domain/types'
import { NotFoundError } from '../errors'
import type { FootballProvider } from '../FootballProvider'
import { ALL_COMPETITIONS, LEAGUES, PLAYERS, TEAMS, leagueTeams, requireTeam } from './catalog'
import { matchClock } from './clock'
import { buildMatchScript, eventOrder, type MatchScript } from './matchScript'
import { buildSchedule, type ScheduledFixture } from './schedule'

const GOAL_TYPES = new Set<MatchEvent['type']>(['goal', 'own_goal', 'penalty_goal'])

/** Simulierte Netzwerklatenz, damit Ladezustände sichtbar sind. */
const latency = () => new Promise((resolve) => setTimeout(resolve, 120 + Math.random() * 250))

interface Resolved {
  fixture: Fixture
  script: MatchScript
  /** Ereignisse, die zum aktuellen Zeitpunkt schon passiert sind */
  events: MatchEvent[]
}

export class MockProvider implements FootballProvider {
  readonly id = 'mock'
  readonly displayName = 'Demo-Daten'
  readonly isDemo = true
  readonly topPlayerCategories: readonly TopPlayerCategory[] = ['goals', 'assists', 'yellow_cards', 'red_cards', 'clean_sheets']

  private readonly schedule: ScheduledFixture[] = buildSchedule()
  private readonly scripts = new Map<Id, MatchScript>()

  // ------------------------------------------------------------ Wettbewerbe

  async getCompetitions(): Promise<Competition[]> {
    await latency()
    return [...ALL_COMPETITIONS].sort((a, b) => a.priority - b.priority)
  }

  async getCompetition(id: Id) {
    await latency()
    const competition = this.requireCompetition(id)
    const fixtures = this.resolveAll().filter((r) => r.fixture.competitionId === id)
    const current = fixtures.find((r) => !isFinished(r.fixture.status)) ?? fixtures.at(-1)
    return {
      competition,
      season: { id: `${id}-2026`, competitionId: id, label: '2026/27', currentRound: current?.fixture.round },
    }
  }

  async getCompetitionFixtures(competitionId: Id): Promise<Fixture[]> {
    await latency()
    this.requireCompetition(competitionId)
    return this.resolveAll()
      .filter((r) => r.fixture.competitionId === competitionId)
      .map((r) => r.fixture)
  }

  async getCompetitionTeams(competitionId: Id): Promise<Team[]> {
    await latency()
    this.requireCompetition(competitionId)
    const ids = new Set(
      this.schedule.filter((f) => f.competitionId === competitionId).flatMap((f) => [f.home.team.id, f.away.team.id]),
    )
    return [...ids].map((id) => requireTeam(id).team).sort((a, b) => a.name.localeCompare(b.name, 'de'))
  }

  async getStandings(competitionId: Id): Promise<StandingTable[]> {
    await latency()
    this.requireCompetition(competitionId)
    const league = LEAGUES.find((l) => l.competition.id === competitionId)
    if (!league) return []
    return [{ competitionId, rows: this.computeStandings(competitionId), zones: league.zones }]
  }

  async getTopPlayers(competitionId: Id, category: TopPlayerCategory): Promise<TopPlayerEntry[]> {
    await latency()
    this.requireCompetition(competitionId)
    const counts = new Map<Id, number>()
    const bump = (id: Id | undefined) => id && counts.set(id, (counts.get(id) ?? 0) + 1)

    for (const r of this.resolveAll()) {
      if (r.fixture.competitionId !== competitionId || r.fixture.status === 'scheduled') continue
      if (category === 'clean_sheets') {
        if (!isFinished(r.fixture.status) || !r.fixture.score) continue
        const keeper = (side: 'home' | 'away') => r.script.lineups[side].starters.find((s) => s.player.position === 'GK')
        if (r.fixture.score.away === 0) bump(keeper('home')?.player.id)
        if (r.fixture.score.home === 0) bump(keeper('away')?.player.id)
        continue
      }
      for (const e of r.events) {
        if (category === 'goals' && (e.type === 'goal' || e.type === 'penalty_goal')) bump(e.player?.id)
        if (category === 'assists' && e.type === 'goal') bump(e.relatedPlayer?.id)
        if (category === 'yellow_cards' && e.type === 'yellow') bump(e.player?.id)
        if (category === 'red_cards' && (e.type === 'red' || e.type === 'second_yellow')) bump(e.player?.id)
      }
    }

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .flatMap(([playerId, value], i) => {
        const player = PLAYERS.get(playerId)
        const team = player?.teamId ? TEAMS.get(player.teamId)?.team : undefined
        if (!player || !team) return []
        return [{ rank: i + 1, value, player: { id: player.id, name: player.name }, team }]
      })
  }

  // ------------------------------------------------------------ Spiele

  async getFixturesByDate(dateKey: string): Promise<Fixture[]> {
    await latency()
    return this.resolveAll()
      .filter((r) => isOnDate(r.fixture.kickoffAt, dateKey))
      .map((r) => r.fixture)
  }

  async getFixtureDetails(fixtureId: Id): Promise<FixtureDetails> {
    await latency()
    const scheduled = this.schedule.find((f) => f.id === fixtureId)
    if (!scheduled) throw new NotFoundError('Spiel', fixtureId)
    const r = this.resolve(scheduled)
    const started = r.fixture.status !== 'scheduled' && r.fixture.status !== 'postponed'
    // Aufstellungen erscheinen (wie in echt) erst ca. 60 Minuten vor Anpfiff.
    const lineupsPublished = Date.now() >= new Date(r.fixture.kickoffAt).getTime() - 60 * 60_000
    return {
      fixture: r.fixture,
      events: started ? r.events : undefined,
      lineups: lineupsPublished && !scheduled.postponed ? (started ? this.lineupsWithStats(r.script.lineups, r.events) : r.script.lineups) : undefined,
      statistics: started ? this.statistics(r) : undefined,
    }
  }

  /** Einzelwerte je Spieler aus den bisherigen Ereignissen (wie ESPN sie während des Spiels liefert) */
  private lineupsWithStats(lineups: MatchScript['lineups'], events: MatchEvent[]): MatchScript['lineups'] {
    const count = (playerId: Id, test: (e: MatchEvent) => boolean) => events.filter((e) => test(e) && e.player?.id === playerId).length
    const enrich = (lineup: Lineup, opponentGoals: number): Lineup => {
      const withStats = (entry: LineupPlayer): LineupPlayer => {
        const id = entry.player.id
        const goals = count(id, (e) => e.type === 'goal' || e.type === 'penalty_goal')
        return {
          ...entry,
          subbedIn: events.some((e) => e.type === 'substitution' && e.player?.id === id) || undefined,
          subbedOut: events.some((e) => e.type === 'substitution' && e.relatedPlayer?.id === id) || undefined,
          stats: {
            goals,
            assists: events.filter((e) => e.type === 'goal' && e.relatedPlayer?.id === id).length,
            shots: goals + (Number(id.split('-').at(-1)) % 3),
            shotsOnTarget: goals + (Number(id.split('-').at(-1)) % 2),
            yellowCards: count(id, (e) => e.type === 'yellow'),
            redCards: count(id, (e) => e.type === 'red' || e.type === 'second_yellow'),
            ownGoals: count(id, (e) => e.type === 'own_goal'),
            ...(entry.player.position === 'GK' ? { saves: 2 + (opponentGoals % 3), goalsConceded: opponentGoals } : {}),
          },
        }
      }
      return { ...lineup, starters: lineup.starters.map(withStats), substitutes: lineup.substitutes.map(withStats) }
    }
    const goalsBy = (teamId: Id) =>
      events.filter((e) => GOAL_TYPES.has(e.type) && e.teamId === teamId).length
    return {
      home: enrich(lineups.home, goalsBy(lineups.away.teamId)),
      away: enrich(lineups.away, goalsBy(lineups.home.teamId)),
    }
  }

  // ------------------------------------------------------------ Teams & Spieler

  async getTeam(teamId: Id) {
    await latency()
    const record = TEAMS.get(teamId)
    if (!record) throw new NotFoundError('Team', teamId)
    const competitionIds = [...new Set(this.schedule.filter((f) => f.home.team.id === teamId || f.away.team.id === teamId).map((f) => f.competitionId))]
    return { team: record.team, competitionIds: [record.leagueId, ...competitionIds.filter((c) => c !== record.leagueId)] }
  }

  async getTeamFixtures(teamId: Id): Promise<Fixture[]> {
    await latency()
    if (!TEAMS.has(teamId)) throw new NotFoundError('Team', teamId)
    return this.resolveAll()
      .filter((r) => r.fixture.homeTeam.id === teamId || r.fixture.awayTeam.id === teamId)
      .map((r) => r.fixture)
  }

  async getSquad(teamId: Id): Promise<Player[]> {
    await latency()
    const record = TEAMS.get(teamId)
    if (!record) throw new NotFoundError('Team', teamId)
    return record.squad
  }

  async getPlayer(playerId: Id): Promise<PlayerProfile> {
    await latency()
    const player = PLAYERS.get(playerId)
    if (!player) throw new NotFoundError('Spieler', playerId)
    const team = player.teamId ? TEAMS.get(player.teamId)?.team : undefined

    const byCompetition = new Map<Id, Required<Omit<PlayerProfile['seasonStats'][number], 'competitionId' | 'seasonLabel'>>>()
    for (const r of this.resolveAll()) {
      if (r.fixture.status === 'scheduled' || r.fixture.status === 'postponed') continue
      const lineup = [r.script.lineups.home, r.script.lineups.away].find((l) => l.teamId === player.teamId)
      if (!lineup) continue
      const started = lineup.starters.some((s) => s.player.id === playerId)
      const subOn = r.events.find((e) => e.type === 'substitution' && e.player?.id === playerId)
      if (!started && !subOn) continue
      const subOff = r.events.find((e) => e.type === 'substitution' && e.relatedPlayer?.id === playerId)
      const end = subOff?.minute ?? Math.min(r.fixture.minute ?? 90, 90)
      const stats = byCompetition.get(r.fixture.competitionId) ?? { appearances: 0, starts: 0, minutes: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0 }
      stats.appearances++
      if (started) stats.starts++
      stats.minutes += Math.max(0, end - (subOn?.minute ?? 0))
      for (const e of r.events) {
        if (e.player?.id === playerId && (e.type === 'goal' || e.type === 'penalty_goal')) stats.goals++
        if (e.relatedPlayer?.id === playerId && e.type === 'goal') stats.assists++
        if (e.player?.id === playerId && e.type === 'yellow') stats.yellowCards++
        if (e.player?.id === playerId && (e.type === 'red' || e.type === 'second_yellow')) stats.redCards++
      }
      byCompetition.set(r.fixture.competitionId, stats)
    }

    return {
      player,
      team,
      seasonStats: [...byCompetition.entries()].map(([competitionId, s]) => ({ competitionId, seasonLabel: '2026/27', ...s })),
    }
  }

  async search(query: string): Promise<SearchResults> {
    await latency()
    const q = normalizeText(query)
    if (q.length < 2) return { teams: [], players: [], competitions: [] }
    const hit = (text: string) => normalizeText(text).includes(q)
    return {
      competitions: ALL_COMPETITIONS.filter((c) => hit(c.name) || hit(c.shortName)).slice(0, 5),
      teams: [...TEAMS.values()].map((r) => r.team).filter((t) => hit(t.name)).slice(0, 10),
      players: [...PLAYERS.values()].filter((p) => hit(p.name)).slice(0, 15),
    }
  }

  // ------------------------------------------------------------ intern

  private requireCompetition(id: Id): Competition {
    const competition = ALL_COMPETITIONS.find((c) => c.id === id)
    if (!competition) throw new NotFoundError('Wettbewerb', id)
    return competition
  }

  private script(f: ScheduledFixture): MatchScript {
    let script = this.scripts.get(f.id)
    if (!script) {
      script = buildMatchScript(f)
      this.scripts.set(f.id, script)
    }
    return script
  }

  private resolve(f: ScheduledFixture, now = Date.now()): Resolved {
    const script = this.script(f)
    const base: Fixture = {
      id: f.id,
      competitionId: f.competitionId,
      seasonId: `${f.competitionId}-2026`,
      round: f.round,
      kickoffAt: f.kickoffAt,
      status: 'scheduled',
      homeTeam: f.home.team,
      awayTeam: f.away.team,
      venue: f.home.team.venue,
    }
    if (f.postponed) return { fixture: { ...base, status: 'postponed' }, script, events: [] }

    const clock = matchClock(f.kickoffAt, now)
    const events = script.events.filter((e) => eventOrder(e) <= clock.cutoff)
    if (clock.status === 'scheduled') return { fixture: base, script, events }

    const goals = (teamId: Id, until = Number.POSITIVE_INFINITY) =>
      events.filter((e) => GOAL_TYPES.has(e.type) && e.teamId === teamId && eventOrder(e) <= until).length
    const fixture: Fixture = {
      ...base,
      status: clock.status,
      minute: clock.minute,
      extraMinute: clock.extraMinute,
      score: { home: goals(f.home.team.id), away: goals(f.away.team.id) },
      halftimeScore: clock.cutoff > 45.9 ? { home: goals(f.home.team.id, 45.9), away: goals(f.away.team.id, 45.9) } : undefined,
    }
    return { fixture, script, events }
  }

  private resolveAll(): Resolved[] {
    const now = Date.now()
    return this.schedule.map((f) => this.resolve(f, now))
  }

  private statistics(r: Resolved): MatchStatistic[] {
    const { fixture, script, events } = r
    const played = isLive(fixture.status) ? Math.min(fixture.minute ?? 0, 90) : 90
    const f = played / 90
    const b = script.statBase
    const scale = (pair: [number, number]) => pair.map((v) => Math.round(v * f)) as [number, number]
    const count = (teamId: Id, types: MatchEvent['type'][]) => events.filter((e) => e.teamId === teamId && types.includes(e.type)).length
    const goals = [fixture.score?.home ?? 0, fixture.score?.away ?? 0]

    const shots = scale(b.shots)
    const onTarget = shots.map((s, i) => Math.min(s, Math.max(goals[i] ?? 0, Math.round(s * 0.4))))
    const blocked = shots.map((s, i) => Math.round((s - (onTarget[i] ?? 0)) * 0.3))
    const passes = [Math.round(b.possessionHome * 9 * f), Math.round((100 - b.possessionHome) * 9 * f)]
    const pair = (key: MatchStatistic['key'], values: readonly number[]): MatchStatistic => ({ key, home: values[0] ?? 0, away: values[1] ?? 0 })
    const home = fixture.homeTeam.id
    const away = fixture.awayTeam.id
    const league = LEAGUES.find((l) => l.competition.id === fixture.competitionId)

    const stats: MatchStatistic[] = [
      pair('possession', [b.possessionHome, 100 - b.possessionHome]),
      ...(league?.hasXg ? [pair('xg', b.xg.map((x) => Math.round(x * f * 100) / 100))] : []),
      pair('shots_total', shots),
      pair('shots_on_target', onTarget),
      pair('shots_off_target', shots.map((s, i) => s - (onTarget[i] ?? 0) - (blocked[i] ?? 0))),
      pair('shots_blocked', blocked),
      pair('corners', scale(b.corners)),
      pair('fouls', scale(b.fouls)),
      pair('offsides', scale(b.offsides)),
      pair('yellow_cards', [count(home, ['yellow']), count(away, ['yellow'])]),
      pair('red_cards', [count(home, ['red', 'second_yellow']), count(away, ['red', 'second_yellow'])]),
      pair('passes_total', passes),
      pair('pass_accuracy', b.passAccuracy),
      pair('saves', [Math.max(0, (onTarget[1] ?? 0) - (goals[1] ?? 0)), Math.max(0, (onTarget[0] ?? 0) - (goals[0] ?? 0))]),
    ]
    return stats
  }

  private computeStandings(competitionId: Id): StandingRow[] {
    const rows = new Map<Id, StandingRow & { results: FormResult[] }>(
      leagueTeams(competitionId).map((r) => [
        r.team.id,
        { rank: 0, team: r.team, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0, results: [] },
      ]),
    )
    for (const { fixture } of this.resolveAll()) {
      if (fixture.competitionId !== competitionId || !isFinished(fixture.status) || !fixture.score) continue
      const sides = [
        [fixture.homeTeam.id, fixture.score.home, fixture.score.away],
        [fixture.awayTeam.id, fixture.score.away, fixture.score.home],
      ] as const
      for (const [teamId, gf, ga] of sides) {
        const row = rows.get(teamId)
        if (!row) continue
        row.played++
        row.goalsFor += gf
        row.goalsAgainst += ga
        const result: FormResult = gf > ga ? 'W' : gf === ga ? 'D' : 'L'
        if (result === 'W') (row.won++, (row.points += 3))
        else if (result === 'D') (row.drawn++, row.points++)
        else row.lost++
        row.results.push(result)
      }
    }
    return [...rows.values()]
      .sort(
        (a, b) =>
          b.points - a.points ||
          b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) ||
          b.goalsFor - a.goalsFor ||
          a.team.name.localeCompare(b.team.name),
      )
      .map(({ results, ...row }, i) => ({ ...row, rank: i + 1, form: results.slice(-5) }))
  }
}
