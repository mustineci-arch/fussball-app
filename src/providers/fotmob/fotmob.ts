/**
 * Zusatzquelle FotMob (inoffiziell, nur private Nutzung): Spielernoten und Ausfälle.
 * ESPN liefert für Fußball weder Noten noch Verletzungen – FotMob ergänzt das.
 * Die Zuordnung zu ESPN-Teams, -Spielen und -Spielern läuft über Namen, Datum und Rückennummer.
 * Alles hier ist optional: Fehlt etwas oder ist FotMob nicht erreichbar, zeigt die App es einfach nicht.
 */
import { normalizeText } from '../../domain/text'
import type { Fixture, PlayerInjury, Team } from '../../domain/types'
import { EspnClient, ttl } from '../espn/client'
import type { RawFmLineupPlayer, RawFmLineupTeam, RawFmMatchDetails, RawFmSuggest, RawFmTeam } from './raw'

const BASE = 'https://www.fotmob.com/api/data'
const client = new EspnClient()

/**
 * Eigener Parameter, damit der FotMob-Cache diese Adressen nur aus Browser-Anfragen kennt
 * (mit Freigabe für fremde Seiten) – sonst fehlt die CORS-Freigabe gelegentlich.
 */
export const fotmobGet = <T>(path: string, params: Record<string, string>, cacheFor: number | ((data: T) => number)) =>
  client.get<T>(`${BASE}/${path}?${new URLSearchParams({ ...params, src: 'anstoss' })}`, cacheFor)
const get = fotmobGet

// ------------------------------------------------------------ Namensvergleich

const FILLER = new Set(['fc', 'sv', 'sc', 'ac', 'cf', 'cd', 'sk', 'fk', 'afc', 'ssc', 'as', 'us', 'club', 'de', 'the', '1', '04', '05', '09'])

const tokens = (name: string) =>
  normalizeText(name)
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !FILLER.has(t))

/** true, wenn zwei Teamnamen erkennbar dasselbe Team meinen ("Hamburg SV" ~ "Hamburger SV", "Inter" ~ "Internazionale") */
export function sameTeamName(a: string, b: string): boolean {
  const ta = tokens(a)
  const tb = tokens(b)
  return ta.some((x) => tb.some((y) => x.startsWith(y) || y.startsWith(x)))
}

const isReserveOrWomen = (name: string) => /\((w|f)\)|\bii\b|\bu\d{2}\b|women|frauen/i.test(name)

/** Bekannte Zuordnungen ESPN-Team-ID → FotMob-Team-ID, wo die Namenssuche nicht trifft */
const TEAM_OVERRIDES: Record<string, number> = {
  '127': 9790, // Hamburger SV
  '122': 8722, // 1. FC Köln ("FC Cologne")
  '110': 8636, // Inter
}

export async function findTeamId(team: Pick<Team, 'id' | 'name' | 'shortName'>): Promise<number | undefined> {
  if (team.id.startsWith('fmt-')) return Number(team.id.slice(4)) || undefined
  const override = TEAM_OVERRIDES[team.id]
  if (override) return override
  const longest = [...tokens(team.name)].sort((a, b) => b.length - a.length)[0]
  const terms = [...new Set([team.name, team.shortName, longest].filter((t): t is string => !!t && t.length >= 3))]
  for (const term of terms) {
    const raw = await get<RawFmSuggest>('search/suggest', { term }, ttl.long).catch(() => undefined)
    const hit = (raw ?? [])
      .flatMap((g) => g.suggestions ?? [])
      .find((s) => s.type === 'team' && s.id && s.name && !isReserveOrWomen(s.name) && sameTeamName(s.name, team.name))
    if (hit?.id) return Number(hit.id)
  }
  return undefined
}

// ------------------------------------------------------------ Teams: Kader, Noten, Verletzungen

export interface FmSquadPlayer {
  id: number
  name: string
  shirtNumber?: number
  birthDate?: string
  /** Durchschnittsnote der laufenden Saison */
  seasonRating?: number
  injury?: PlayerInjury
}

const num = (v: unknown) => {
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : undefined
}

/**
 * FotMob-Verletzungs-IDs → Bezeichnung (englisch, wie FotMob sie im Spielerprofil nennt).
 * Gesammelt aus den Kadern von 50 Teams (Bundesliga, Premier League, Süper Lig, La Liga, Serie A), Oktober 2026.
 * Fehlt eine ID, liefert das Spielerprofil die Bezeichnung nach.
 */
