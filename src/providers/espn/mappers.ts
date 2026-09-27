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
  PlayerPosition,
  PlayerSeasonStats,
  Score,
  SearchResults,
  StandingTable,
  StandingZone,
  StandingZoneKind,
  Team,
  TopPlayerEntry,
} from '../../domain/types'
import { toGermanCountry } from './countryNames'
import { competitionIdForSlug } from './leagues'
import { assignGrid } from './lineupGrid'
import type {
  RawAthleteResponse,
  RawAthleteStats,
  RawBoxscoreTeam,
  RawCompetitor,
  RawEvent,
  RawKeyEvent,
  RawLeaders,
  RawRoster,
  RawRosterAthlete,
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
  // Nationalteams erkennt man am Flaggen-Logo – ihre (englischen) Namen werden übersetzt.
  const isNational = raw.isNational ?? logoUrl?.includes('/teamlogos/countries/')
  const translate = (value: string) => (isNational ? (toGermanCountry(value) ?? value) : value)
  const name = translate(raw.displayName ?? raw.name ?? raw.location ?? raw.abbreviation ?? `Team ${raw.id}`)
  return {
    id: raw.id,
    slug: slugify(name),
    name,
    shortName: raw.shortDisplayName ? translate(raw.shortDisplayName) : name,
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

function mapEventType(type = ''): { type: MatchEventType; detail?: string } | undefined {
  const t = type.toLowerCase()
  if (t === 'own-goal') return { type: 'own_goal' }
  if (t === 'penalty---scored') return { type: 'penalty_goal' }
  if (t.startsWith('penalty---missed') || t.startsWith('penalty---saved')) return { type: 'penalty_missed' }
  if (t.startsWith('goal')) {
    const detail = t.includes('header') ? 'Kopfball' : t.includes('free-kick') ? 'Freistoß' : undefined
    return { type: 'goal', detail }
  }
  if (t === 'yellow-card') return { type: 'yellow' }
  if (t.includes('yellow') && t.includes('red')) return { type: 'second_yellow' }
  if (t === 'red-card') return { type: 'red' }
  if (t === 'substitution') return { type: 'substitution' }
  if (t.startsWith('var')) return { type: 'var' }
  return undefined // Anpfiff, Halbzeit usw. sind keine Timeline-Ereignisse
}

const ref = (a?: { id?: string; displayName?: string }) => (a?.id && a.displayName ? { id: a.id, name: a.displayName } : undefined)

export function mapMatchEvent(raw: RawKeyEvent, fixtureId: string): MatchEvent | undefined {
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
    player: ref(first?.athlete),
    relatedPlayer: kind.type === 'goal' || kind.type === 'substitution' ? ref(second?.athlete) : undefined,
    detail: kind.type === 'var' ? raw.type?.text : kind.detail,
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

export function mapLineup(raw: RawRoster): Lineup | undefined {
  const teamId = raw.team?.id
  const entries = raw.roster ?? []
  const startersRaw = entries.filter((e) => e.starter)
  // Vor Veröffentlichung liefert ESPN oft einen Kader ohne Startelf – dann gibt es noch keine Aufstellung.
  if (!teamId || startersRaw.length < 11) return undefined

  const toPlayer = (e: (typeof entries)[number]): LineupPlayer | undefined => {
    if (!e.athlete?.id) return undefined
    return {
      player: {
        id: e.athlete.id,
        name: e.athlete.displayName ?? '–',
        shortName: e.athlete.shortName,
        position: mapPosition(e.position?.abbreviation, e.position?.name),
      },
      shirtNumber: toInt(e.jersey),
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
  const lineup = (side: 'home' | 'away') => {
    const r = raw.rosters?.find((x) => x.homeAway === side)
    return r ? mapLineup(r) : undefined
  }
  const home = lineup('home')
  const away = lineup('away')

  return {
    fixture,
    events: started ? (raw.keyEvents ?? []).flatMap((e) => mapMatchEvent(e, fixture.id) ?? []) : undefined,
    lineups: home || away ? { home, away } : undefined,
    statistics: started ? mapStatistics(raw.boxscore?.teams, fixture.homeTeam.id, fixture.awayTeam.id) : undefined,
  }
}

// ------------------------------------------------------------ Tabellen

const ZONE_RULES: readonly { test: RegExp; kind: StandingZoneKind; label?: string }[] = [
  { test: /champions league qualif/i, kind: 'champions_league', label: 'Champions-League-Qualifikation' },
  { test: /champions league/i, kind: 'champions_league', label: 'Champions League' },
  { test: /europa league qualif/i, kind: 'europa_league', label: 'Europa-League-Qualifikation' },
  { test: /europa league/i, kind: 'europa_league', label: 'Europa League' },
  { test: /conference league qualif/i, kind: 'conference_league', label: 'Conference-League-Qualifikation' },
  { test: /conference league/i, kind: 'conference_league', label: 'Conference League' },
  { test: /relegation play/i, kind: 'relegation_playoff', label: 'Relegation' },
  { test: /relegat/i, kind: 'relegation', label: 'Abstieg' },
  { test: /promot/i, kind: 'promotion', label: 'Aufstieg' },
  { test: /round of 16/i, kind: 'qualification', label: 'Achtelfinale' },
  { test: /playoffs?\s*-\s*seeded/i, kind: 'playoff', label: 'Play-offs (gesetzt)' },
  { test: /playoffs?\s*-\s*unseeded/i, kind: 'playoff', label: 'Play-offs (ungesetzt)' },
  { test: /play-?off/i, kind: 'playoff', label: 'Play-offs' },
  { test: /qualif|advance|knockout/i, kind: 'qualification', label: 'Weiterkommen' },
  { test: /eliminat/i, kind: 'eliminated', label: 'Ausgeschieden' },
]

function classifyZone(description: string): { kind: StandingZoneKind; label: string } | undefined {
  const rule = ZONE_RULES.find((r) => r.test.test(description))
  return rule ? { kind: rule.kind, label: rule.label ?? description } : undefined
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

export function mapLeaders(raw: RawLeaders, statName: 'goalsLeaders' | 'assistsLeaders', limit = 20): TopPlayerEntry[] {
  const leaders = raw.stats?.find((s) => s.name === statName)?.leaders ?? []
  let rank = 0
  let previous: number | undefined
  return leaders.slice(0, limit).flatMap((l, i) => {
    const team = mapTeam(l.athlete?.team)
    const player = ref(l.athlete)
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

export function mapRosterAthlete(raw: RawRosterAthlete, team?: Team): Player | undefined {
  if (!raw.id) return undefined
  const name = raw.displayName ?? [raw.firstName, raw.lastName].filter(Boolean).join(' ')
  return {
    id: raw.id,
    slug: slugify(name),
    name,
    shortName: raw.shortName,
    firstName: raw.firstName,
    lastName: raw.lastName,
    birthDate: raw.dateOfBirth ? isoDate(raw.dateOfBirth)?.slice(0, 10) : undefined,
    nationality: toGermanCountry(raw.citizenship),
    position: mapPosition(raw.position?.abbreviation, raw.position?.name),
    shirtNumber: toInt(raw.jersey),
    teamId: team?.id,
    teamName: team?.name,
  }
}

const seasonLabel = (year: number) => `${year}/${String((year + 1) % 100).padStart(2, '0')}`

export function mapAthlete(raw: RawAthleteResponse, stats?: RawAthleteStats): { player: Player; team?: Team; seasonStats: PlayerSeasonStats[] } | undefined {
  const a = raw.athlete
  if (!a?.id) return undefined
  const team = mapTeam(a.team)
  const name = a.displayName ?? [a.firstName, a.lastName].filter(Boolean).join(' ')
  const player: Player = {
    id: a.id,
    slug: slugify(name),
    name,
    firstName: a.firstName,
    lastName: a.lastName,
    birthDate: parseDisplayDob(a.displayDOB, toInt(a.age)),
    nationality: toGermanCountry(a.citizenship),
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
    return [{ id, slug: slugify(c.displayName), name: c.displayName, shortName: c.displayName, logoUrl: c.image?.default, league: c.subtitle }]
  })
  const players = contents('player').flatMap((c): Player[] => {
    const id = idFromUid(c.uid, 'a')
    if (!id || !c.displayName) return []
    return [{ id, slug: slugify(c.displayName), name: c.displayName, teamName: c.subtitle }]
  })
  return { teams, players }
}
