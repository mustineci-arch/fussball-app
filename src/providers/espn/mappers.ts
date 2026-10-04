/**
 * Übersetzt ESPN-Rohdaten in das interne Datenmodell.
 * Grundsatz: Was ESPN nicht liefert, bleibt leer – es wird nichts geschätzt oder ergänzt.
 */
import { slugify } from '../../domain/text'
import type {
  Fixture,
  FixtureStatus,
  Lineup,
  LineupPlayer,
  MatchEvent,
  MatchEventType,
  MatchStatistic,
  Player,
  PlayerInjury,
  PlayerMatchStats,
  PlayerPosition,
  PlayerSeasonStats,
  Score,
  SearchResults,
  StandingTable,
  StandingZone,
  StandingZoneKind,
  Team,
  TopPlayerEntry,
  ZoneLabel,
} from '../../domain/types'
import { getLanguage } from '../../i18n'
import { localizeCountry } from './countryNames'
import { competitionIdForSlug } from './leagues'
import { assignGrid } from './lineupGrid'
import { correctedNationality, fixPlayerName, fixTeamName, isTurkishContext, type NameContext } from './nameFixes'
import type {
  RawAthleteResponse,
  RawAthleteStats,
  RawBoxscoreTeam,
  RawCompetitor,
  RawEvent,
  RawInjury,
  RawKeyEvent,
  RawLeaders,
  RawRoster,
  RawRosterAthlete,
  RawRosterEntry,
  RawSearch,
  RawStandingEntry,
  RawStandingGroup,
  RawStatus,
  RawSummary,
  RawTeam,
} from './raw'

// ------------------------------------------------------------ Basis

const toInt = (value: unknown): number | undefined => {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''))
  return Number.isFinite(n) ? n : undefined
}

const isoDate = (value?: string): string | undefined => {
  if (!value) return undefined
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}

/** "67'" → {67}, "90'+4'" → {90, 4} */
export function parseClock(display?: string): { minute: number; extraMinute?: number } | undefined {
  const match = /^(\d+)'?(?:\s*\+\s*(\d+)'?)?/.exec(display?.trim() ?? '')
  if (!match) return undefined
  const minute = Number(match[1])
  const extra = match[2] ? Number(match[2]) : undefined
  return extra ? { minute, extraMinute: extra } : { minute }
}

const STATUS_BY_NAME: Record<string, FixtureStatus> = {
  STATUS_SCHEDULED: 'scheduled',
  STATUS_FIRST_HALF: 'live_1h',
  STATUS_HALFTIME: 'halftime',
  STATUS_SECOND_HALF: 'live_2h',
  STATUS_END_OF_REGULATION: 'break',
  STATUS_OVERTIME: 'extra_time',
  STATUS_FIRST_HALF_EXTRA_TIME: 'extra_time',
  STATUS_SECOND_HALF_EXTRA_TIME: 'extra_time',
  STATUS_EXTRA_TIME: 'extra_time',
  STATUS_HALFTIME_ET: 'break',
  STATUS_END_OF_EXTRATIME: 'break',
  STATUS_SHOOTOUT: 'penalties',
  STATUS_FULL_TIME: 'finished',
  STATUS_FINAL: 'finished',
  STATUS_FINAL_AET: 'finished_aet',
  STATUS_FINAL_PEN: 'finished_pen',
  STATUS_POSTPONED: 'postponed',
  STATUS_CANCELED: 'cancelled',
  STATUS_ABANDONED: 'abandoned',
  STATUS_SUSPENDED: 'suspended',
  STATUS_DELAYED: 'suspended',
}

export function mapStatus(raw?: RawStatus): Pick<Fixture, 'status' | 'minute' | 'extraMinute'> {
  const name = raw?.type?.name ?? ''
  let status = STATUS_BY_NAME[name]
  if (!status) {
    // Unbekannter Statusname: aus dem groben Zustand ableiten
    const state = raw?.type?.state
    const period = raw?.period ?? 0
    status = state === 'pre' ? 'scheduled' : state === 'post' ? 'finished' : state === 'in' ? (period >= 3 ? 'extra_time' : period === 2 ? 'live_2h' : 'live_1h') : 'unknown'
  }
  const running = status === 'live_1h' || status === 'live_2h' || status === 'extra_time'
  const clock = running ? parseClock(raw?.displayClock) : undefined
  return { status, ...clock }
}

