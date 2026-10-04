/**
 * Daten-Hooks der App. Hier liegt die Cache-Strategie im Browser:
 * Stammdaten lange, Tabellen mittel, Live-Spiele kurz – beendete Spiele gar nicht neu.
 */
import { useQuery } from '@tanstack/react-query'
import { todayKey } from '../domain/date'
import { isFinished, isLive, needsLiveRefresh } from '../domain/status'
import type { Fixture, Id, Player, Team, TopPlayerCategory } from '../domain/types'
import { findPlayerPhoto, findPlayerPhotos, photoKey } from '../media/wikimedia'
import { provider } from '../providers'
import * as fotmob from '../providers/fotmob/fotmob'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

/** Aktualisierungsintervall für Live-Daten (und Spiele kurz vor/nach Anpfiff) */
export const LIVE_REFRESH_MS = 2_000

export const staleTimes = {
  static: 12 * HOUR,
  standings: 10 * MINUTE,
  fixtures: 5 * MINUTE,
  live: 1_000,
} as const

const hasLive = (fixtures: Fixture[] | undefined) => fixtures?.some((f) => needsLiveRefresh(f)) ?? false

export const queryKeys = {
  competitions: ['competitions'] as const,
  competition: (id: Id) => ['competition', id] as const,
  competitionFixtures: (id: Id) => ['competition', id, 'fixtures'] as const,
  competitionTeams: (id: Id) => ['competition', id, 'teams'] as const,
  standings: (id: Id) => ['competition', id, 'standings'] as const,
  topPlayers: (id: Id, category: TopPlayerCategory) => ['competition', id, 'top', category] as const,
  fixturesByDate: (date: string) => ['fixtures', date] as const,
  fixture: (id: Id) => ['fixture', id] as const,
  team: (id: Id) => ['team', id] as const,
  teamFixtures: (id: Id) => ['team', id, 'fixtures'] as const,
  squad: (id: Id) => ['team', id, 'squad'] as const,
  player: (id: Id) => ['player', id] as const,
  search: (q: string) => ['search', q] as const,
}

export const useCompetitions = () =>
  useQuery({ queryKey: queryKeys.competitions, queryFn: () => provider.getCompetitions(), staleTime: staleTimes.static })

export const useCompetition = (id: Id) =>
  useQuery({ queryKey: queryKeys.competition(id), queryFn: () => provider.getCompetition(id), staleTime: staleTimes.static })

export const useCompetitionFixtures = (id: Id) =>
  useQuery({
    queryKey: queryKeys.competitionFixtures(id),
    queryFn: () => provider.getCompetitionFixtures(id),
    staleTime: staleTimes.fixtures,
    refetchInterval: (q) => (hasLive(q.state.data) ? LIVE_REFRESH_MS : false),
  })

export const useCompetitionTeams = (id: Id) =>
  useQuery({ queryKey: queryKeys.competitionTeams(id), queryFn: () => provider.getCompetitionTeams(id), staleTime: staleTimes.static })

export const useStandings = (id: Id) =>
  useQuery({
    queryKey: queryKeys.standings(id),
    queryFn: () => provider.getStandings(id),
    staleTime: staleTimes.standings,
    enabled: id !== '',
  })

export const useTopPlayers = (id: Id, category: TopPlayerCategory) =>
  useQuery({
    queryKey: queryKeys.topPlayers(id, category),
    queryFn: () => provider.getTopPlayers(id, category),
    staleTime: staleTimes.standings,
    enabled: id !== '',
  })

export const useFixturesByDate = (date: string) =>
  useQuery({
    queryKey: queryKeys.fixturesByDate(date),
    queryFn: () => provider.getFixturesByDate(date),
    staleTime: date === todayKey() ? staleTimes.live : staleTimes.fixtures,
    // Nur pollen, solange am gewählten Tag tatsächlich Spiele laufen.
    refetchInterval: (q) => (hasLive(q.state.data) ? LIVE_REFRESH_MS : false),
  })

export const useFixtureDetails = (id: Id) =>
  useQuery({
    queryKey: queryKeys.fixture(id),
    queryFn: () => provider.getFixtureDetails(id),
    staleTime: (q) => {
      const status = q.state.data?.fixture.status
      if (status && isFinished(status)) return Number.POSITIVE_INFINITY
      return staleTimes.live
    },
    refetchInterval: (q) => {
      const fixture = q.state.data?.fixture
      if (!fixture) return false
      if (needsLiveRefresh(fixture)) return LIVE_REFRESH_MS
      // Vor dem Spiel gelegentlich prüfen (Aufstellung).
      if (fixture.status === 'scheduled') return 2 * MINUTE
      return false
    },
  })

