/**
 * Wettbewerbe, die die App führt, und ihr ESPN-Kürzel.
 * Neuer Wettbewerb = neue Zeile – keine weitere Codeänderung nötig.
 * Spiele aus nicht gelisteten Wettbewerben (z. B. Pokale auf Teamseiten) bekommen die ID "l-<slug>".
 */
import type { Competition } from '../../domain/types'
import { getLanguage, type Language } from '../../i18n'

type Localized = string | Record<Language, string>

interface LeagueDef {
  id: string
  slug: string
  /** ESPN-Liga-ID für das Logo (fehlt bei Testspielen – dann zeigt die UI ein Kürzel) */
  logoId?: number
  name: Localized
  shortName: Localized
  country: Localized
  type: Competition['type']
  /** Nur in der Spielliste, nicht unter „Wettbewerbe“ */
  hidden?: boolean
}

const EUROPE: Localized = { de: 'Europa', en: 'Europe' }

const DEFS: readonly LeagueDef[] = [
  { id: 'c-super-lig', slug: 'tur.1', logoId: 18, name: 'Süper Lig', shortName: 'Süper Lig', country: { de: 'Türkei', en: 'Türkiye' }, type: 'league' },
  { id: 'c-bundesliga', slug: 'ger.1', logoId: 10, name: 'Bundesliga', shortName: 'Bundesliga', country: { de: 'Deutschland', en: 'Germany' }, type: 'league' },
  { id: 'c-2-bundesliga', slug: 'ger.2', logoId: 97, name: '2. Bundesliga', shortName: '2. Bundesliga', country: { de: 'Deutschland', en: 'Germany' }, type: 'league' },
  { id: 'c-premier-league', slug: 'eng.1', logoId: 23, name: 'Premier League', shortName: 'Premier League', country: 'England', type: 'league' },
  { id: 'c-la-liga', slug: 'esp.1', logoId: 15, name: 'La Liga', shortName: 'La Liga', country: { de: 'Spanien', en: 'Spain' }, type: 'league' },
  { id: 'c-serie-a', slug: 'ita.1', logoId: 12, name: 'Serie A', shortName: 'Serie A', country: { de: 'Italien', en: 'Italy' }, type: 'league' },
  { id: 'c-ligue-1', slug: 'fra.1', logoId: 9, name: 'Ligue 1', shortName: 'Ligue 1', country: { de: 'Frankreich', en: 'France' }, type: 'league' },
  { id: 'c-champions-league', slug: 'uefa.champions', logoId: 2, name: 'UEFA Champions League', shortName: 'Champions League', country: EUROPE, type: 'cup' },
  { id: 'c-europa-league', slug: 'uefa.europa', logoId: 2310, name: 'UEFA Europa League', shortName: 'Europa League', country: EUROPE, type: 'cup' },
  { id: 'c-conference-league', slug: 'uefa.europa.conf', logoId: 20296, name: 'UEFA Conference League', shortName: 'Conference League', country: EUROPE, type: 'cup' },
  { id: 'c-nations-league', slug: 'uefa.nations', logoId: 2395, name: 'UEFA Nations League', shortName: 'Nations League', country: EUROPE, type: 'international' },
  { id: 'c-euro', slug: 'uefa.euro', logoId: 74, name: { de: 'Europameisterschaft', en: 'European Championship' }, shortName: { de: 'EM', en: 'EURO' }, country: EUROPE, type: 'international' },
  { id: 'c-world-cup', slug: 'fifa.world', logoId: 4, name: { de: 'Weltmeisterschaft', en: 'World Cup' }, shortName: { de: 'WM', en: 'World Cup' }, country: { de: 'Welt', en: 'World' }, type: 'international' },
  // Testspiele – z. B. HSV gegen FC Kopenhagen. Nur in der Spielliste; keine Tabelle, keine Bestenlisten.
  { id: 'c-club-friendly', slug: 'club.friendly', name: { de: 'Testspiele (Vereine)', en: 'Club Friendlies' }, shortName: { de: 'Testspiel', en: 'Friendly' }, country: { de: 'Welt', en: 'World' }, type: 'cup', hidden: true },
  { id: 'c-intl-friendly', slug: 'fifa.friendly', name: { de: 'Länderspiele (Test)', en: 'International Friendlies' }, shortName: { de: 'Länderspiel', en: 'Int. Friendly' }, country: { de: 'Welt', en: 'World' }, type: 'international', hidden: true },
]

const pick = (value: Localized, language: Language) => (typeof value === 'string' ? value : value[language])

function toCompetition(def: LeagueDef, priority: number, language: Language): Competition {
  return {
    id: def.id,
    slug: def.id.replace(/^c-/, ''),
    name: pick(def.name, language),
    shortName: pick(def.shortName, language),
    type: def.type,
    priority,
    country: pick(def.country, language),
    logoUrl: def.logoId ? `https://a.espncdn.com/i/leaguelogos/soccer/500/${def.logoId}.png` : undefined,
    hidden: def.hidden,
  }
}

/** Alle geführten Wettbewerbe in der aktuellen Sprache */
export function listedCompetitions(): Competition[] {
  const language = getLanguage()
  return DEFS.map((def, i) => toCompetition(def, i + 1, language))
}

export const LEAGUE_SLUGS: readonly string[] = DEFS.map((d) => d.slug)

const BY_ID = new Map(DEFS.map((d, i) => [d.id, { def: d, priority: i + 1 }]))
const BY_SLUG = new Map(DEFS.map((d) => [d.slug, d]))

const UNLISTED_PREFIX = 'l-'

/** Interne Wettbewerbs-ID → ESPN-Slug (auch für nicht gelistete Wettbewerbe) */
export function slugForCompetition(id: string): string | undefined {
  if (id.startsWith(UNLISTED_PREFIX)) return id.slice(UNLISTED_PREFIX.length)
  return BY_ID.get(id)?.def.slug
}

/** ESPN-Slug → interne Wettbewerbs-ID */
export function competitionIdForSlug(slug: string): string {
  return BY_SLUG.get(slug)?.id ?? `${UNLISTED_PREFIX}${slug}`
}

export function listedCompetition(id: string): Competition | undefined {
  const entry = BY_ID.get(id)
  return entry ? toCompetition(entry.def, entry.priority, getLanguage()) : undefined
}