function logoOf(team?: RawTeam): string | undefined {
  if (team?.logo) return team.logo
  const logos = team?.logos ?? []
  return (logos.find((l) => l.rel?.includes('default')) ?? logos[0])?.href
}

export function mapTeam(raw: RawTeam | undefined): Team | undefined {
  if (!raw?.id) return undefined
  const logoUrl = logoOf(raw)
  const language = getLanguage()
  // Nationalteams erkennt man am Flaggen-Logo – ihre (englischen) Namen werden übersetzt.
  const isNational = raw.isNational ?? logoUrl?.includes('/teamlogos/countries/')
  const espnName = raw.displayName ?? raw.name ?? raw.location ?? raw.abbreviation ?? `Team ${raw.id}`
  const espnShort = raw.shortDisplayName ?? espnName
  const { name, short } = isNational
    ? { name: localizeCountry(espnName, language) ?? espnName, short: localizeCountry(espnShort, language) ?? espnShort }
    : fixTeamName(raw.id, { name: espnName, short: espnShort }, language)
  return {
    id: raw.id,
    slug: slugify(name),
    name,
    shortName: short,
    code: raw.abbreviation,
    logoUrl,
    isNational,
  }
}

function scoreOf(c?: RawCompetitor): number | undefined {
  if (!c) return undefined
  return typeof c.score === 'object' ? toInt(c.score.value ?? c.score.displayValue) : toInt(c.score)
}

const pair = (home?: number, away?: number): Score | undefined =>
  home !== undefined && away !== undefined ? { home, away } : undefined

// ------------------------------------------------------------ Spiele

/** Scoreboard-/Schedule-Event → Fixture. `leagueSlug` als Fallback, wenn das Event keine Liga nennt. */
export function mapFixture(raw: RawEvent, leagueSlug?: string): Fixture | undefined {
  const comp = raw.competitions?.[0]
  const home = comp?.competitors?.find((c) => c.homeAway === 'home')
  const away = comp?.competitors?.find((c) => c.homeAway === 'away')
  const homeTeam = mapTeam(home?.team)
  const awayTeam = mapTeam(away?.team)
  const kickoffAt = isoDate(comp?.date ?? raw.date)
  const slug = raw.league?.slug ?? leagueSlug
  if (!raw.id || !homeTeam || !awayTeam || !kickoffAt || !slug) return undefined

  const rawStatus = comp?.status ?? raw.status
  const { status, minute, extraMinute } = mapStatus(rawStatus)
  const started = rawStatus?.type?.state !== 'pre' && status !== 'scheduled' && status !== 'postponed' && status !== 'cancelled'
  const firstHalfDone = !['scheduled', 'live_1h', 'postponed', 'cancelled', 'unknown'].includes(status)

  return {
    id: raw.id,
    competitionId: competitionIdForSlug(slug),
    kickoffAt,
    status,
    minute,
    extraMinute,
    homeTeam,
    awayTeam,
    score: started ? pair(scoreOf(home), scoreOf(away)) : undefined,
    halftimeScore: firstHalfDone ? pair(toInt(home?.linescores?.[0]?.displayValue ?? home?.linescores?.[0]?.value), toInt(away?.linescores?.[0]?.displayValue ?? away?.linescores?.[0]?.value)) : undefined,
    penaltyScore: pair(home?.shootoutScore, away?.shootoutScore),
    venue: comp?.venue?.fullName ?? raw.venue?.fullName,
  }
}

