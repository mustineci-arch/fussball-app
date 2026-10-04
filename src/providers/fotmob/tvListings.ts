/**
 * Sender pro Spiel und Land aus FotMob ("tvlistings"). Eine Anfrage liefert alle Übertragungen
 * eines Landes für die nächsten Tage (ca. 10 Tage im Voraus). Zuordnung zu den Spielen der App
 * über die FotMob-Spiel-ID (eigene FotMob-Spiele) oder über Anstoßzeit und Teamnamen.
 */
import type { Fixture, FixtureBroadcast } from '../../domain/types'
import { fotmobGet, sameTeamName } from './fotmob'

interface RawTvEntry {
  startTime?: string
  qualifiers?: string[]
  station?: { name?: string; callSign?: string | null; type?: string | null }
  matchId?: number
  program?: { teams?: { name?: string; isHome?: boolean }[] }
}

export type RawTvListings = Record<string, RawTvEntry[]>

export interface TvListing {
  matchId: string
  kickoff: number
  home: string
  away: string
  broadcasts: FixtureBroadcast[]
}

/** "/Date(1791639000000)/" → Millisekunden */
const parseDotNetDate = (value: string | undefined) => {
  const ms = Number(/\/Date\((-?\d+)\)\//.exec(value ?? '')?.[1])
  return Number.isFinite(ms) && ms > 0 ? ms : undefined
}

export function mapTvListings(raw: RawTvListings, country: string): TvListing[] {
  return Object.entries(raw).flatMap(([matchId, entries]): TvListing[] => {
    const first = entries?.[0]
    const teams = first?.program?.teams ?? []
    const home = teams.find((t) => t.isHome)?.name
    const away = teams.find((t) => !t.isHome)?.name
    const kickoff = parseDotNetDate(first?.startTime)
    if (!home || !away || !kickoff) return []
    const seen = new Set<string>()
    const broadcasts = entries.flatMap((e): FixtureBroadcast[] => {
      // Nur Live-Übertragungen (keine Zusammenfassungen/Wiederholungen)
      if (e.qualifiers?.length && !e.qualifiers.some((q) => /live/i.test(q))) return []
      const name = (e.station?.name ?? e.station?.callSign ?? '').trim()
      if (!name || seen.has(name)) return []
      seen.add(name)
      return [{ name, country, kind: /stream/i.test(e.station?.type ?? '') ? 'stream' : 'tv' }]
    })
    return broadcasts.length ? [{ matchId, kickoff, home, away, broadcasts }] : []
  })
}

export async function getTvListings(country: string): Promise<TvListing[]> {
  // FotMob hält die Liste eine Stunde zwischen – häufiger abzufragen bringt nichts
  const raw = await fotmobGet<RawTvListings>('tvlistings', { countryCode: country }, 60 * 60_000)
  return mapTvListings(raw ?? {}, country)
}

const MAX_DIFF_MS = 3 * 60 * 60_000

/** Sender eines Spiels aus den Listen mehrerer Länder */
export function broadcastsForFixture(fixture: Fixture, listings: TvListing[]): FixtureBroadcast[] {
  const fmId = fixture.id.startsWith('fm-') ? fixture.id.slice(3) : undefined
  const kickoff = new Date(fixture.kickoffAt).getTime()
  return listings
    .filter((l) =>
      fmId
        ? l.matchId === fmId
        : Math.abs(l.kickoff - kickoff) < MAX_DIFF_MS &&
          (sameTeamName(l.home, fixture.homeTeam.name) || sameTeamName(l.home, fixture.homeTeam.shortName)) &&
          (sameTeamName(l.away, fixture.awayTeam.name) || sameTeamName(l.away, fixture.awayTeam.shortName)),
    )
    .flatMap((l) => l.broadcasts)
}