export const useTeam = (id: Id) =>
  useQuery({ queryKey: queryKeys.team(id), queryFn: () => provider.getTeam(id), staleTime: staleTimes.static })

export const useTeamFixtures = (id: Id) =>
  useQuery({
    queryKey: queryKeys.teamFixtures(id),
    queryFn: () => provider.getTeamFixtures(id),
    staleTime: staleTimes.fixtures,
    refetchInterval: (q) => (hasLive(q.state.data) ? LIVE_REFRESH_MS : false),
  })

export const useSquad = (id: Id) =>
  useQuery({ queryKey: queryKeys.squad(id), queryFn: () => provider.getSquad(id), staleTime: staleTimes.static })

export const usePlayer = (id: Id) =>
  useQuery({ queryKey: queryKeys.player(id), queryFn: () => provider.getPlayer(id), staleTime: staleTimes.standings })

/**
 * Frei lizenziertes Spielerfoto (Wikimedia Commons).
 * Im Demo-Modus nie – die erfundenen Namen könnten sonst echten Personen zugeordnet werden.
 */
export const usePlayerPhoto = (player: Pick<Player, 'id' | 'name' | 'birthDate'> | undefined) =>
  useQuery({
    queryKey: ['photo', player?.id],
    queryFn: () =>
      findPlayerPhoto({
        name: player!.name,
        birthDate: player!.birthDate,
        // Die Spieler-IDs sind bei ESPN die ESPN-IDs – nur dann für die exakte Zuordnung nutzen
        espnId: provider.id === 'espn' ? player!.id : undefined,
      }),
    enabled: player !== undefined && !provider.isDemo,
    staleTime: Number.POSITIVE_INFINITY,
    retry: 1,
  })

/**
 * Fotos für viele Spieler (Kader, Aufstellung) – gebündelt abgefragt, Ergebnis je Spieler-ID.
 * `scope` unterscheidet die Listen im Cache, z. B. "squad:432" oder "lineup:401861074".
 */
export const usePlayersPhotos = (scope: string, players: Pick<Player, 'id' | 'name' | 'birthDate'>[] | undefined) =>
  useQuery({
    queryKey: ['photos', scope, players?.length, players?.filter((p) => p.birthDate).length],
    queryFn: async () => {
      const list = players ?? []
      const queries = list.map((p) => ({
        name: p.name,
        birthDate: p.birthDate,
        espnId: provider.id === 'espn' ? p.id : undefined,
      }))
      const found = await findPlayerPhotos(queries)
      return Object.fromEntries(list.map((p, i) => [p.id, found.get(photoKey(queries[i]!)) ?? null]))
    },
    enabled: !!players?.length && !provider.isDemo,
    staleTime: Number.POSITIVE_INFINITY,
    retry: 1,
  })

export const useSearch = (q: string) =>
  useQuery({
    queryKey: queryKeys.search(q),
    queryFn: () => provider.search(q),
    enabled: q.trim().length >= 2,
    staleTime: staleTimes.static,
    placeholderData: (prev) => prev,
  })

// ------------------------------------------------------------ Zusatzquelle FotMob (Noten, Ausfälle)

/** FotMob nur mit echten Daten – im Demo-Modus würden erfundene Namen echten Spielern zugeordnet. */
const extrasEnabled = !provider.isDemo

/** FotMob-Kader eines Teams: Saisonnoten und Verletzungen */
export const useTeamExtras = (team: Pick<Team, 'id' | 'name' | 'shortName'> | undefined) =>
  useQuery({
    queryKey: ['fotmob', 'team', team?.id],
    queryFn: async () => {
      const fmId = await fotmob.findTeamId(team!)
      return fmId ? fotmob.getSquad(fmId) : []
    },
    enabled: extrasEnabled && team !== undefined,
    staleTime: staleTimes.standings,
    retry: 1,
  })

/** FotMob-Noten und Ausfälle zu einem Spiel */
export const useMatchExtras = (fixture: Fixture | undefined) =>
  useQuery({
    queryKey: ['fotmob', 'match', fixture?.id],
    queryFn: () => fotmob.getMatch(fixture!).then((m) => m ?? null),
    enabled: extrasEnabled && fixture !== undefined,
    staleTime: fixture && isFinished(fixture.status) ? Number.POSITIVE_INFINITY : staleTimes.live,
    // Noten ändern sich langsamer als Spielstand und Ereignisse
    refetchInterval: fixture && isLive(fixture.status) ? 15_000 : false,
    retry: 1,
  })
