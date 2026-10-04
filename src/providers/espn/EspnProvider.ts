/**
 * Adapter für die (inoffizielle) ESPN-API.
 * Nur für private Nutzung gedacht – für einen öffentlichen Betrieb wird ein lizenzierter Anbieter
 * über einen weiteren Adapter angebunden; der Rest der App bleibt unverändert.
 */
import { addDays, isOnDate, parseDateKey, todayKey } from '../../domain/date'
import { isFinished, isLive } from '../../domain/status'
import { normalizeText } from '../../domain/text'
import type {
  Competition,
  Fixture,
  FixtureDetails,
  Id,
  Player,
  PlayerProfile,
  SearchResults,
  Season,
  StandingTable,
  Team,
  TopPlayerCategory,
  TopPlayerEntry,
} from '../../domain/types'
import { NotFoundError } from '../errors'
import type { FootballProvider } from '../FootballProvider'
import { EspnClient, SITE_API, STANDINGS_API, WEB_API, ttl } from './client'
import { LEAGUE_SLUGS, competitionIdForSlug, listedCompetition, listedCompetitions, slugForCompetition } from './leagues'
import {
  mapAthlete,
  mapFixture,
  mapLeaders,
  mapRosterAthlete,
  mapSearch,
  mapStandings,
  mapSummary,
  mapTeam,
} from './mappers'
import type {
  RawAthleteResponse,
  RawAthleteStats,
  RawLeaders,
  RawSchedule,
  RawScoreboard,
  RawSearch,
  RawStandings,
  RawSummary,
  RawTeamResponse,
  RawTeamRoster,
  RawTeamsList,
} from './raw'

const compactDate = (dateKey: string) => dateKey.replaceAll('-', '')

/** Cache-Dauer einer Spielliste: kurz, solange etwas läuft oder bald beginnt – sonst lang. */
function fixturesTtl(fixtures: Fixture[]): number {
  if (fixtures.some((f) => isLive(f.status))) return ttl.live
  const soon = Date.now() + 3 * 60 * 60_000
  if (fixtures.some((f) => f.status === 'scheduled' && new Date(f.kickoffAt).getTime() < soon)) return ttl.short
  return fixtures.every((f) => isFinished(f.status)) && fixtures.length > 0 ? ttl.long : ttl.medium
}

export class EspnProvider implements FootballProvider {
  readonly id = 'espn'
  readonly displayName = 'ESPN (inoffizielle Schnittstelle)'
  readonly isDemo = false
  readonly topPlayerCategories: readonly TopPlayerCategory[] = ['goals', 'assists']

  constructor(private readonly client = new EspnClient()) {}

  // ------------------------------------------------------------ Wettbewerbe

  async getCompetitions(): Promise<Competition[]> {
    return listedCompetitions()
  }

  async getCompetition(id: Id): Promise<{ competition: Competition; season?: Season }> {
    const slug = this.requireSlug(id)
    const board = await this.scoreboard(slug)
    const league = board.leagues?.[0]
    const competition = listedCompetition(id) ?? {
      id,
      slug,
      name: (league as { name?: string } | undefined)?.name ?? slug,
      shortName: slug,
      type: 'cup',
      priority: 100,
    }
    const label = league?.season?.displayName?.match(/\d{4}(-\d{2,4})?/)?.[0]?.replace('-', '/')
    return { competition, season: label ? { id: `${id}-${label}`, competitionId: id, label } : undefined }
  }

  async getCompetitionFixtures(competitionId: Id): Promise<Fixture[]> {
    const slug = this.requireSlug(competitionId)
    // Zeitraum ca. zwei Wochen zurück bis drei Wochen voraus – als Monatsabfragen (eine Anfrage pro Monat).
    const today = todayKey()
    const months = [...new Set([addDays(today, -14), today, addDays(today, 21)].map((d) => d.slice(0, 7).replace('-', '')))]
    const lists = await Promise.all(
      months.map((month) =>
        this.client.get<RawScoreboard>(`${SITE_API}/${slug}/scoreboard?dates=${month}&limit=400`, (raw) =>
          fixturesTtl(this.mapBoard(raw, slug)),
        ),
      ),
    )
    return this.dedupe(lists.flatMap((raw) => this.mapBoard(raw, slug)))
  }