export const INJURY_NAMES: Record<string, string> = {
  '1': 'Heart problems',
  '6': 'Injured',
  '8': 'Broken foot',
  '9': 'Concussion',
  '14': 'Knee injury',
  '17': 'Broken wrist',
  '21': 'Foot injury',
  '23': 'Broken ankle',
  '29': 'Toe injury',
  '30': 'Ankle injury',
  '31': 'Hip injury',
  '32': 'Shoulder injury',
  '33': 'Elbow injury',
  '35': 'Hand injury',
  '38': 'Sprained ankle',
  '42': 'Hamstring injury',
  '45': 'Back injury',
  '47': 'Groin injury',
  '69': 'Thigh injury',
  '70': 'Meniscus injury',
  '71': 'Ligament injury',
  '73': 'Achilles tendon injury',
  '74': 'Leg injury',
  '76': 'Cruciate ligament injury',
  '87': 'Muscle injury',
  '92': 'Illness',
  '96': 'Virus',
  '101': 'Calf injury',
  '102': 'Neck injury',
  '115': 'Strain injury',
  '120': 'Muscle cramps',
  '121': 'Physical discomfort',
  '130': 'Knock',
  '137': 'Lack of fitness',
  '140': 'Injured',
}

export interface FmInjuryInfo {
  /** "injury" oder "suspension" */
  type?: string
  /** FotMob-Verletzungs-ID (z. B. 69) */
  injuryId?: string | number | null
  /** Bezeichnung aus dem Spielerprofil, z. B. "Thigh injury" */
  name?: string
  /** Gemeldet am (ISO) */
  since?: string
}

/** FotMob-Angaben → Verletzung. "Doubtful" = fraglich, sonst fällt der Spieler aus. */
export function mapFmInjury(expectedReturn: string | undefined, info: FmInjuryInfo = {}): PlayerInjury {
  const text = expectedReturn?.trim() || undefined
  const name = info.name ?? (info.injuryId != null ? INJURY_NAMES[String(info.injuryId)] : undefined)
  const detail = name && !/^injured$/i.test(name) ? name : undefined
  const since = info.since?.slice(0, 10)
  if (info.type === 'suspension') return { status: 'suspended', detail, since, expectedReturnText: text }
  if (text && /doubt/i.test(text)) return { status: 'doubtful', detail, since }
  if (text && /back in training/i.test(text)) return { status: 'doubtful', detail, since, expectedReturnText: text }
  return { status: 'out', detail, since, expectedReturnText: text }
}

interface RawFmPlayerInjury {
  injuryInformation?: {
    name?: string
    key?: string
    expectedReturn?: { expectedReturnFallback?: string }
    lastUpdated?: { utcTime?: string }
  } | null
}

/** Genaue Angaben zur Verletzung aus dem Spielerprofil (Art, gemeldet am) */
async function injuryDetails(playerId: number): Promise<FmInjuryInfo | undefined> {
  const raw = await get<RawFmPlayerInjury>('playerData', { id: String(playerId) }, ttl.medium).catch(() => undefined)
  const info = raw?.injuryInformation
  if (!info) return undefined
  return { name: info.name, since: info.lastUpdated?.utcTime, injuryId: info.key?.replace(/^injury_/, '') }
}

const teamData = (fmTeamId: number) => get<RawFmTeam>('teams', { id: String(fmTeamId) }, ttl.medium)

export async function getSquad(fmTeamId: number): Promise<FmSquadPlayer[]> {
  const raw = await teamData(fmTeamId)
  const members = (raw.squad?.squad ?? []).filter((g) => g.title !== 'coach').flatMap((g) => g.members ?? [])
  // Für Verletzte das Spielerprofil laden – dort stehen Art der Verletzung und Meldedatum.
  const details = new Map(
    await Promise.all(
      members.filter((m) => m.id && (m.injured || m.injury)).map(async (m) => [m.id!, await injuryDetails(m.id!)] as const),
    ),
  )
  return (raw.squad?.squad ?? [])
    .filter((g) => g.title !== 'coach')
    .flatMap((g) => g.members ?? [])
    .flatMap((m): FmSquadPlayer[] => {
      if (!m.id || !m.name) return []
      const rating = num(m.rating)
      return [
        {
          id: m.id,
          name: m.name,
          shirtNumber: num(m.shirtNumber),
          birthDate: m.dateOfBirth?.slice(0, 10),
          seasonRating: rating && rating > 0 ? rating : undefined,
          injury:
            m.injured || m.injury
              ? mapFmInjury(m.injury?.expectedReturn ?? undefined, { injuryId: m.injury?.id, ...details.get(m.id) })
              : undefined,
        },
      ]
    })
}

// ------------------------------------------------------------ Spiele: Noten und Ausfälle

export interface FmMatchPlayer {
  name: string
  shirtNumber?: number
  rating?: number
  playerOfTheMatch?: boolean
  starter: boolean
  subbedIn?: boolean
}

export interface FmMatchSide {
  players: FmMatchPlayer[]
  unavailable: { name: string; shirtNumber?: number; injury: PlayerInjury }[]
}

export interface FmMatch {
  home: FmMatchSide
  away: FmMatchSide
}

const mapLineupPlayer = (p: RawFmLineupPlayer, starter: boolean): FmMatchPlayer | undefined =>
  p.name
    ? {
        name: p.name,
        shirtNumber: num(p.shirtNumber),
        rating: num(p.performance?.rating),
        playerOfTheMatch: p.performance?.playerOfTheMatch || undefined,
        starter,
        subbedIn: p.performance?.substitutionEvents?.some((e) => e.type === 'subIn') || undefined,
      }
    : undefined

