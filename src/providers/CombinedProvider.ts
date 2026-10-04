/**
 * ESPN als Hauptquelle, FotMob für Wettbewerbe, die ESPN nicht führt (türkischer Pokal).
 * Die Zuordnung läuft über ID-Präfixe: "fm-" (Spiele), "fmt-" (Teams), "fmp-" (Spieler) gehören zu FotMob,
 * alles andere zu ESPN. FotMob-Teams, die ESPN kennt (Süper Lig), werden als ESPN-Teams geführt –
 * so funktionieren Teamseiten, Favoriten und Logos einheitlich.
 */
import { isOnDate } from '../domain/date'
import { isFinished, needsLiveRefresh } from '../domain/status'
import { normalizeText } from '../domain/text'
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
import { getLanguage, subscribeLanguage } from '../i18n'
import { ttl } from './espn/client'
import { EspnProvider } from './espn/EspnProvider'
import { isTurkishContext } from './espn/nameFixes'
import { NotFoundError } from './errors'
import type { FootballProvider } from './FootballProvider'
import {
  FM_MATCH,
  FM_PLAYER,
  FM_TEAM,
  fmLeagueLogo,
  fotmobTeam,
  mapLeagueFixtures,
  mapLeagueStandings,
  mapMatchDetails,
  mapPlayerData,
  mapTeamDetails,
  mapTeamFixtures,
  mapTeamSquad,
  type CompetitionResolver,
  type TeamResolver,
} from './fotmob/cupMappers'
import { fotmobGet } from './fotmob/fotmob'
import type { RawFmLeague, RawFmMatchFull, RawFmPlayerData, RawFmTeamFull } from './fotmob/raw'

export const TURKISH_CUP_ID = 'c-turkish-cup'
const TURKISH_CUP_FM = 151

/** FotMob-Ligen, die die App als eigene Wettbewerbe kennt */
const KNOWN_FM_LEAGUES: Record<number, string> = { [TURKISH_CUP_FM]: TURKISH_CUP_ID, 71: 'c-super-lig' }

const resolveCompetition: CompetitionResolver = (fmLeagueId) =>
  fmLeagueId !== undefined ? (KNOWN_FM_LEAGUES[fmLeagueId] ?? `fml-${fmLeagueId}`) : 'fml-unknown'

function turkishCup(): Competition {
  const de = getLanguage() === 'de'
  return {
    id: TURKISH_CUP_ID,
    slug: 'turkish-cup',
    name: de ? 'Türkischer Pokal' : 'Turkish Cup',
    shortName: de ? 'Türkischer Pokal' : 'Turkish Cup',
    type: 'cup',
    country: de ? 'Türkei' : 'Türkiye',
    logoUrl: fmLeagueLogo(TURKISH_CUP_FM),
    // direkt nach der Süper Lig (Priorität 1)
    priority: 1.5,
  }
}

/** Vereinsnamen ohne Zusätze, zusammengeschrieben ("İstanbul Başakşehir FK" → "istanbulbasaksehir") */
const compactName = (name: string) =>
  normalizeText(name)
    .replace(/\b(fk|sk|as|jk|fc|spor kulubu|kulubu)\b/g, '')
    .replace(/[^a-z0-9]+/g, '')

const sameClub = (a: string, b: string) => {
  const x = compactName(a)
  const y = compactName(b)
  return x.length >= 4 && y.length >= 4 && (x.includes(y) || y.includes(x))
}

export class CombinedProvider implements FootballProvider {
  readonly id = 'espn'
  readonly displayName = 'ESPN + FotMob (inoffizielle Schnittstellen)'
  readonly isDemo = false
  readonly topPlayerCategories: readonly TopPlayerCategory[]

  private teamMap?: Promise<Team[]>
  private readonly resolved = new Map<number, Team>()

  constructor(private readonly espn = new EspnProvider()) {
    this.topPlayerCategories = espn.topPlayerCategories
    // Teamnamen hängen von der Sprache ab
    subscribeLanguage(() => {
      this.teamMap = undefined
      this.resolved.clear()
    })
  }

  // ------------------------------------------------------------ Wettbewerbe

  async getCompetitions(): Promise<Competition[]> {
    const list = await this.espn.getCompetitions()
    return [...list, turkishCup()].sort((a, b) => a.priority - b.priority)
  }

