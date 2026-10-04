/**
 * FotMob-Rohdaten → internes Datenmodell (für Wettbewerbe, die ESPN nicht führt – z. B. den türkischen Pokal).
 * Grundsatz wie bei ESPN: Was FotMob nicht liefert, bleibt leer.
 * IDs bekommen Präfixe, damit die App sie der richtigen Quelle zuordnen kann:
 * Spiele "fm-", Teams "fmt-" (nur wenn kein ESPN-Team passt), Spieler "fmp-".
 */
import { slugify } from '../../domain/text'
import type {
  Fixture,
  FixtureDetails,
  FixtureStatus,
  Lineup,
  LineupPlayer,
  MatchEvent,
  MatchStatistic,
  Player,
  PlayerPosition,
  PlayerProfile,
  PlayerSeasonStats,
  Score,
  StandingTable,
  StandingZone,
  Team,
} from '../../domain/types'
import { getLanguage } from '../../i18n'
import { localizeCountry } from '../espn/countryNames'
import { mapFmInjury } from './fotmob'
import type {
  RawFmEvent,
  RawFmLeague,
  RawFmLeagueMatch,
  RawFmLineupTeamFull,
  RawFmMatchFull,
  RawFmPlayerData,
  RawFmStatus,
  RawFmTableGroup,
  RawFmTeamFull,
} from './raw'

export const FM_MATCH = 'fm-'
export const FM_TEAM = 'fmt-'
export const FM_PLAYER = 'fmp-'

/** Liefert zu einer FotMob-Team-ID das Team der App (ESPN-Team, wenn zugeordnet, sonst FotMob-Team) */
export type TeamResolver = (fmId: number, name: string) => Team

/** FotMob-Liga-ID → Wettbewerbs-ID der App */
export type CompetitionResolver = (fmLeagueId: number | undefined) => string

export const fmTeamLogo = (fmId: number | string) => `https://images.fotmob.com/image_resources/logo/teamlogo/${fmId}.png`
export const fmLeagueLogo = (fmId: number | string) => `https://images.fotmob.com/image_resources/logo/leaguelogo/${fmId}.png`

/** FotMob schreibt manche Länder anders als ESPN ("Turkiye") – vor der Übersetzung angleichen */
const COUNTRY_ALIASES: Record<string, string> = { turkiye: 'Turkey', türkiye: 'Turkey' }
const country = (name: string | undefined) => {
  if (!name) return undefined
  const english = COUNTRY_ALIASES[name.trim().toLowerCase()] ?? name
  return localizeCountry(english, getLanguage()) ?? name
}

const num = (v: unknown): number | undefined => {
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : undefined
}

export function fotmobTeam(fmId: number, name: string): Team {
  return { id: `${FM_TEAM}${fmId}`, slug: slugify(name), name, shortName: name, logoUrl: fmTeamLogo(fmId) }
}

// ------------------------------------------------------------ Status, Ergebnis, Runde

export function mapFmStatus(raw: RawFmStatus | undefined): Pick<Fixture, 'status' | 'minute' | 'extraMinute'> {
  const short = (raw?.reason?.short ?? '').toLowerCase()
  if (raw?.cancelled) return { status: /postp|pp/.test(short) ? 'postponed' : 'cancelled' }
  if (/^(pp|postp)/.test(short)) return { status: 'postponed' }
  if (/^ab/.test(short)) return { status: 'abandoned' }
  if (raw?.finished) {
    if (short.includes('pen') || short === 'ap') return { status: 'finished_pen' }
    if (short === 'aet') return { status: 'finished_aet' }
    return { status: 'finished' }
  }
  if (!raw?.started) return { status: 'scheduled' }

  const live = raw.liveTime?.short ?? ''
  if (/ht|pause/i.test(live) || short === 'ht') return { status: 'halftime' }
  if (/pen/i.test(live) || short.includes('pen')) return { status: 'penalties' }
  const m = /(\d+)(?:\s*\+\s*(\d+))?/.exec(live)
  const minute = m ? Number(m[1]) : undefined
  const extraMinute = m?.[2] ? Number(m[2]) : undefined
  const clock = { minute, extraMinute }
  if (raw.halfs?.firstExtraHalfStarted || (minute ?? 0) > 90) return { status: 'extra_time', ...clock }
  if (raw.halfs?.secondHalfStarted || (minute ?? 0) > 45) return { status: 'live_2h', ...clock }
  return { status: 'live_1h', ...clock }
}