  async getCompetitionTeams(competitionId: Id): Promise<Team[]> {
    const slug = this.requireSlug(competitionId)
    const raw = await this.client.get<RawTeamsList>(`${SITE_API}/${slug}/teams`, ttl.long)
    return (raw.sports?.[0]?.leagues?.[0]?.teams ?? [])
      .flatMap((t) => mapTeam(t.team) ?? [])
      .sort((a, b) => a.name.localeCompare(b.name, 'de'))
  }

  async getStandings(competitionId: Id): Promise<StandingTable[]> {
    const slug = slugForCompetition(competitionId)
    if (!slug) return []
    try {
      const raw = await this.client.get<RawStandings>(`${STANDINGS_API}/${slug}/standings`, ttl.medium)
      return mapStandings(raw, competitionId)
    } catch (error) {
      // Wettbewerbe ohne Tabelle (z. B. Testspiele) liefern einen Fehler – das ist kein App-Fehler.
      if (error instanceof NotFoundError) return []
      throw error
    }
  }

  async getTopPlayers(competitionId: Id, category: TopPlayerCategory): Promise<TopPlayerEntry[]> {
    const slug = slugForCompetition(competitionId)
    if (!slug || !this.topPlayerCategories.includes(category)) return []
    try {
      const raw = await this.client.get<RawLeaders>(`${SITE_API}/${slug}/statistics`, ttl.medium)
      return mapLeaders(raw, category === 'goals' ? 'goalsLeaders' : 'assistsLeaders', slug)
    } catch (error) {
      // Wettbewerbe ohne Bestenlisten (z. B. Testspiele) – kein App-Fehler
      if (error instanceof NotFoundError) return []
      throw error
    }
  }

  // ------------------------------------------------------------ Spiele

  async getFixturesByDate(dateKey: string): Promise<Fixture[]> {
    if (!parseDateKey(dateKey)) return []
    // ESPN gruppiert Spiele nach US-Tagen. Ein lokaler Kalendertag kann in zwei ESPN-Tage fallen,
    // daher werden Vortag und Tag abgefragt und anschließend nach lokalem Datum gefiltert.
    const days = [addDays(dateKey, -1), dateKey]
    const results = await Promise.allSettled(
      LEAGUE_SLUGS.flatMap((slug) => days.map((day) => this.scoreboard(slug, day).then((raw) => this.mapBoard(raw, slug)))),
    )
    const fixtures = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    // Nur wenn alle Anfragen scheitern, ist das ein Fehler – einzelne Ligen dürfen fehlen.
    if (fixtures.length === 0 && results.every((r) => r.status === 'rejected')) {
      throw (results[0] as PromiseRejectedResult).reason
    }
    return this.dedupe(fixtures.filter((f) => isOnDate(f.kickoffAt, dateKey)))
  }

  async getFixtureDetails(fixtureId: Id): Promise<FixtureDetails> {
    if (!/^\d+$/.test(fixtureId)) throw new NotFoundError('Spiel', fixtureId)
    const raw = await this.client.get<RawSummary>(`${SITE_API}/all/summary?event=${fixtureId}`, (data) => {
      const state = data.header?.competitions?.[0]?.status?.type?.state
      return state === 'in' ? ttl.live : state === 'post' ? ttl.long : ttl.short
    })
    const details = mapSummary(raw)
    if (!details) throw new NotFoundError('Spiel', fixtureId)
    return details
  }

  // ------------------------------------------------------------ Teams & Spieler

  async getTeam(teamId: Id): Promise<{ team: Team; competitionIds: Id[] }> {
    const raw = await this.teamRaw(teamId)
    const team = mapTeam(raw.team)
    if (!team) throw new NotFoundError('Team', teamId)
    const leagueSlug = raw.team?.defaultLeague?.slug
    return {
      team: { ...team, league: raw.team?.defaultLeague?.name },
      competitionIds: leagueSlug ? [competitionIdForSlug(leagueSlug)] : [],
    }
  }