  async getCompetition(id: Id): Promise<{ competition: Competition; season?: Season }> {
    if (id !== TURKISH_CUP_ID) return this.espn.getCompetition(id)
    const raw = await this.cupLeague()
    const label = raw.details?.selectedSeason
    return { competition: turkishCup(), season: label ? { id: `${id}-${label}`, competitionId: id, label } : undefined }
  }

  async getCompetitionFixtures(competitionId: Id): Promise<Fixture[]> {
    if (competitionId !== TURKISH_CUP_ID) return this.espn.getCompetitionFixtures(competitionId)
    return this.cupFixtures()
  }

  async getCompetitionTeams(competitionId: Id): Promise<Team[]> {
    if (competitionId !== TURKISH_CUP_ID) return this.espn.getCompetitionTeams(competitionId)
    const teams = new Map<string, Team>()
    for (const f of await this.cupFixtures()) for (const t of [f.homeTeam, f.awayTeam]) teams.set(t.id, t)
    return [...teams.values()].sort((a, b) => a.name.localeCompare(b.name, 'tr'))
  }

  async getStandings(competitionId: Id): Promise<StandingTable[]> {
    if (competitionId !== TURKISH_CUP_ID) return this.espn.getStandings(competitionId)
    const [raw, resolve] = await Promise.all([this.cupLeague(), this.teamResolver()])
    return mapLeagueStandings(raw, competitionId, resolve)
  }

  async getTopPlayers(competitionId: Id, category: TopPlayerCategory): Promise<TopPlayerEntry[]> {
    if (competitionId === TURKISH_CUP_ID || competitionId.startsWith('fml-')) return []
    return this.espn.getTopPlayers(competitionId, category)
  }

  // ------------------------------------------------------------ Spiele