export function parseScore(scoreStr: string | undefined): Score | undefined {
  const m = /^\s*(\d+)\s*-\s*(\d+)/.exec(scoreStr ?? '')
  return m ? { home: Number(m[1]), away: Number(m[2]) } : undefined
}

const ROUND_NAMES: Record<string, { de: string; en: string }> = {
  final: { de: 'Finale', en: 'Final' },
  '1/2': { de: 'Halbfinale', en: 'Semi-finals' },
  '1/4': { de: 'Viertelfinale', en: 'Quarter-finals' },
  '1/8': { de: 'Achtelfinale', en: 'Round of 16' },
  '1/16': { de: 'Sechzehntelfinale', en: 'Round of 32' },
}

/** "3" → "3. Runde", "1/4" → "Viertelfinale" */
export function roundLabel(round: string | number | undefined, roundName?: string | number): string | undefined {
  const key = String(round ?? '').toLowerCase()
  const language = getLanguage()
  if (ROUND_NAMES[key]) return ROUND_NAMES[key][language]
  if (/^\d+$/.test(key)) return language === 'de' ? `${key}. Runde` : `Round ${key}`
  return roundName !== undefined && roundName !== '' ? String(roundName) : undefined
}

const hasScore = (status: FixtureStatus) => status !== 'scheduled' && status !== 'postponed' && status !== 'cancelled'

// ------------------------------------------------------------ Spielplan und Tabelle eines Wettbewerbs

export function mapLeagueMatch(raw: RawFmLeagueMatch, competitionId: string, resolveTeam: TeamResolver): Fixture | undefined {
  const homeId = num(raw.home?.id)
  const awayId = num(raw.away?.id)
  if (raw.id === undefined || !homeId || !awayId || !raw.status?.utcTime) return undefined
  const state = mapFmStatus(raw.status)
  return {
    id: `${FM_MATCH}${raw.id}`,
    competitionId,
    round: roundLabel(raw.round, raw.roundName),
    kickoffAt: new Date(raw.status.utcTime).toISOString(),
    ...state,
    homeTeam: resolveTeam(homeId, raw.home?.name ?? '–'),
    awayTeam: resolveTeam(awayId, raw.away?.name ?? '–'),
    score: hasScore(state.status) ? parseScore(raw.status.scoreStr) : undefined,
  }
}

export function mapLeagueFixtures(raw: RawFmLeague, competitionId: string, resolveTeam: TeamResolver): Fixture[] {
  return (raw.fixtures?.allMatches ?? [])
    .flatMap((m) => mapLeagueMatch(m, competitionId, resolveTeam) ?? [])
    .sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt))
}

/** "Cup Grp. A" → "Gruppe A" */
const groupName = (name: string | undefined) => {
  const letter = /grp\.?\s*([a-z0-9]+)$/i.exec(name ?? '')?.[1]
  if (!letter) return name
  return getLanguage() === 'de' ? `Gruppe ${letter}` : `Group ${letter}`
}

function mapZones(legend: RawFmTableGroup['legend']): StandingZone[] {
  const zones: StandingZone[] = []
  for (const entry of legend ?? []) {
    const possible = /possible/.test(entry.tKey ?? '')
    const indices = [...(entry.indices ?? [])].sort((a, b) => a - b)
    for (const index of indices) {
      const rank = index + 1
      const last = zones.at(-1)
      const kind = possible ? 'playoff' : 'qualification'
      if (last && last.kind === kind && last.toRank === rank - 1) last.toRank = rank
      else zones.push({ kind, label: possible ? 'playoff' : 'qualification', fromRank: rank, toRank: rank })
    }
  }
  return zones.sort((a, b) => a.fromRank - b.fromRank)
}

export function mapLeagueStandings(raw: RawFmLeague, competitionId: string, resolveTeam: TeamResolver): StandingTable[] {
  const data = raw.table?.[0]?.data
  const groups: RawFmTableGroup[] = data?.tables?.length ? data.tables : data?.table ? [{ table: data.table, legend: data.legend }] : []
  const multiple = groups.length > 1
  return groups.flatMap((g): StandingTable[] => {
    const rows = (g.table?.all ?? []).flatMap((r) => {
      if (!r.id || !r.name) return []
      const [goalsFor = 0, goalsAgainst = 0] = (r.scoresStr ?? '').split('-').map((x) => Number(x.trim()) || 0)
      return [
        {
          rank: r.idx ?? 0,
          team: resolveTeam(r.id, r.name),
          played: r.played ?? 0,
          won: r.wins ?? 0,
          drawn: r.draws ?? 0,
          lost: r.losses ?? 0,
          goalsFor,
          goalsAgainst,
          points: r.pts ?? 0,
        },
      ]
    })
    return rows.length ? [{ competitionId, groupName: multiple ? groupName(g.leagueName) : undefined, rows, zones: mapZones(g.legend) }] : []
  })
}

