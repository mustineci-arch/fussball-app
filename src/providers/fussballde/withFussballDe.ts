/**
 * Ergänzt einen beliebigen Anbieter um Amateur-/Jugendligen von fussball.de.
 * Die Daten liegen als statische JSON-Datei neben der App (public/data/fussballde.json)
 * und werden automatisch per GitHub Action aktualisiert (scripts/sync-fussballde.mjs).
 * Alle IDs beginnen mit "fde-" – daran erkennt der Wrapper, wer zuständig ist.
 */
import { isOnDate } from '../../domain/date'
import { normalizeText } from '../../domain/text'
import type {
  Competition,
  Fixture,
  FixtureDetails,
  Id,
  SearchResults,
  Season,
  StandingTable,
  Team,
} from '../../domain/types'
import { NotFoundError, ProviderError } from '../errors'
import type { FootballProvider } from '../FootballProvider'
import type { FdeCompetition, FdeData } from './types'

export const FDE_PREFIX = 'fde-'
export const isFde = (id: Id) => id.startsWith(FDE_PREFIX)

const DATA_URL = `${import.meta.env.BASE_URL}data/fussballde.json`

export type FdeLoader = () => Promise<FdeData>

const fetchData: FdeLoader = async () => {
  const res = await fetch(DATA_URL, { cache: 'no-cache' })
  if (!res.ok) throw new ProviderError(`fussball.de-Daten nicht verfügbar (${res.status})`)
  return (await res.json()) as FdeData
}

const toCompetition = (c: FdeCompetition, index: number): Competition => ({
  id: c.id,
  slug: c.id,
  name: c.name,
  shortName: c.shortName,
  type: 'league',
  country: c.region,
  // Hinter den Profiligen einsortieren
  priority: 500 + index,
})

function toTeam(c: FdeCompetition, teamId: Id): Team {
  const t = c.teams.find((x) => x.id === teamId)
  return {
    id: teamId,
    slug: teamId,
    name: t?.name ?? teamId,
    shortName: t?.shortName ?? t?.name ?? teamId,
    logoUrl: t?.logoUrl,
    league: c.name,
  }
}

function toFixtures(c: FdeCompetition): Fixture[] {
  return c.matches
    .map(
      (m): Fixture => ({
        id: m.id,
        competitionId: c.id,
        round: m.round,
        kickoffAt: m.kickoffAt,
        status: m.cancelled ? 'cancelled' : m.score ? 'finished' : 'scheduled',
        homeTeam: toTeam(c, m.homeTeamId),
        awayTeam: toTeam(c, m.awayTeamId),
        score: m.score,
        venue: m.venue,
      }),
    )
    .sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt))
}

function toStandings(c: FdeCompetition): StandingTable {
  return {
    competitionId: c.id,
    zones: [],
    rows: [...c.table]
      .sort((a, b) => a.rank - b.rank)
      .map((r) => ({
        rank: r.rank,
        team: toTeam(c, r.teamId),
        played: r.played,
        won: r.won,
        drawn: r.drawn,
        lost: r.lost,
        goalsFor: r.goalsFor,
        goalsAgainst: r.goalsAgainst,
        points: r.points,
      })),
  }
}

/** Anbieter-Fehler der Zusatzdaten dürfen die Profiligen nie blockieren */
async function orEmpty<T>(promise: Promise<T[]>): Promise<T[]> {
  try {
    return await promise
  } catch {
    return []
  }
}

export function withFussballDe(base: FootballProvider, load: FdeLoader = fetchData): FootballProvider {
  let cache: { at: number; data: Promise<FdeData> } | undefined
  const data = () => {
    // Höchstens alle 5 Minuten neu laden
    if (!cache || Date.now() - cache.at > 5 * 60_000) {
      const promise = load()
      promise.catch(() => (cache = undefined))
      cache = { at: Date.now(), data: promise }
    }
    return cache.data
  }
  const comps = async () => (await data()).competitions
  const comp = async (id: Id) => {
    const found = (await comps()).find((c) => c.id === id)
    if (!found) throw new NotFoundError('Wettbewerb', id)
    return found
  }
  const compOfTeam = async (teamId: Id) => {
    const found = (await comps()).find((c) => c.teams.some((t) => t.id === teamId))
    if (!found) throw new NotFoundError('Team', teamId)
    return found
  }
  const allFixtures = async () => (await comps()).flatMap(toFixtures)

  return {
    id: base.id,
    displayName: `${base.displayName} + fussball.de`,
    isDemo: base.isDemo,
    topPlayerCategories: base.topPlayerCategories,

    async getCompetitions() {
      const extra = await orEmpty(comps().then((list) => list.map(toCompetition)))
      return [...(await base.getCompetitions()), ...extra]
    },
    async getCompetition(id) {
      if (!isFde(id)) return base.getCompetition(id)
      const list = await comps()
      const c = await comp(id)
      const season: Season = { id: `${id}-${c.season}`, competitionId: id, label: c.season }
      return { competition: toCompetition(c, list.indexOf(c)), season }
    },
    async getCompetitionFixtures(id) {
      return isFde(id) ? toFixtures(await comp(id)) : base.getCompetitionFixtures(id)
    },
    async getSeasonFixtures(id) {
      return isFde(id) ? toFixtures(await comp(id)) : base.getSeasonFixtures(id)
    },
    async getCompetitionTeams(id) {
      if (!isFde(id)) return base.getCompetitionTeams(id)
      const c = await comp(id)
      return c.teams.map((t) => toTeam(c, t.id)).sort((a, b) => a.name.localeCompare(b.name, 'de'))
    },
    async getStandings(id) {
      if (!isFde(id)) return base.getStandings(id)
      const c = await comp(id)
      return c.table.length ? [toStandings(c)] : []
    },
    async getTopPlayers(id, category) {
      return isFde(id) ? [] : base.getTopPlayers(id, category)
    },

    async getFixturesByDate(dateKey) {
      const [own, extra] = await Promise.all([
        base.getFixturesByDate(dateKey),
        orEmpty(allFixtures().then((list) => list.filter((f) => isOnDate(f.kickoffAt, dateKey)))),
      ])
      return [...own, ...extra]
    },
    async getFixtureDetails(id): Promise<FixtureDetails> {
      if (!isFde(id)) return base.getFixtureDetails(id)
      const fixture = (await allFixtures()).find((f) => f.id === id)
      if (!fixture) throw new NotFoundError('Spiel', id)
      return { fixture }
    },

    async getTeam(id) {
      if (!isFde(id)) return base.getTeam(id)
      const c = await compOfTeam(id)
      return { team: toTeam(c, id), competitionIds: [c.id] }
    },
    async getTeamFixtures(id) {
      if (!isFde(id)) return base.getTeamFixtures(id)
      const c = await compOfTeam(id)
      return toFixtures(c).filter((f) => f.homeTeam.id === id || f.awayTeam.id === id)
    },
    async getSquad(id) {
      return isFde(id) ? [] : base.getSquad(id)
    },
    getPlayer: (id) => base.getPlayer(id),

    async search(query): Promise<SearchResults> {
      const q = normalizeText(query)
      const [own, list] = await Promise.all([base.search(query), orEmpty(comps())])
      const teams = list.flatMap((c) => c.teams.filter((t) => normalizeText(t.name).includes(q)).map((t) => toTeam(c, t.id)))
      const competitions = list.map(toCompetition).filter((c) => normalizeText(c.name).includes(q))
      return { ...own, teams: [...own.teams, ...teams], competitions: [...own.competitions, ...competitions] }
    },
  }
}