  async getFixturesByDate(dateKey: string): Promise<Fixture[]> {
    const [espn, cup] = await Promise.all([
      this.espn.getFixturesByDate(dateKey),
      // Der Pokal ist eine Ergänzung – fällt FotMob aus, bleiben die ESPN-Spiele sichtbar.
      this.cupFixtures()
        .then((list) => this.withLiveState(list.filter((f) => isOnDate(f.kickoffAt, dateKey))))
        .catch(() => [] as Fixture[]),
    ])
    return [...espn, ...cup].sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt))
  }

  async getFixtureDetails(fixtureId: Id): Promise<FixtureDetails> {
    if (!fixtureId.startsWith(FM_MATCH)) return this.espn.getFixtureDetails(fixtureId)
    const details = await this.fmMatch(fixtureId.slice(FM_MATCH.length))
    if (!details) throw new NotFoundError('Spiel', fixtureId)
    return details
  }

  // ------------------------------------------------------------ Teams & Spieler

  async getTeam(teamId: Id): Promise<{ team: Team; competitionIds: Id[] }> {
    if (!teamId.startsWith(FM_TEAM)) return this.espn.getTeam(teamId)
    const fmId = Number(teamId.slice(FM_TEAM.length))
    const raw = await this.fmTeam(fmId)
    return { team: mapTeamDetails(raw, fmId), competitionIds: [TURKISH_CUP_ID] }
  }

  async getTeamFixtures(teamId: Id): Promise<Fixture[]> {
    if (teamId.startsWith(FM_TEAM)) {
      const [raw, resolve] = await Promise.all([this.fmTeam(Number(teamId.slice(FM_TEAM.length))), this.teamResolver()])
      return mapTeamFixtures(raw, resolve, resolveCompetition)
    }
    const espn = await this.espn.getTeamFixtures(teamId)
    if (!isTurkishContext({ teamId })) return espn
    // Türkische Teams: Pokalspiele aus FotMob ergänzen
    const cup = await this.cupFixtures().catch(() => [] as Fixture[])
    const own = cup.filter((f) => f.homeTeam.id === teamId || f.awayTeam.id === teamId)
    return [...espn, ...(await this.withLiveState(own))].sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt))
  }

  async getSquad(teamId: Id): Promise<Player[]> {
    if (!teamId.startsWith(FM_TEAM)) return this.espn.getSquad(teamId)
    const fmId = Number(teamId.slice(FM_TEAM.length))
    const raw = await this.fmTeam(fmId)
    return mapTeamSquad(raw, mapTeamDetails(raw, fmId))
  }

  async getPlayer(playerId: Id): Promise<PlayerProfile> {
    if (!playerId.startsWith(FM_PLAYER)) return this.espn.getPlayer(playerId)
    const id = playerId.slice(FM_PLAYER.length)
    if (!/^\d+$/.test(id)) throw new NotFoundError('Spieler', playerId)
    const [raw, resolve] = await Promise.all([fotmobGet<RawFmPlayerData>('playerData', { id }, ttl.medium), this.teamResolver()])
    const profile = mapPlayerData(raw, resolve, resolveCompetition)
    if (!profile) throw new NotFoundError('Spieler', playerId)
    return profile
  }

  async search(query: string): Promise<SearchResults> {
    const results = await this.espn.search(query)
    const needle = normalizeText(query.trim())
    const cup = turkishCup()
    const matchesCup = needle.length >= 2 && [cup.name, 'türkiye kupası', 'ziraat', 'pokal', 'kupa', 'cup'].some((n) => normalizeText(n).includes(needle))
    return matchesCup ? { ...results, competitions: [...results.competitions, cup] } : results
  }

  // ------------------------------------------------------------ intern

  private cupLeague(): Promise<RawFmLeague> {
    return fotmobGet<RawFmLeague>('leagues', { id: String(TURKISH_CUP_FM) }, (raw) => {
      const now = Date.now()
      const live = (raw.fixtures?.allMatches ?? []).some((m) => {
        if (m.status?.started && !m.status.finished) return true
        const kickoff = m.status?.utcTime ? Date.parse(m.status.utcTime) : NaN
        return !m.status?.started && kickoff - now < 2 * 60_000 && now - kickoff < 20 * 60_000
      })
      return live ? ttl.live : ttl.medium
    })
  }

  private async cupFixtures(): Promise<Fixture[]> {
    const [raw, resolve] = await Promise.all([this.cupLeague(), this.teamResolver()])
    return mapLeagueFixtures(raw, TURKISH_CUP_ID, resolve)
  }

  private fmTeam(fmId: number): Promise<RawFmTeamFull> {
    if (!Number.isFinite(fmId)) return Promise.reject(new NotFoundError('Team', String(fmId)))
    return fotmobGet<RawFmTeamFull>('teams', { id: String(fmId) }, ttl.medium)
  }

  private async fmMatch(matchId: string): Promise<FixtureDetails | undefined> {
    if (!/^\d+$/.test(matchId)) return undefined
    const [raw, resolve] = await Promise.all([
      fotmobGet<RawFmMatchFull>('matchDetails', { matchId }, (d) =>
        d.general?.finished ? ttl.long : d.general?.started ? ttl.live : ttl.short,
      ),
      this.teamResolver(),
    ])
    return mapMatchDetails(raw, resolve, resolveCompetition)
  }

  /**
   * Die Spielplanliste von FotMob wird bis zu 40 s zwischengespeichert –
   * laufende Spiele daher einzeln über die Spieldetails aktualisieren.
   */
  private async withLiveState(fixtures: Fixture[]): Promise<Fixture[]> {
    return Promise.all(
      fixtures.map(async (f) => {
        if (!needsLiveRefresh(f) || isFinished(f.status)) return f
        const fresh = await this.fmMatch(f.id.slice(FM_MATCH.length)).catch(() => undefined)
        if (!fresh) return f
        const { status, minute, extraMinute, score } = fresh.fixture
        return { ...f, status, minute, extraMinute, score }
      }),
    )
  }

  /** FotMob-Team → ESPN-Team (Süper Lig), sonst FotMob-Team */
  private async teamResolver(): Promise<TeamResolver> {
    this.teamMap ??= this.espn.getCompetitionTeams('c-super-lig').catch(() => {
      this.teamMap = undefined
      return []
    })
    const espnTeams = await this.teamMap
    return (fmId, name) => {
      const known = this.resolved.get(fmId)
      if (known) return known
      const candidates = espnTeams.filter((t) => sameClub(t.name, name) || sameClub(t.shortName, name))
      const team = candidates.length === 1 ? candidates[0]! : fotmobTeam(fmId, name)
      this.resolved.set(fmId, team)
      return team
    }
  }
}