function mapEventType(type = ''): { type: MatchEventType; qualifier?: MatchEvent['qualifier'] } | undefined {
  const t = type.toLowerCase()
  if (t === 'own-goal') return { type: 'own_goal' }
  if (t === 'penalty---scored') return { type: 'penalty_goal' }
  if (t.startsWith('penalty---missed') || t.startsWith('penalty---saved')) return { type: 'penalty_missed' }
  if (t.startsWith('goal')) {
    const qualifier = t.includes('header') ? 'header' : t.includes('free-kick') ? 'free_kick' : undefined
    return { type: 'goal', qualifier }
  }
  if (t === 'yellow-card') return { type: 'yellow' }
  if (t.includes('yellow') && t.includes('red')) return { type: 'second_yellow' }
  if (t === 'red-card') return { type: 'red' }
  if (t === 'substitution') return { type: 'substitution' }
  if (t.startsWith('var')) return { type: 'var' }
  return undefined // Anpfiff, Halbzeit usw. sind keine Timeline-Ereignisse
}

const ref = (a: { id?: string; displayName?: string } | undefined, ctx: NameContext = {}) =>
  a?.id && a.displayName ? { id: a.id, name: fixPlayerName(a.id, a.displayName, ctx) } : undefined

export function mapMatchEvent(raw: RawKeyEvent, fixtureId: string, ctx: NameContext = {}): MatchEvent | undefined {
  const kind = mapEventType(raw.type?.type)
  const clock = parseClock(raw.clock?.displayValue)
  if (!kind || !clock || !raw.team?.id) return undefined
  const [first, second] = raw.participants ?? []
  return {
    id: raw.id ?? `${fixtureId}-${raw.type?.type}-${clock.minute}`,
    fixtureId,
    teamId: raw.team.id,
    type: kind.type,
    ...clock,
    // Wechsel: 1. Beteiligter kommt rein, 2. geht raus. Tor: 2. Beteiligter = Vorlage.
    player: ref(first?.athlete, ctx),
    relatedPlayer: kind.type === 'goal' || kind.type === 'substitution' ? ref(second?.athlete, ctx) : undefined,
    qualifier: kind.qualifier,
    detail: kind.type === 'var' ? raw.type?.text : undefined,
  }
}

export function mapPosition(abbreviation?: string, name?: string): PlayerPosition | undefined {
  const a = (abbreviation ?? '').toUpperCase().split('-')[0] ?? ''
  const n = (name ?? '').toLowerCase()
  if (a === 'G' || a === 'GK' || n.includes('goalkeeper')) return 'GK'
  if (['D', 'CD', 'CB', 'LB', 'RB', 'SW', 'LWB', 'RWB', 'WB'].includes(a) || n.includes('defender')) return 'DF'
  if (['F', 'CF', 'ST', 'FW', 'LW', 'RW', 'SS', 'LF', 'RF'].includes(a) || n.includes('forward')) return 'FW'
  if (a || n) return 'MF'
  return undefined
}

/** ESPN-Einzelwerte eines Spielers → interne Werte. Ohne Werte (vor Anpfiff) → undefined. */
export function mapPlayerMatchStats(raw: RawRosterEntry['stats']): PlayerMatchStats | undefined {
  if (!raw?.length) return undefined
  const values = new Map(raw.map((s) => [s.name ?? '', toInt(s.value ?? s.displayValue)]))
  const stats: PlayerMatchStats = {
    goals: values.get('totalGoals'),
    assists: values.get('goalAssists'),
    shots: values.get('totalShots'),
    shotsOnTarget: values.get('shotsOnTarget'),
    foulsCommitted: values.get('foulsCommitted'),
    foulsSuffered: values.get('foulsSuffered'),
    offsides: values.get('offsides'),
    yellowCards: values.get('yellowCards'),
    redCards: values.get('redCards'),
    ownGoals: values.get('ownGoals'),
    saves: values.get('saves'),
    goalsConceded: values.get('goalsConceded'),
  }
  return Object.values(stats).some((v) => v !== undefined) ? stats : undefined
}

