/**
 * Wettbewerbe, die die App führt, und ihr ESPN-Kürzel.
 * Neuer Wettbewerb = neue Zeile – keine weitere Codeänderung nötig.
 * Spiele aus nicht gelisteten Wettbewerben (z. B. Testspiele auf Teamseiten) bekommen die ID "l-<slug>".
 */
import type { Competition } from '../../domain/types'

interface LeagueEntry {
  competition: Competition
  slug: string
}

const entry = (
  id: string,
  slug: string,
  name: string,
  shortName: string,
  type: Competition['type'],
  priority: number,
  country: string,
): LeagueEntry => ({
  slug,
  competition: {
    id,
    slug: id.replace(/^c-/, ''),
    name,
    shortName,
    type,
    priority,
    country,
    logoUrl: `https://a.espncdn.com/i/leaguelogos/soccer/500/${LEAGUE_LOGO_IDS[slug] ?? 0}.png`,
  },
})

/** ESPN-Liga-IDs für die Logos */
const LEAGUE_LOGO_IDS: Record<string, number> = {
  'tur.1': 18,
  'ger.1': 10,
  'eng.1': 23,
  'esp.1': 15,
  'ita.1': 12,
  'fra.1': 9,
  'uefa.champions': 2,
  'uefa.europa': 2310,
  'uefa.europa.conf': 20296,
  'uefa.nations': 2395,
  'uefa.euro': 74,
  'fifa.world': 4,
}

export const LEAGUES: readonly LeagueEntry[] = [
  entry('c-super-lig', 'tur.1', 'Süper Lig', 'Süper Lig', 'league', 1, 'Türkei'),
  entry('c-bundesliga', 'ger.1', 'Bundesliga', 'Bundesliga', 'league', 2, 'Deutschland'),
  entry('c-premier-league', 'eng.1', 'Premier League', 'Premier League', 'league', 3, 'England'),
  entry('c-la-liga', 'esp.1', 'La Liga', 'La Liga', 'league', 4, 'Spanien'),
  entry('c-serie-a', 'ita.1', 'Serie A', 'Serie A', 'league', 5, 'Italien'),
  entry('c-ligue-1', 'fra.1', 'Ligue 1', 'Ligue 1', 'league', 6, 'Frankreich'),
  entry('c-champions-league', 'uefa.champions', 'UEFA Champions League', 'Champions League', 'cup', 7, 'Europa'),
  entry('c-europa-league', 'uefa.europa', 'UEFA Europa League', 'Europa League', 'cup', 8, 'Europa'),
  entry('c-conference-league', 'uefa.europa.conf', 'UEFA Conference League', 'Conference League', 'cup', 9, 'Europa'),
  entry('c-nations-league', 'uefa.nations', 'UEFA Nations League', 'Nations League', 'international', 10, 'Europa'),
  entry('c-euro', 'uefa.euro', 'Europameisterschaft', 'EM', 'international', 11, 'Europa'),
  entry('c-world-cup', 'fifa.world', 'Weltmeisterschaft', 'WM', 'international', 12, 'Welt'),
]

const BY_ID = new Map(LEAGUES.map((l) => [l.competition.id, l]))
const BY_SLUG = new Map(LEAGUES.map((l) => [l.slug, l]))

const UNLISTED_PREFIX = 'l-'

/** Interne Wettbewerbs-ID → ESPN-Slug (auch für nicht gelistete Wettbewerbe) */
export function slugForCompetition(id: string): string | undefined {
  if (id.startsWith(UNLISTED_PREFIX)) return id.slice(UNLISTED_PREFIX.length)
  return BY_ID.get(id)?.slug
}

/** ESPN-Slug → interne Wettbewerbs-ID */
export function competitionIdForSlug(slug: string): string {
  return BY_SLUG.get(slug)?.competition.id ?? `${UNLISTED_PREFIX}${slug}`
}

export function listedCompetition(id: string): Competition | undefined {
  return BY_ID.get(id)?.competition
}