// ------------------------------------------------------------ Spieldetails

const POSITIONS: readonly PlayerPosition[] = ['GK', 'DF', 'MF', 'FW']
const positionOf = (usual: number | undefined, positionId?: number): PlayerPosition | undefined =>
  positionId === 11 ? 'GK' : usual !== undefined ? POSITIONS[usual] : undefined

const fmPlayerRef = (id: number | string | null | undefined, name: string | undefined) =>
  id && name ? { id: `${FM_PLAYER}${id}`, name } : undefined

function mapLineup(raw: RawFmLineupTeamFull | undefined, teamId: string): Lineup | undefined {
  const startersRaw = raw?.starters ?? []
  if (startersRaw.length < 11) return undefined

  // Reihen aus den Feldkoordinaten: gleiche Höhe = gleiche Reihe (Torwart zuerst), innerhalb von links nach rechts
  const rowKeys = [...new Set(startersRaw.map((p) => Math.round((p.verticalLayout?.y ?? 0) * 100)))].sort((a, b) => a - b)
  const starters = startersRaw.flatMap((p): LineupPlayer[] => {
    const ref = fmPlayerRef(p.id, p.name)
    if (!ref) return []
    const y = Math.round((p.verticalLayout?.y ?? 0) * 100)
    const sameRow = startersRaw
      .filter((q) => Math.round((q.verticalLayout?.y ?? 0) * 100) === y)
      .sort((a, b) => (a.verticalLayout?.x ?? 0) - (b.verticalLayout?.x ?? 0))
    return [
      {
        player: { ...ref, position: positionOf(p.usualPlayingPositionId, p.positionId) },
        shirtNumber: num(p.shirtNumber),
        gridRow: rowKeys.indexOf(y) + 1,
        gridCol: sameRow.indexOf(p) + 1,
        subbedOut: p.performance?.substitutionEvents?.some((e) => e.type === 'subOut') || undefined,
      },
    ]
  })
  const substitutes = (raw?.subs ?? []).flatMap((p): LineupPlayer[] => {
    const ref = fmPlayerRef(p.id, p.name)
    if (!ref) return []
    return [
      {
        player: { ...ref, position: positionOf(p.usualPlayingPositionId) },
        shirtNumber: num(p.shirtNumber),
        subbedIn: p.performance?.substitutionEvents?.some((e) => e.type === 'subIn') || undefined,
      },
    ]
  })
  return { teamId, formation: raw?.formation, coach: raw?.coach?.name, starters, substitutes }
}

function mapEvent(raw: RawFmEvent, fixtureId: string, homeId: string, awayId: string, index: number): MatchEvent | undefined {
  if (raw.isPenaltyShootoutEvent || raw.time === undefined) return undefined
  const base = {
    id: `${fixtureId}-${index}`,
    fixtureId,
    teamId: raw.isHome ? homeId : awayId,
    minute: raw.time,
    extraMinute: raw.overloadTime || undefined,
  }
  switch (raw.type) {
    case 'Goal': {
      const type = raw.ownGoal ? 'own_goal' : /penalty/i.test(raw.goalDescription ?? '') ? 'penalty_goal' : 'goal'
      return {
        ...base,
        type,
        player: fmPlayerRef(raw.player?.id, raw.player?.name),
        relatedPlayer: type === 'goal' ? fmPlayerRef(raw.assistPlayerId, raw.assistInput) : undefined,
      }
    }
    case 'Card': {
      const card = (raw.card ?? '').toLowerCase()
      const type = card === 'yellow' ? 'yellow' : card.includes('yellow') ? 'second_yellow' : 'red'
      return { ...base, type, player: fmPlayerRef(raw.player?.id, raw.player?.name) }
    }
    case 'Substitution': {
      const [inn, out] = raw.swap ?? []
      return { ...base, type: 'substitution', player: fmPlayerRef(inn?.id, inn?.name), relatedPlayer: fmPlayerRef(out?.id, out?.name) }
    }
    case 'MissedPenalty':
      return { ...base, type: 'penalty_missed', player: fmPlayerRef(raw.player?.id, raw.player?.name) }
    default:
      return undefined
  }
}