export function mapLineup(raw: RawRoster, leagueSlug?: string): Lineup | undefined {
  const teamId = raw.team?.id
  const entries = raw.roster ?? []
  const startersRaw = entries.filter((e) => e.starter)
  // Vor Veröffentlichung liefert ESPN oft einen Kader ohne Startelf – dann gibt es noch keine Aufstellung.
  if (!teamId || startersRaw.length < 11) return undefined

  const ctx: NameContext = { teamId, leagueSlug }
  const toPlayer = (e: (typeof entries)[number]): LineupPlayer | undefined => {
    if (!e.athlete?.id) return undefined
    return {
      player: {
        id: e.athlete.id,
        name: fixPlayerName(e.athlete.id, e.athlete.displayName ?? '–', ctx),
        shortName: e.athlete.shortName ? fixPlayerName(e.athlete.id, e.athlete.shortName, ctx) : undefined,
        position: mapPosition(e.position?.abbreviation, e.position?.name),
      },
      shirtNumber: toInt(e.jersey),
      subbedIn: e.subbedIn || undefined,
      subbedOut: e.subbedOut || undefined,
      stats: mapPlayerMatchStats(e.stats),
    }
  }

  const slots = assignGrid(
    startersRaw.map((e) => ({ position: e.position?.abbreviation, formationPlace: toInt(e.formationPlace) })),
    raw.formation,
  )
  const starters = startersRaw.flatMap((e, i) => {
    const p = toPlayer(e)
    return p ? [{ ...p, ...slots?.[i] }] : []
  })
  const substitutes = entries.filter((e) => !e.starter).flatMap((e) => toPlayer(e) ?? [])
  return { teamId, formation: raw.formation, starters, substitutes }
}

export function mapStatistics(teams: RawBoxscoreTeam[] | undefined, homeId: string, awayId: string): MatchStatistic[] {
  const values = (teamId: string) => {
    const t = teams?.find((x) => x.team?.id === teamId)
    return new Map((t?.statistics ?? []).map((s) => [s.name ?? '', toInt(s.displayValue)]))
  }
  const home = values(homeId)
  const away = values(awayId)
  if (home.size === 0 || away.size === 0) return []

  const derived = (m: Map<string, number | undefined>) => {
    const total = m.get('totalShots')
    const on = m.get('shotsOnTarget')
    const blocked = m.get('blockedShots')
    const passes = m.get('totalPasses')
    const accurate = m.get('accuratePasses')
    return {
      possession: m.get('possessionPct') !== undefined ? Math.round(m.get('possessionPct') as number) : undefined,
      shots_total: total,
      shots_on_target: on,
      shots_blocked: blocked,
      shots_off_target: total !== undefined && on !== undefined && blocked !== undefined ? Math.max(0, total - on - blocked) : undefined,
      corners: m.get('wonCorners'),
      fouls: m.get('foulsCommitted'),
      offsides: m.get('offsides'),
      yellow_cards: m.get('yellowCards'),
      red_cards: m.get('redCards'),
      passes_total: passes,
      pass_accuracy: passes && accurate !== undefined ? Math.round((accurate / passes) * 100) : undefined,
      saves: m.get('saves'),
    } satisfies Partial<Record<MatchStatistic['key'], number | undefined>>
  }
  const h = derived(home)
  const a = derived(away)
  // Gerundete Ballbesitzwerte sollen zusammen 100 % ergeben
  if (h.possession !== undefined && a.possession !== undefined) a.possession = 100 - h.possession
  return (Object.keys(h) as (keyof typeof h)[]).flatMap((key) => {
    const hv = h[key]
    const av = a[key]
    return hv !== undefined && av !== undefined ? [{ key, home: hv, away: av }] : []
  })
}

export interface MappedSummary {
  fixture: Fixture
  events?: MatchEvent[]
  lineups?: { home?: Lineup; away?: Lineup }
  statistics?: MatchStatistic[]
}