  async getTeamFixtures(teamId: Id): Promise<Fixture[]> {
    if (!/^\d+$/.test(teamId)) throw new NotFoundError('Team', teamId)
    const [results, upcoming] = await Promise.all([
      this.client.get<RawSchedule>(`${SITE_API}/all/teams/${teamId}/schedule`, ttl.medium),
      this.client.get<RawSchedule>(`${SITE_API}/all/teams/${teamId}/schedule?fixture=true`, ttl.medium),
    ])
    const fixtures = [...(results.events ?? []), ...(upcoming.events ?? [])].flatMap((e) => mapFixture(e) ?? [])
    return this.dedupe(fixtures)
  }

  async getSquad(teamId: Id): Promise<Player[]> {
    const raw = await this.teamRaw(teamId)
    const slug = raw.team?.defaultLeague?.slug
    if (!slug) return []
    const team = mapTeam(raw.team)
    const roster = await this.client.get<RawTeamRoster>(`${SITE_API}/${slug}/teams/${teamId}/roster`, ttl.long)
    return (roster.athletes ?? []).flatMap((a) => mapRosterAthlete(a, team) ?? [])
  }

  async getPlayer(playerId: Id): Promise<PlayerProfile> {
    if (!/^\d+$/.test(playerId)) throw new NotFoundError('Spieler', playerId)
    const base = `${WEB_API}/common/v3/sports/soccer/athletes/${playerId}`
    const [raw, stats] = await Promise.all([
      this.client.get<RawAthleteResponse>(base, ttl.long),
      // Statistiken sind optional – fehlen sie, zeigt die Seite trotzdem das Profil.
      this.client.get<RawAthleteStats>(`${base}/stats`, ttl.medium).catch(() => undefined),
    ])
    const profile = mapAthlete(raw, stats)
    if (!profile) throw new NotFoundError('Spieler', playerId)
    return profile
  }

  async search(query: string): Promise<SearchResults> {
    const q = query.trim()
    if (q.length < 2) return { teams: [], players: [], competitions: [] }
    const needle = normalizeText(q)
    const competitions = listedCompetitions().filter(
      (c) => normalizeText(c.name).includes(needle) || normalizeText(c.shortName).includes(needle),
    )
    const raw = await this.client.get<RawSearch>(`${WEB_API}/search/v2?query=${encodeURIComponent(q)}&limit=20`, ttl.long)
    return { competitions, ...mapSearch(raw) }
  }

  // ------------------------------------------------------------ intern

  private requireSlug(competitionId: Id): string {
    const slug = slugForCompetition(competitionId)
    if (!slug) throw new NotFoundError('Wettbewerb', competitionId)
    return slug
  }

  private scoreboard(slug: string, dateKey?: string): Promise<RawScoreboard> {
    const url = dateKey ? `${SITE_API}/${slug}/scoreboard?dates=${compactDate(dateKey)}` : `${SITE_API}/${slug}/scoreboard`
    return this.client.get<RawScoreboard>(url, (raw) => {
      // Vergangene Tage ändern sich nicht mehr
      if (dateKey && dateKey < addDays(todayKey(), -1)) return ttl.long
      return fixturesTtl(this.mapBoard(raw, slug))
    })
  }

  private mapBoard(raw: RawScoreboard, slug: string): Fixture[] {
    return (raw.events ?? []).flatMap((e) => mapFixture(e, slug) ?? [])
  }

  private teamRaw(teamId: Id): Promise<RawTeamResponse> {
    if (!/^\d+$/.test(teamId)) return Promise.reject(new NotFoundError('Team', teamId))
    return this.client.get<RawTeamResponse>(`${SITE_API}/all/teams/${teamId}`, ttl.long)
  }

  /** Doppelte Spiele entfernen und nach Anstoß sortieren */
  private dedupe(fixtures: Fixture[]): Fixture[] {
    const byId = new Map(fixtures.map((f) => [f.id, f]))
    return [...byId.values()].sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt))
  }
}