const STAT_KEYS: Record<string, MatchStatistic['key']> = {
  BallPossesion: 'possession',
  total_shots: 'shots_total',
  ShotsOnTarget: 'shots_on_target',
  ShotsOffTarget: 'shots_off_target',
  blocked_shots: 'shots_blocked',
  corners: 'corners',
  fouls: 'fouls',
  Offsides: 'offsides',
  yellow_cards: 'yellow_cards',
  red_cards: 'red_cards',
  passes: 'passes_total',
  expected_goals: 'xg',
  big_chance: 'big_chances',
  keeper_saves: 'saves',
}

/** "388 (87%)" → 87 für die Passquote, sonst die erste Zahl */
const statValue = (v: number | string | null | undefined, percent = false) => {
  if (typeof v === 'number') return v
  const text = String(v ?? '')
  return num(percent ? /\((\d+)%\)/.exec(text)?.[1] : text)
}

function mapStats(raw: RawFmMatchFull['content']): MatchStatistic[] {
  const all = (raw?.stats?.Periods?.All?.stats ?? []).flatMap((g) => g.stats ?? [])
  const result = new Map<MatchStatistic['key'], MatchStatistic>()
  for (const s of all) {
    const percent = s.key === 'accurate_passes'
    const key = percent ? 'pass_accuracy' : STAT_KEYS[s.key ?? '']
    if (!key || result.has(key)) continue
    const home = statValue(s.stats?.[0], percent)
    const away = statValue(s.stats?.[1], percent)
    if (home !== undefined && away !== undefined) result.set(key, { key, home, away })
  }
  return [...result.values()]
}

export function mapMatchDetails(
  raw: RawFmMatchFull,
  resolveTeam: TeamResolver,
  resolveCompetition: CompetitionResolver,
): FixtureDetails | undefined {
  const g = raw.general
  const homeFm = g?.homeTeam ?? raw.header?.teams?.[0]
  const awayFm = g?.awayTeam ?? raw.header?.teams?.[1]
  const kickoff = g?.matchTimeUTCDate ?? raw.header?.status?.utcTime
  if (!g?.matchId || !homeFm?.id || !awayFm?.id || !kickoff) return undefined

  const state = mapFmStatus(raw.header?.status)
  const homeTeam = resolveTeam(homeFm.id, homeFm.name ?? '–')
  const awayTeam = resolveTeam(awayFm.id, awayFm.name ?? '–')
  const fixtureId = `${FM_MATCH}${g.matchId}`
  const teams = raw.header?.teams
  const score =
    hasScore(state.status) && teams?.[0]?.score !== undefined && teams?.[1]?.score !== undefined
      ? { home: teams[0].score, away: teams[1].score }
      : hasScore(state.status)
        ? parseScore(raw.header?.status?.scoreStr)
        : undefined
  const fixture: Fixture = {
    id: fixtureId,
    competitionId: resolveCompetition(g.parentLeagueId ?? g.leagueId),
    round: roundLabel(g.leagueRoundName ?? undefined),
    kickoffAt: new Date(kickoff).toISOString(),
    ...state,
    homeTeam,
    awayTeam,
    score,
    venue: raw.content?.matchFacts?.infoBox?.Stadium?.name,
    referee: raw.content?.matchFacts?.infoBox?.Referee?.text,
  }
  const started = hasScore(state.status)
  const events = started
    ? (raw.content?.matchFacts?.events?.events ?? []).flatMap((e, i) => mapEvent(e, fixtureId, homeTeam.id, awayTeam.id, i) ?? [])
    : undefined
  const home = mapLineup(raw.content?.lineup?.homeTeam, homeTeam.id)
  const away = mapLineup(raw.content?.lineup?.awayTeam, awayTeam.id)
  return {
    fixture,
    events,
    lineups: home || away ? { home, away } : undefined,
    statistics: started ? mapStats(raw.content) : undefined,
  }
}

// ------------------------------------------------------------ Teams und Spieler

const GROUP_POSITIONS: Record<string, PlayerPosition> = { keepers: 'GK', defenders: 'DF', midfielders: 'MF', attackers: 'FW' }