export function mapSummary(raw: RawSummary): MappedSummary | undefined {
  const comp = raw.header?.competitions?.[0]
  const fixture = mapFixture({ id: raw.header?.id ?? comp?.id, league: raw.header?.league, competitions: comp ? [comp] : [] })
  if (!fixture) return undefined

  const referee = raw.gameInfo?.officials?.find((o) => /referee/i.test(o.position?.name ?? ''))?.displayName
  fixture.venue = raw.gameInfo?.venue?.fullName ?? fixture.venue
  fixture.referee = referee

  const started = fixture.status !== 'scheduled' && fixture.status !== 'postponed' && fixture.status !== 'cancelled'
  const leagueSlug = raw.header?.league?.slug
  // Ereignisse betreffen beide Teams (z. B. Eigentore) – türkische Schreibweise, sobald ein Team türkisch ist
  const eventCtx: NameContext = {
    leagueSlug,
    turkish: isTurkishContext({ teamId: fixture.homeTeam.id }) || isTurkishContext({ teamId: fixture.awayTeam.id }),
  }
  const lineup = (side: 'home' | 'away') => {
    const r = raw.rosters?.find((x) => x.homeAway === side)
    return r ? mapLineup(r, leagueSlug) : undefined
  }
  const home = lineup('home')
  const away = lineup('away')

  return {
    fixture,
    events: started ? (raw.keyEvents ?? []).flatMap((e) => mapMatchEvent(e, fixture.id, eventCtx) ?? []) : undefined,
    lineups: home || away ? { home, away } : undefined,
    statistics: started ? mapStatistics(raw.boxscore?.teams, fixture.homeTeam.id, fixture.awayTeam.id) : undefined,
  }
}

// ------------------------------------------------------------ Tabellen

/** Anmerkungen der Quelle → Zonentyp und sprachneutrale Bezeichnung (Spezielles zuerst) */
const ZONE_RULES: readonly { test: RegExp; kind: StandingZoneKind; label: ZoneLabel }[] = [
  { test: /champions league qualif/i, kind: 'champions_league', label: 'cl_qualifying' },
  { test: /champions league/i, kind: 'champions_league', label: 'champions_league' },
  { test: /europa league qualif/i, kind: 'europa_league', label: 'el_qualifying' },
  { test: /europa league/i, kind: 'europa_league', label: 'europa_league' },
  { test: /conference league qualif/i, kind: 'conference_league', label: 'ecl_qualifying' },
  { test: /conference league/i, kind: 'conference_league', label: 'conference_league' },
  { test: /relegation play/i, kind: 'relegation_playoff', label: 'relegation_playoff' },
  { test: /relegat/i, kind: 'relegation', label: 'relegation' },
  { test: /promot/i, kind: 'promotion', label: 'promotion' },
  { test: /round of 16/i, kind: 'qualification', label: 'round_of_16' },
  { test: /playoffs?\s*-\s*seeded/i, kind: 'playoff', label: 'playoff_seeded' },
  { test: /playoffs?\s*-\s*unseeded/i, kind: 'playoff', label: 'playoff_unseeded' },
  { test: /play-?off/i, kind: 'playoff', label: 'playoff' },
  { test: /qualif|advance|knockout/i, kind: 'qualification', label: 'qualification' },
  { test: /eliminat/i, kind: 'eliminated', label: 'eliminated' },
]

function classifyZone(description: string): { kind: StandingZoneKind; label: ZoneLabel } | undefined {
  const rule = ZONE_RULES.find((r) => r.test.test(description))
  return rule ? { kind: rule.kind, label: rule.label } : undefined
}

function mapStandingGroup(group: RawStandingGroup, competitionId: string, groupName?: string): StandingTable | undefined {
  const entries = group.standings?.entries ?? []
  const rows = entries.flatMap((e: RawStandingEntry) => {
    const team = mapTeam(e.team)
    if (!team) return []
    const stat = (name: string) => toInt(e.stats?.find((s) => s.name === name)?.value)
    const rank = stat('rank') ?? e.note?.rank
    return [
      {
        rank: rank ?? 0,
        team,
        played: stat('gamesPlayed') ?? 0,
        won: stat('wins') ?? 0,
        drawn: stat('ties') ?? 0,
        lost: stat('losses') ?? 0,
        goalsFor: stat('pointsFor') ?? 0,
        goalsAgainst: stat('pointsAgainst') ?? 0,
        points: stat('points') ?? 0,
        note: e.note?.description,
      },
    ]
  })
  if (rows.length === 0) return undefined
  rows.sort((a, b) => a.rank - b.rank)

  // Zonen aus den Anmerkungen der Datenquelle – aufeinanderfolgende Plätze mit gleicher Anmerkung zusammenfassen
  const zones: StandingZone[] = []
  for (const row of rows) {
    const zone = row.note ? classifyZone(row.note) : undefined
    if (!zone) continue
    const last = zones.at(-1)
    if (last && last.label === zone.label && last.toRank === row.rank - 1) last.toRank = row.rank
    else zones.push({ ...zone, fromRank: row.rank, toRank: row.rank })
  }

  return {
    competitionId,
    groupName,
    rows: rows.map(({ note: _note, ...row }) => row),
    zones,
  }
}

