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
} from '../domain/types'

/**
 * Abstraktion über jeden Fußball-Datenanbieter.
 * Die App spricht ausschließlich mit diesem Interface – nie direkt mit einem Anbieter.
 * Methoden werfen NotFoundError, wenn eine Entität nicht existiert,
 * und ProviderError bei Netzwerk-/Anbieterproblemen.
 */
export interface FootballProvider {
  readonly id: string
  /** Anzeigename der Datenquelle (Quellenangabe) */
  readonly displayName: string
  /** true, wenn die Daten nicht echt sind (Mock/Demo) */
  readonly isDemo: boolean
  /** Welche Bestenlisten die Quelle liefert – andere Kategorien blendet die UI aus */
  readonly topPlayerCategories: readonly TopPlayerCategory[]

  getCompetitions(): Promise<Competition[]>
  getCompetition(id: Id): Promise<{ competition: Competition; season?: Season }>
  getCompetitionFixtures(competitionId: Id): Promise<Fixture[]>
  /** Alle Spiele der laufenden Saison bis heute – Grundlage für Heim/Auswärts, Fieberkurve, Kreuztabelle */
  getSeasonFixtures(competitionId: Id): Promise<Fixture[]>
  getCompetitionTeams(competitionId: Id): Promise<Team[]>
  getStandings(competitionId: Id): Promise<StandingTable[]>
  getTopPlayers(competitionId: Id, category: TopPlayerCategory): Promise<TopPlayerEntry[]>

  /** Alle Spiele am lokalen Kalendertag (YYYY-MM-DD) */
  getFixturesByDate(dateKey: string): Promise<Fixture[]>
  getFixtureDetails(fixtureId: Id): Promise<FixtureDetails>

  getTeam(teamId: Id): Promise<{ team: Team; competitionIds: Id[] }>
  getTeamFixtures(teamId: Id): Promise<Fixture[]>
  getSquad(teamId: Id): Promise<Player[]>
  getPlayer(playerId: Id): Promise<PlayerProfile>

  search(query: string): Promise<SearchResults>
}
