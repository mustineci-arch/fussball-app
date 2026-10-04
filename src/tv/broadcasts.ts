/**
 * Wo läuft das Spiel im TV / Stream?
 *
 * Es gibt keine kostenlose Datenquelle mit Sendern pro Spiel. Grundlage ist daher die recherchierte
 * Rechtevergabe je Wettbewerb und Land (Saison 2026/27, Quellen unten). Wo die Aufteilung eindeutig
 * geregelt ist (Bundesliga nach Anstoßzeit, Länderspiele der DFB-Elf), wird der Sender pro Spiel
 * bestimmt – sonst werden alle Rechteinhaber genannt. Nichts davon wird geraten.
 *
 * Beim Saisonwechsel (Rechte ändern sich z. B. 2027 bei Champions League und Süper Lig) muss
 * diese Datei aktualisiert werden.
 */
import type { Fixture } from '../domain/types'

export type TvCountry = 'DE' | 'AT' | 'CH' | 'TR' | 'GB' | 'US'
export const TV_COUNTRIES: readonly TvCountry[] = ['DE', 'AT', 'CH', 'TR', 'GB', 'US']

/** Ländername in der App-Sprache (z. B. "GB" → "Vereinigtes Königreich") */
export function countryLabel(code: string, language: 'de' | 'en'): string {
  try {
    return new Intl.DisplayNames([language], { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

/** Flaggen-Emoji aus dem Ländercode */
export const flagOf = (country: string) =>
  country.length === 2 ? String.fromCodePoint(...[...country.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : '🌐'

export const RIGHTS_AS_OF = '2026-09-27'

export interface Channel {
  name: string
  /** true = frei empfangbar / kostenlos, false = Abo nötig */
  free: boolean
  kind: 'tv' | 'stream'
  /** Offizielle Seite des Anbieters (Live-/Sportbereich) – nur legale Angebote, keine fremden Streams */
  url?: string
}

export type TvNote = 'buli_free_extra' | 'cl_final_free' | 'uel_top_free' | 'no_fta' | 'depends_on_match'

export interface TvInfo {
  channels: Channel[]
  notes: TvNote[]
  sources: string[]
  /** true = Sender von der Datenquelle für dieses Spiel gemeldet (nicht aus der Rechteliste) */
  reported?: boolean
}

const ch = (name: string, free: boolean, url: string, kind: Channel['kind'] = 'tv'): Channel => ({ name, free, kind, url })

// Sender – Links auf die offiziellen Angebote (Startseite bzw. Sport-/Livebereich)
const SKY = ch('Sky Sport', false, 'https://www.sky.de/sport')
const WOW = ch('WOW', false, 'https://www.wowtv.de/sport', 'stream')
const DAZN = ch('DAZN', false, 'https://www.dazn.com/de-DE/home', 'stream')
const PRIME = ch('Prime Video', false, 'https://www.amazon.de/gp/video/storefront', 'stream')
const RTL = ch('RTL', true, 'https://plus.rtl.de')
const NITRO = ch('NITRO', true, 'https://plus.rtl.de')
const RTL_PLUS = ch('RTL+', false, 'https://plus.rtl.de', 'stream')
const ARD = ch('ARD', true, 'https://www.sportschau.de')
const ZDF = ch('ZDF', true, 'https://www.zdf.de/live-tv')
const DIGITURK_EURO = ch('Digiturk Euro (beIN Sports)', false, 'https://beinsports.com.tr', 'stream')
const BEIN = ch('beIN Sports', false, 'https://beinsports.com.tr')
const TOD = ch('TOD', false, 'https://www.todtv.com.tr', 'stream')
const S_SPORT = ch('S Sport', false, 'https://www.ssport.tv')
const S_SPORT_PLUS = ch('S Sport Plus', false, 'https://www.ssportplus.com', 'stream')
const TRT = ch('TRT', true, 'https://www.trt.net.tr')
const TABII = ch('tabii', true, 'https://www.tabii.com', 'stream')
const ATV = ch('ATV', true, 'https://www.atv.com.tr')
const A_SPOR = ch('A Spor', true, 'https://www.aspor.com.tr')
// Österreich / Schweiz
const SKY_AT = ch('Sky Sport Austria', false, 'https://sport.sky.at')
const CANAL_AT = ch('Canal+', false, 'https://www.canalplus.com/at', 'stream')
const ORF = ch('ORF', true, 'https://sport.orf.at')
const SKY_CH = ch('Sky Sport', false, 'https://www.sky.ch', 'stream')
const BLUE = ch('blue Sport', false, 'https://www.blueplus.ch/de/sport')
const SRF = ch('SRF', true, 'https://www.srf.ch/sport')
// Großbritannien
const SKY_UK = ch('Sky Sports', false, 'https://www.skysports.com')
const TNT = ch('TNT Sports', false, 'https://www.tntsports.co.uk')
const BBC = ch('BBC', true, 'https://www.bbc.co.uk/sport/football', 'stream')
const PRIME_UK = ch('Prime Video', false, 'https://www.amazon.co.uk/gp/video/storefront', 'stream')
const PREMIER_SPORTS = ch('Premier Sports', false, 'https://www.premiersports.com')
const DISNEY_PLUS = ch('Disney+', false, 'https://www.disneyplus.com', 'stream')
const DAZN_INT = ch('DAZN', false, 'https://www.dazn.com', 'stream')
// USA
const NBC = ch('NBC', true, 'https://www.nbcsports.com/soccer')
const PEACOCK = ch('Peacock', false, 'https://www.peacocktv.com', 'stream')
const USA_NETWORK = ch('USA Network', false, 'https://www.usanetwork.com')
const TELEMUNDO = ch('Telemundo', true, 'https://www.telemundo.com/deportes')
const PARAMOUNT = ch('Paramount+', false, 'https://www.paramountplus.com', 'stream')
const CBS = ch('CBS', true, 'https://www.cbssports.com/soccer')
const ESPN_PLUS = ch('ESPN+', false, 'https://plus.espn.com', 'stream')
const BEIN_US = ch('beIN Sports', false, 'https://www.beinsports.com/us')

/** Sendernamen, wie ESPN sie pro Spiel meldet → offizielle Seite */
const KNOWN_URLS: Record<string, string> = {
  'espn+': 'https://plus.espn.com',
  espn: 'https://www.espn.com',
  espn2: 'https://www.espn.com',
  'espn deportes': 'https://www.espndeportes.com',
  abc: 'https://abc.com',
  'paramount+': 'https://www.paramountplus.com',
  cbs: 'https://www.cbssports.com/soccer',
  'cbs sports network': 'https://www.cbssports.com/soccer',
  'cbs sports golazo': 'https://www.cbssports.com/soccer',
  fox: 'https://www.foxsports.com/soccer',
  fs1: 'https://www.foxsports.com/soccer',
  fs2: 'https://www.foxsports.com/soccer',
  'fox deportes': 'https://www.foxdeportes.com',
  'fox one': 'https://www.foxsports.com/soccer',
  tubi: 'https://tubitv.com',
  peacock: 'https://www.peacocktv.com',
  nbc: 'https://www.nbcsports.com/soccer',
  'usa net': 'https://www.usanetwork.com',
  'usa network': 'https://www.usanetwork.com',
  telemundo: 'https://www.telemundo.com/deportes',
  universo: 'https://www.telemundo.com/deportes',
  'bein sports': 'https://www.beinsports.com/us',
  'bein sports en español': 'https://www.beinsports.com/us-es',
  tudn: 'https://www.tudn.com',
  univision: 'https://www.tudn.com',
  unimás: 'https://www.tudn.com',
  vix: 'https://vix.com',
  dazn: 'https://www.dazn.com',
  'apple tv': 'https://tv.apple.com',
  'mls season pass': 'https://tv.apple.com',
}

const SRC = {
  atBuli: 'https://www.diemedien.at/articles/sportrechte-von-orf-servus-tv-sky-wer-zeigt-ski-alpin-und-nordisch-fussball-formel-1-und-co',
  dachBuli: 'https://www.svgeurope.org/blog/headlines/sky-germany-secures-bundesliga-and-2-bundesliga-rights-until-2029/',
  atCl: 'https://www.fussballtv.at/champions-league-live-tv/',
  atPl: 'https://www.sky.at/sport/fussball/premier-league/sendeplan',
  chCl: 'https://zufriedenmit.ch/blog/champions-league-schweiz-2026-27-anbieter-kosten-alternativen',
  chPl: 'https://www.sky-sport.ch/de/articles/die-premier-league-bleibt-bis-2028-bei-sky-sport/',
  ukPl: 'https://www.digital-tv.co.uk/guides/how-to-watch-premier-league-sky-tnt-sports',
  ukRights: 'https://en.wikipedia.org/wiki/Sports_broadcasting_contracts_in_the_United_Kingdom',
  ukLaliga: 'https://www.laliga.com/en-GB/where-to-watch-laliga-easports',
  usBuli: 'https://www.sportsvideo.org/2026/07/15/usa-sports-and-bundesliga-announce-exclusive-multi-year-u-s-media-rights-agreement/',
  usNbc: 'https://www.nbcsports.com/soccer/news/how-to-watch-stream-soccer-on-nbc-peacock-for-2026-27-premier-league-bundesliga-serie-a-usmnt-uswnt',
  usCl: 'https://www.cabletv.com/sports/watch-uefa-champions-league',
  usAll: 'https://www.renderfoot.com/blog/where-to-watch-soccer-in-usa',
  usSuperLig: 'https://worldsoccertalk.com/turkish-super-lig-tv-schedule/',
  buli: 'https://www.bundesliga.com/de/bundesliga/news/bundesliga-spiele-im-fernsehen-tv-sender-rtl-dazn-sky-prime-363',
  buliDazn: 'https://dazngroup.com/press-room/dazn-zeigt-ab-der-saison-2025-26-bis-2028-29-noch-mehr-bundesliga-die-samstags-konferenz-und-alle-sonntag-spiele-live-nur-auf-dazn/',
  cl: 'https://www.fussballdaten.de/news/champions-league-uebertragung-2026-27-wer-zeigt-spiele-live-tv-stream/',
  uel: 'https://www.sky.de/sport/fussball/uefa-europa-league-uefa-conference-league',
  pl: 'https://www.sportspro.com/news/premier-league-rights-germany-sky/',
  laliga: 'https://www.livesoccertv.com/competitions/spain/primera-division/watch/germany/',
  superLigDe: 'https://neunzigplus.de/sueper-lig/sueper-lig-in-deutschland-live-sehen-wer-uebertraegt-2026-27/',
  nationsDe: 'https://www.fussball-wm.pro/uefa-nations-league/2026-2027/tv-uebertragung/',
  tr: 'https://www.karar.com/spor-haberleri/hangi-lig-hangi-kanalda-maclar-hangi-platformda-yayinlanacak-2026-2027-2062084',
  tr2: 'https://www.nobetcigazete.com/2026-2027-futbol-yayin-haklari-belli-oldu-super-lig-sampiyonlar-ligi-premier-lig-ve-laliga-hangi-kanalda',
  superLigTr: 'https://beinsports.com.tr/haber/trendyol-super-lig-3-sezon-daha-sadece-bein-sportsta',
} as const

const GERMANY_TEAM_ID = '481'
const TURKIYE_TEAM_ID = '465'

/** Wochentag (0 = So) und Uhrzeit in deutscher Zeit – die Rechte sind nach deutschen Anstoßzeiten vergeben */
function berlinSlot(isoUtc: string): { weekday: number; time: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(isoUtc))
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'))
  return { weekday, time: `${get('hour')}:${get('minute')}` }
}

/**
 * Bundesliga 2025/26–2028/29: Sky = Freitag, Samstag 15:30 (Einzelspiele), Samstag 18:30;
 * DAZN = Samstags-Konferenz 15:30 und alle Sonntagsspiele.
 */
export function bundesligaGermany(fixture: Pick<Fixture, 'kickoffAt'>): TvInfo {
  const { weekday, time } = berlinSlot(fixture.kickoffAt)
  const sources = [SRC.buli, SRC.buliDazn]
  const notes: TvNote[] = ['buli_free_extra']
  if (weekday === 5) return { channels: [SKY, WOW], notes, sources }
  if (weekday === 6 && time === '15:30') return { channels: [SKY, WOW, DAZN], notes, sources }
  if (weekday === 6) return { channels: [SKY, WOW], notes, sources }
  if (weekday === 0) return { channels: [DAZN], notes, sources }
  // Englische Wochen o. Ä.: Aufteilung nicht eindeutig → beide Rechteinhaber nennen
  return { channels: [SKY, WOW, DAZN], notes: [...notes, 'depends_on_match'], sources }
}

/** DFB-Heimspiele Nations League 2026/27 laut Quelle: gegen Griechenland und Niederlande ARD, gegen Serbien ZDF */
const DFB_HOME_BROADCASTER: Record<string, Channel> = {
  '455': ARD, // Griechenland
  '449': ARD, // Niederlande
  '6757': ZDF, // Serbien
}

/** Nations League in Deutschland: DFB-Heimspiele ARD/ZDF, Auswärtsspiele RTL (Stream RTL+). Andere Spiele: keine Angabe. */
function nationsLeagueGermany(fixture: Pick<Fixture, 'homeTeam' | 'awayTeam'>): TvInfo | undefined {
  if (fixture.homeTeam.id === GERMANY_TEAM_ID) {
    const exact = DFB_HOME_BROADCASTER[fixture.awayTeam.id]
    return exact
      ? { channels: [exact], notes: [], sources: [SRC.nationsDe] }
      : { channels: [ARD, ZDF], notes: ['depends_on_match'], sources: [SRC.nationsDe] }
  }
  if (fixture.awayTeam.id === GERMANY_TEAM_ID) return { channels: [RTL, RTL_PLUS], notes: [], sources: [SRC.nationsDe] }
  return undefined
}

type Rule = (fixture: Fixture) => TvInfo | undefined
const fixed =
  (channels: Channel[], sources: string[], notes: TvNote[] = []): Rule =>
  () => ({ channels, notes, sources })

/** Rechte je Wettbewerb (interne Wettbewerbs-IDs) und Land */
const RULES: Record<TvCountry, Partial<Record<string, Rule>>> = {
  DE: {
    'c-super-lig': fixed([DIGITURK_EURO], [SRC.superLigDe], ['no_fta']),
    'c-bundesliga': bundesligaGermany,
    'c-premier-league': fixed([SKY, WOW], [SRC.pl]),
    'c-la-liga': fixed([DAZN], [SRC.laliga]),
    'c-serie-a': fixed([DAZN], [SRC.laliga]),
    'c-ligue-1': fixed([DAZN], [SRC.laliga]),
    'c-champions-league': fixed([DAZN, PRIME], [SRC.cl], ['depends_on_match', 'cl_final_free']),
    'c-europa-league': fixed([SKY, WOW, RTL_PLUS, RTL, NITRO], [SRC.uel], ['depends_on_match', 'uel_top_free']),
    'c-conference-league': fixed([SKY, WOW, RTL_PLUS, RTL, NITRO], [SRC.uel], ['depends_on_match', 'uel_top_free']),
    'c-nations-league': nationsLeagueGermany,
  },
  AT: {
    'c-bundesliga': fixed([SKY_AT, DAZN, ORF], [SRC.atBuli, SRC.dachBuli], ['depends_on_match']),
    'c-champions-league': fixed([SKY_AT, CANAL_AT], [SRC.atCl], ['depends_on_match']),
    'c-premier-league': fixed([SKY_AT], [SRC.atPl]),
  },
  CH: {
    'c-bundesliga': fixed([SKY_CH, DAZN], [SRC.dachBuli], ['depends_on_match']),
    'c-champions-league': fixed([BLUE, SRF], [SRC.chCl], ['depends_on_match']),
    'c-premier-league': fixed([SKY_CH, BLUE], [SRC.chPl]),
  },
  GB: {
    'c-premier-league': fixed([SKY_UK, TNT], [SRC.ukPl], ['depends_on_match']),
    'c-bundesliga': fixed([SKY_UK, BBC], [SRC.ukRights], ['depends_on_match']),
    'c-champions-league': fixed([TNT, PRIME_UK], [SRC.ukRights], ['depends_on_match']),
    'c-europa-league': fixed([TNT], [SRC.ukRights]),
    'c-la-liga': fixed([PREMIER_SPORTS, DISNEY_PLUS], [SRC.ukLaliga], ['depends_on_match']),
    'c-serie-a': fixed([DAZN_INT], [SRC.ukRights]),
  },
  US: {
    'c-premier-league': fixed([NBC, PEACOCK, USA_NETWORK], [SRC.usNbc], ['depends_on_match']),
    'c-bundesliga': fixed([USA_NETWORK, TELEMUNDO, PEACOCK], [SRC.usBuli], ['depends_on_match']),
    'c-champions-league': fixed([PARAMOUNT, CBS], [SRC.usCl], ['depends_on_match']),
    'c-la-liga': fixed([ESPN_PLUS], [SRC.usAll]),
    'c-ligue-1': fixed([BEIN_US], [SRC.usAll]),
    'c-super-lig': fixed([BEIN_US], [SRC.usSuperLig]),
  },
  TR: {
    'c-super-lig': fixed([BEIN, TOD], [SRC.superLigTr, SRC.tr]),
    'c-bundesliga': fixed([S_SPORT, S_SPORT_PLUS], [SRC.tr, SRC.tr2]),
    'c-la-liga': fixed([S_SPORT, S_SPORT_PLUS], [SRC.tr, SRC.tr2]),
    'c-serie-a': fixed([S_SPORT, S_SPORT_PLUS], [SRC.tr, SRC.tr2]),
    'c-premier-league': fixed([BEIN, TOD], [SRC.tr, SRC.tr2]),
    'c-ligue-1': fixed([BEIN, TOD], [SRC.tr, SRC.tr2]),
    'c-champions-league': fixed([TRT, TABII], [SRC.tr, SRC.tr2]),
    'c-europa-league': fixed([TRT, TABII], [SRC.tr, SRC.tr2]),
    'c-conference-league': fixed([TRT, TABII], [SRC.tr, SRC.tr2]),
    'c-nations-league': (f) =>
      // Die Quellen nennen ATV/A Spor für die Nations League; sicher belegt sind die Spiele der Türkei
      f.homeTeam.id === TURKIYE_TEAM_ID || f.awayTeam.id === TURKIYE_TEAM_ID
        ? { channels: [ATV, A_SPOR], notes: [], sources: [SRC.tr2, SRC.tr] }
        : undefined,
  },
}

/** Sender, die die Datenquelle für genau dieses Spiel meldet (aktueller als die Rechteliste) */
function reportedChannels(fixture: Fixture, country: string): Channel[] {
  return (fixture.broadcasts ?? [])
    .filter((b) => b.country === country)
    .map((b) => ({ name: b.name, kind: b.kind, free: false, url: KNOWN_URLS[b.name.toLowerCase()] }))
}

/** Übertragungsinfo für ein Spiel – undefined, wenn keine belegte Angabe vorliegt. */
export function tvInfoFor(fixture: Fixture, country: TvCountry): TvInfo | undefined {
  const fromRights = RULES[country][fixture.competitionId]?.(fixture)
  const reported = reportedChannels(fixture, country)
  if (!reported.length) return fromRights
  // Pro Spiel gemeldete Sender gehen vor; bekannte Sender behalten ihre Angaben (kostenlos, Link)
  const known = new Map((fromRights?.channels ?? []).map((c) => [c.name.toLowerCase(), c]))
  return {
    channels: reported.map((c) => known.get(c.name.toLowerCase()) ?? c),
    notes: [],
    sources: fromRights?.sources ?? [],
    reported: true,
  }
}

export interface CountryTv {
  country: string
  info: TvInfo
}

/** Alle bekannten Sender weltweit – gewähltes Land zuerst, dann weitere Länder mit Angaben */
export function tvWorldwide(fixture: Fixture, first: TvCountry): CountryTv[] {
  const countries = [first, ...TV_COUNTRIES.filter((c) => c !== first)]
  const result: CountryTv[] = countries.flatMap((country) => {
    const info = tvInfoFor(fixture, country)
    return info ? [{ country, info }] : []
  })
  // Länder, die nur die Datenquelle pro Spiel meldet
  const extra = [...new Set((fixture.broadcasts ?? []).map((b) => b.country))].filter((c) => !TV_COUNTRIES.includes(c as TvCountry))
  for (const country of extra) {
    result.push({ country, info: { channels: reportedChannels(fixture, country), notes: [], sources: [], reported: true } })
  }
  return result
}