export function mapStandings(raw: RawStandingGroup, competitionId: string): StandingTable[] {
  const groups = raw.children?.length ? raw.children : [raw]
  const multiple = groups.length > 1
  return groups.flatMap((g) => mapStandingGroup(g, competitionId, multiple ? g.name ?? g.abbreviation : undefined) ?? [])
}

// ------------------------------------------------------------ Bestenlisten, Kader, Spieler

export function mapLeaders(
  raw: RawLeaders,
  statName: 'goalsLeaders' | 'assistsLeaders',
  leagueSlug?: string,
  limit = 20,
): TopPlayerEntry[] {
  const leaders = raw.stats?.find((s) => s.name === statName)?.leaders ?? []
  let rank = 0
  let previous: number | undefined
  return leaders.slice(0, limit).flatMap((l, i) => {
    const team = mapTeam(l.athlete?.team)
    const player = ref(l.athlete, { teamId: team?.id, leagueSlug })
    const value = toInt(l.value)
    if (!team || !player || value === undefined) return []
    if (value !== previous) rank = i + 1 // gleiche Werte = gleicher Platz
    previous = value
    return [{ rank, value, player, team }]
  })
}

const ageOn = (iso: string, now: Date) => {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number]
  const beforeBirthday = now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)
  return now.getFullYear() - y - (beforeBirthday ? 1 : 0)
}

/**
 * ESPN-Geburtsdatum "15/6/1992" (Tag/Monat/Jahr) → ISO-Datum.
 * Bei mehrdeutigen Werten (z. B. "10/11/1994") wird mit dem mitgelieferten Alter gegengeprüft.
 */
export function parseDisplayDob(value?: string, age?: number, now = new Date()): string | undefined {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value ?? '')
  if (!m) return isoDate(value)?.slice(0, 10)
  const [a, b, year] = [Number(m[1]), Number(m[2]), m[3] as string]
  const build = (day: number, month: number) =>
    month >= 1 && month <= 12 && day >= 1 && day <= 31
      ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      : undefined
  const dayFirst = build(a, b)
  const monthFirst = build(b, a)
  if (dayFirst && monthFirst && age !== undefined && ageOn(dayFirst, now) !== age && ageOn(monthFirst, now) === age) {
    return monthFirst
  }
  return dayFirst ?? monthFirst
}

const INJURY_STATUS: readonly [RegExp, PlayerInjury['status']][] = [
  [/suspen/i, 'suspended'],
  [/day.?to.?day/i, 'day_to_day'],
  [/doubt|question|probable/i, 'doubtful'],
  [/out|injur/i, 'out'],
]

/** Aktuellste Verletzungsmeldung der Quelle. "Active"/leer = keine Meldung. */
export function mapInjury(injuries: RawInjury[] | undefined): PlayerInjury | undefined {
  const latest = [...(injuries ?? [])].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))[0]
  if (!latest) return undefined
  const statusText = latest.status ?? latest.type?.description ?? latest.type?.name ?? ''
  if (/^active$/i.test(statusText.trim())) return undefined
  const status = INJURY_STATUS.find(([re]) => re.test(statusText))?.[1] ?? 'other'
  const detail = [latest.details?.type, latest.details?.location, latest.details?.detail].find(Boolean)
  return {
    status,
    detail: detail && !/^other$/i.test(detail) ? detail : undefined,
    since: latest.date ? isoDate(latest.date)?.slice(0, 10) : undefined,
    expectedReturn: latest.details?.returnDate ? isoDate(latest.details.returnDate)?.slice(0, 10) : undefined,
  }
}