export function mapTeamDetails(raw: RawFmTeamFull, fmId: number): Team {
  const name = raw.details?.name ?? '–'
  return {
    ...fotmobTeam(fmId, name),
    shortName: raw.details?.shortName ?? name,
    venue: raw.overview?.venue?.widget?.name,
    coach: raw.squad?.squad?.find((g) => g.title === 'coach')?.members?.[0]?.name,
    country: raw.details?.country === 'TUR' ? country('Turkey') : undefined,
  }
}

export function mapTeamSquad(raw: RawFmTeamFull, team: Team): Player[] {
  return (raw.squad?.squad ?? [])
    .filter((g) => g.title !== 'coach')
    .flatMap((g) =>
      (g.members ?? []).flatMap((m): Player[] => {
        if (!m.id || !m.name) return []
        return [
          {
            id: `${FM_PLAYER}${m.id}`,
            slug: slugify(m.name),
            name: m.name,
            birthDate: m.dateOfBirth?.slice(0, 10),
            nationality: country(m.cname),
            position: GROUP_POSITIONS[g.title ?? ''],
            shirtNumber: num(m.shirtNumber),
            teamId: team.id,
            teamName: team.name,
            injury: m.injured || m.injury ? mapFmInjury(m.injury?.expectedReturn ?? undefined) : undefined,
          },
        ]
      }),
    )
}

export function mapTeamFixtures(raw: RawFmTeamFull, resolveTeam: TeamResolver, resolveCompetition: CompetitionResolver): Fixture[] {
  return (raw.fixtures?.allFixtures?.fixtures ?? [])
    .flatMap((f): Fixture[] => {
      if (!f.id || !f.home?.id || !f.away?.id || !f.status?.utcTime) return []
      const state = mapFmStatus(f.status as RawFmStatus)
      return [
        {
          id: `${FM_MATCH}${f.id}`,
          competitionId: resolveCompetition(f.tournament?.leagueId),
          kickoffAt: new Date(f.status.utcTime).toISOString(),
          ...state,
          homeTeam: resolveTeam(f.home.id, f.home.name ?? '–'),
          awayTeam: resolveTeam(f.away.id, f.away.name ?? '–'),
          score: hasScore(state.status) && f.home.score !== undefined && f.away.score !== undefined ? { home: f.home.score, away: f.away.score } : undefined,
        },
      ]
    })
    .sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt))
}

const PLAYER_POSITIONS: Record<string, PlayerPosition> = { keeper: 'GK', goalkeeper: 'GK' }

export function mapPlayerData(raw: RawFmPlayerData, resolveTeam: TeamResolver, resolveCompetition: CompetitionResolver): PlayerProfile | undefined {
  if (!raw.id || !raw.name) return undefined
  const info = (key: string) => raw.playerInformation?.find((i) => i.translationKey === key)
  const countryName = info('country_sentencecase')?.value?.fallback
  const posKey = raw.positionDescription?.primaryPosition?.key ?? ''
  const position: PlayerPosition | undefined =
    PLAYER_POSITIONS[posKey] ?? (/back|defender/.test(posKey) ? 'DF' : /midfield|winger/.test(posKey) ? 'MF' : /striker|forward/.test(posKey) ? 'FW' : undefined)
  const team = raw.primaryTeam?.teamId ? resolveTeam(raw.primaryTeam.teamId, raw.primaryTeam.teamName ?? '–') : undefined
  const player: Player = {
    id: `${FM_PLAYER}${raw.id}`,
    slug: slugify(raw.name),
    name: raw.name,
    birthDate: raw.birthDate?.utcTime?.slice(0, 10),
    nationality: typeof countryName === 'string' ? country(countryName) : undefined,
    position,
    shirtNumber: num(info('shirt')?.value?.numberValue),
    teamId: team?.id,
    teamName: team?.name,
    injury: raw.injuryInformation ? mapFmInjury(raw.injuryInformation.expectedReturn?.expectedReturnFallback) : undefined,
  }
  const main = raw.mainLeague
  const stat = (key: string) => main?.stats?.find((s) => s.localizedTitleId === key)?.value
  const seasonStats: PlayerSeasonStats[] = main
    ? [
        {
          competitionId: resolveCompetition(main.leagueId),
          seasonLabel: main.season,
          appearances: stat('matches_uppercase'),
          starts: stat('started'),
          minutes: stat('minutes_played'),
          goals: stat('goals'),
          assists: stat('assists'),
          yellowCards: stat('yellow_cards'),
          redCards: stat('red_cards'),
        },
      ]
    : []
  return { player, team, seasonStats }
}