export function mapLineupTeam(team: RawFmLineupTeam | undefined): FmMatchSide {
  const players = [
    ...(team?.starters ?? []).map((p) => mapLineupPlayer(p, true)),
    ...(team?.subs ?? []).map((p) => mapLineupPlayer(p, false)),
  ].filter((p): p is FmMatchPlayer => p !== undefined)
  const unavailable = (team?.unavailable ?? []).flatMap((p) =>
    p.name
      ? [{ name: p.name, shirtNumber: num(p.shirtNumber), injury: mapFmInjury(p.unavailability?.expectedReturn, { type: p.unavailability?.type, injuryId: p.unavailability?.injuryId, since: undefined }) }]
      : [],
  )
  return { players, unavailable }
}

const matchTtl = (d: RawFmMatchDetails) => (d.general?.finished ? ttl.long : d.general?.started ? ttl.live : ttl.short)

/** Noten und Ausfälle direkt über die FotMob-Spiel-ID (Spiele, die aus FotMob selbst stammen) */
export async function getMatchById(matchId: string): Promise<FmMatch> {
  const details = await get<RawFmMatchDetails>('matchDetails', { matchId }, matchTtl)
  return { home: mapLineupTeam(details.content?.lineup?.homeTeam), away: mapLineupTeam(details.content?.lineup?.awayTeam) }
}

const MAX_KICKOFF_DIFF_MS = 4 * 60 * 60_000

/** FotMob-Daten zu einem ESPN-Spiel: über den Spielplan eines der beiden Teams und die Anstoßzeit */
export async function getMatch(fixture: Fixture): Promise<FmMatch | undefined> {
  if (fixture.id.startsWith('fm-')) return getMatchById(fixture.id.slice(3))
  const homeId = await findTeamId(fixture.homeTeam)
  const awayId = homeId ? undefined : await findTeamId(fixture.awayTeam)
  const ownId = homeId ?? awayId
  if (!ownId) return undefined

  const team = await teamData(ownId)
  const kickoff = new Date(fixture.kickoffAt).getTime()
  const match = (team.fixtures?.allFixtures?.fixtures ?? []).find(
    (f) => f.id && f.status?.utcTime && Math.abs(new Date(f.status.utcTime).getTime() - kickoff) < MAX_KICKOFF_DIFF_MS,
  )
  if (!match?.id) return undefined

  const details = await get<RawFmMatchDetails>('matchDetails', { matchId: String(match.id) }, matchTtl)
  // Bei Spielen mit wenig Abdeckung (z. B. viele Testspiele) fehlt die Aufstellung – dann gibt es keine Noten.
  const fmHome = details.content?.lineup?.homeTeam
  const fmAway = details.content?.lineup?.awayTeam

  // FotMob kann Heim/Gast anders führen als ESPN – über die Team-ID ausrichten.
  const ownIsFmHome = details.general?.homeTeam?.id === ownId || fmHome?.id === ownId
  const ownIsEspnHome = homeId !== undefined
  const swapped = ownIsFmHome !== ownIsEspnHome
  const home = mapLineupTeam(swapped ? fmAway : fmHome)
  const away = mapLineupTeam(swapped ? fmHome : fmAway)
  return { home, away }
}

// ------------------------------------------------------------ Spielerzuordnung

const nameTokens = (name: string) => normalizeText(name).split(/[\s-]+/).filter((t) => t.length >= 3)

/**
 * Sucht zu einem Spieler (Name, Rückennummer) den passenden Eintrag einer anderen Quelle.
 * Reihenfolge: gleicher Name → gleicher Nachname + gleiche Nummer → eindeutiger Nachname →
 * gleiche Nummer + gemeinsamer Namensteil ("Alexander Røssing" ~ "Alexander Røssing-Lelesiit").
 */
export function findPlayer<T extends { name: string; shirtNumber?: number }>(
  player: { name: string; shirtNumber?: number },
  candidates: readonly T[],
): T | undefined {
  const full = normalizeText(player.name)
  const exact = candidates.find((c) => normalizeText(c.name) === full)
  if (exact) return exact
  const last = (name: string) => normalizeText(name).split(/\s+/).at(-1) ?? ''
  const lastName = last(player.name)
  const sameLast = candidates.filter((c) => last(c.name) === lastName)
  if (player.shirtNumber !== undefined) {
    const byNumber = sameLast.find((c) => c.shirtNumber === player.shirtNumber)
    if (byNumber) return byNumber
  }
  if (sameLast.length === 1) return sameLast[0]
  if (player.shirtNumber === undefined) return undefined
  const own = nameTokens(player.name)
  const shared = candidates.filter(
    (c) => c.shirtNumber === player.shirtNumber && nameTokens(c.name).some((t) => own.includes(t)),
  )
  return shared.length === 1 ? shared[0] : undefined
}