export function mapRosterAthlete(raw: RawRosterAthlete, team?: Team): Player | undefined {
  if (!raw.id) return undefined
  const nationality = correctedNationality(raw.id, raw.citizenship)
  const ctx: NameContext = { teamId: team?.id, nationality }
  const name = fixPlayerName(raw.id, raw.displayName ?? [raw.firstName, raw.lastName].filter(Boolean).join(' '), ctx)
  return {
    id: raw.id,
    slug: slugify(name),
    name,
    shortName: raw.shortName ? fixPlayerName(raw.id, raw.shortName, ctx) : undefined,
    firstName: raw.firstName,
    lastName: raw.lastName,
    birthDate: raw.dateOfBirth ? isoDate(raw.dateOfBirth)?.slice(0, 10) : undefined,
    nationality: localizeCountry(nationality, getLanguage()),
    position: mapPosition(raw.position?.abbreviation, raw.position?.name),
    shirtNumber: toInt(raw.jersey),
    teamId: team?.id,
    teamName: team?.name,
    injury: mapInjury(raw.injuries),
  }
}

const seasonLabel = (year: number) => `${year}/${String((year + 1) % 100).padStart(2, '0')}`

export function mapAthlete(raw: RawAthleteResponse, stats?: RawAthleteStats): { player: Player; team?: Team; seasonStats: PlayerSeasonStats[] } | undefined {
  const a = raw.athlete
  if (!a?.id) return undefined
  const team = mapTeam(a.team)
  const nationality = correctedNationality(a.id, a.citizenship)
  const name = fixPlayerName(a.id, a.displayName ?? [a.firstName, a.lastName].filter(Boolean).join(' '), { teamId: team?.id, nationality })
  const player: Player = {
    id: a.id,
    slug: slugify(name),
    name,
    firstName: a.firstName,
    lastName: a.lastName,
    birthDate: parseDisplayDob(a.displayDOB, toInt(a.age)),
    nationality: localizeCountry(nationality, getLanguage()),
    position: mapPosition(a.position?.abbreviation, a.position?.name),
    shirtNumber: toInt(a.jersey),
    teamId: team?.id,
    teamName: team?.name,
  }

  const category = stats?.categories?.[0]
  const names = category?.names ?? []
  const value = (row: string[] | undefined, key: string) => {
    const i = names.indexOf(key)
    return i >= 0 ? toInt(row?.[i]) : undefined
  }
  const seasonStats = (category?.statistics ?? [])
    .filter((r) => r.season?.year !== undefined && r.leagueSlug)
    .sort((a, b) => (b.season?.year ?? 0) - (a.season?.year ?? 0))
    .slice(0, 8)
    .map(
      (r): PlayerSeasonStats => ({
        competitionId: competitionIdForSlug(r.leagueSlug as string),
        seasonLabel: seasonLabel(r.season?.year as number),
        starts: value(r.stats, 'STRT'),
        goals: value(r.stats, 'G'),
        assists: value(r.stats, 'A'),
        yellowCards: value(r.stats, 'YC'),
        redCards: value(r.stats, 'RC'),
      }),
    )

  return { player, team, seasonStats }
}

export function mapSearch(raw: RawSearch): Omit<SearchResults, 'competitions'> {
  const contents = (type: string) =>
    (raw.results ?? []).filter((r) => r.type === type).flatMap((r) => r.contents ?? []).filter((c) => !c.sport || c.sport === 'soccer')
  const idFromUid = (uid: string | undefined, marker: 't' | 'a') => new RegExp(`~${marker}:(\\d+)`).exec(uid ?? '')?.[1]

  const teams = contents('team').flatMap((c): Team[] => {
    const id = idFromUid(c.uid, 't')
    if (!id || !c.displayName) return []
    const { name } = fixTeamName(id, { name: c.displayName, short: c.displayName }, getLanguage())
    return [{ id, slug: slugify(name), name, shortName: name, logoUrl: c.image?.default, league: c.subtitle }]
  })
  const players = contents('player').flatMap((c): Player[] => {
    const id = idFromUid(c.uid, 'a')
    if (!id || !c.displayName) return []
    return [{ id, slug: slugify(c.displayName), name: c.displayName, teamName: c.subtitle }]
  })
  return { teams, players }
}
