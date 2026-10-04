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
const get = <T>(path: string, params: Record<string, string>, cacheFor: number | ((data: T) => number)) =>
  client.get<T>(`${BASE}/${path}?${new URLSearchParams({ ...params, src: 'anstoss' })}`, cacheFor)

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

/** FotMob-Rückkehrtext → Status. "Doubtful" = fraglich, sonst fällt der Spieler aus. */
export function mapFmInjury(expectedReturn: string | undefined, type?: string): PlayerInjury {
  const text = expectedReturn?.trim() || undefined
  if (type === 'suspension') return { status: 'suspended', expectedReturnText: text }
  if (text && /doubt/i.test(text)) return { status: 'doubtful' }
  return { status: 'out', expectedReturnText: text }
}

const teamData = (fmTeamId: number) => get<RawFmTeam>('teams', { id: String(fmTeamId) }, ttl.medium)

export async function getSquad(fmTeamId: number): Promise<FmSquadPlayer[]> {
  const raw = await teamData(fmTeamId)
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
          injury: m.injured || m.injury ? mapFmInjury(m.injury?.expectedReturn ?? undefined) : undefined,
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
      ? [{ name: p.name, shirtNumber: num(p.shirtNumber), injury: mapFmInjury(p.unavailability?.expectedReturn, p.unavailability?.type) }]
      : [],
  )
  return { players, unavailable }
}

const MAX_KICKOFF_DIFF_MS = 4 * 60 * 60_000

/** FotMob-Daten zu einem ESPN-Spiel: über den Spielplan eines der beiden Teams und die Anstoßzeit */
export async function getMatch(fixture: Fixture): Promise<FmMatch | undefined> {
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

  const details = await get<RawFmMatchDetails>('matchDetails', { matchId: String(match.id) }, (d) =>
    d.general?.finished ? ttl.long : d.general?.started ? ttl.live : ttl.short,
  )
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
