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

/** Länder mit recherchierter Senderliste */
export type RightsCountry = 'DE' | 'AT' | 'CH' | 'TR' | 'GB' | 'US' | 'ES' | 'IT' | 'FR' | 'NL'
export const TV_COUNTRIES: readonly RightsCountry[] = ['DE', 'AT', 'CH', 'TR', 'GB', 'US', 'ES', 'IT', 'FR', 'NL']
/** Beliebiges Land (ISO-3166-Code) – "Mein Land" kann jedes Land der Welt sein */
export type TvCountry = string

/** Alle Länder der Welt (ISO 3166-1 Alpha-2) für die Auswahl "Mein Land" */
export const ALL_COUNTRIES: readonly string[] = (
  'AD AE AF AG AI AL AM AO AR AS AT AU AW AZ BA BB BD BE BF BG BH BI BJ BM BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CK CL CM CN CO CR CU CV CW CY CZ ' +
  'DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT ' +
  'JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MO MQ MR MS MT MU MV MW MX MY MZ ' +
  'NA NC NE NG NI NL NO NP NR NZ OM PA PE PF PG PH PK PL PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SX SY SZ ' +
  'TC TD TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VG VI VN VU WS XK YE ZA ZM ZW'
).split(' ')

export const hasRightsList = (country: string): country is RightsCountry => (TV_COUNTRIES as readonly string[]).includes(country)

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

export type TvNote = 'buli_free_extra' | 'cl_final_free' | 'uel_top_free' | 'no_fta' | 'depends_on_match' | 'nl_free_dutch'

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

// Spanien
const MOVISTAR = ch('Movistar+', false, 'https://www.movistarplus.es/deportes')
const DAZN_ES = ch('DAZN', false, 'https://www.dazn.com/es-ES/home', 'stream')
const RTVE = ch('RTVE (La 1)', true, 'https://www.rtve.es/play/directos')
// Italien
const DAZN_IT = ch('DAZN', false, 'https://www.dazn.com/it-IT/home', 'stream')
const SKY_IT = ch('Sky Sport', false, 'https://sport.sky.it')
const PRIME_IT = ch('Prime Video', false, 'https://www.primevideo.com', 'stream')
const RAI = ch('Rai 1 / RaiPlay', true, 'https://www.raiplay.it/dirette')
// Frankreich
const LIGUE1_PLUS = ch('Ligue 1+', false, 'https://www.ligue1plus.fr', 'stream')
const CANAL_FR = ch('Canal+', false, 'https://www.canalplus.com')
const TF1 = ch('TF1', true, 'https://www.tf1.fr')
// Niederlande
const ZIGGO = ch('Ziggo Sport', false, 'https://www.ziggosport.nl')
const NOS = ch('NOS', true, 'https://nos.nl/sport')

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
  esLaliga: 'https://www.livesoccertv.com/competitions/spain/primera-division/watch/spain/',
  esCl: 'https://www.livesoccertv.com/competitions/international/uefa-champions-league/watch/spain/',
  esNations: 'https://www.livesoccertv.com/competitions/international/uefa-nations-league/watch/spain/',
  itSerieA: 'https://sport.virgilio.it/serie-a-dove-vedere-tutte-le-partite-in-tv-sky-o-dazn-652440',
  itCl: 'https://www.calcioefinanza.it/2026/08/30/dove-vedere-champions-league-2026-2027-tv-streaming/',
  itNational: 'https://www.tvzoom.it/trasmissioni-sportive/nazionale-italiana-streaming/',
  fr: 'https://www.megazap.fr/Droits-TV-Football-2026-2027-Qui-diffuse-quoi-La-nouvelle-carte-du-football-a-la-television_a16814.html',
  nlCl: 'https://www.sportcal.com/media/ziggo-sports-lands-dutch-rights-for-all-uefa-club-competitions/',
  nlNations: 'https://www.uefa.com/uefanationsleague/news/02a9-219ae5c877f5-740390ccb3e5-1000--where-to-watch-the-nations-league-tv-broadcast-partners-li/',
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

/** Spiele eines Nationalteams (über das Länderkürzel, z. B. "ESP") */
const involvesNation = (fixture: Pick<Fixture, 'homeTeam' | 'awayTeam'>, code: string) =>
  [fixture.homeTeam, fixture.awayTeam].some((t) => t.isNational && t.code?.toUpperCase() === code)

const nationalTeamOnly =
  (code: string, channels: Channel[], sources: string[]): Rule =>
  (f) =>
    involvesNation(f, code) ? { channels, notes: [], sources } : undefined
const fixed =
  (channels: Channel[], sources: string[], notes: TvNote[] = []): Rule =>
  () => ({ channels, notes, sources })

/** Rechte je Wettbewerb (interne Wettbewerbs-IDs) und Land */
const RULES: Record<RightsCountry, Partial<Record<string, Rule>>> = {
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
  ES: {
    'c-la-liga': fixed([MOVISTAR, DAZN_ES], [SRC.esLaliga], ['depends_on_match']),
    'c-champions-league': fixed([MOVISTAR], [SRC.esCl]),
    'c-europa-league': fixed([MOVISTAR], [SRC.esCl]),
    'c-conference-league': fixed([MOVISTAR], [SRC.esCl]),
    'c-nations-league': nationalTeamOnly('ESP', [RTVE], [SRC.esNations]),
  },
  IT: {
    'c-serie-a': fixed([DAZN_IT, SKY_IT], [SRC.itSerieA], ['depends_on_match']),
    'c-champions-league': fixed([SKY_IT, PRIME_IT], [SRC.itCl], ['depends_on_match']),
    'c-nations-league': nationalTeamOnly('ITA', [RAI], [SRC.itNational]),
  },
  FR: {
    'c-ligue-1': fixed([LIGUE1_PLUS], [SRC.fr]),
    'c-champions-league': fixed([CANAL_FR], [SRC.fr]),
    'c-europa-league': fixed([CANAL_FR], [SRC.fr]),
    'c-conference-league': fixed([CANAL_FR], [SRC.fr]),
    'c-nations-league': nationalTeamOnly('FRA', [TF1], [SRC.fr]),
  },
  NL: {
    'c-champions-league': fixed([ZIGGO], [SRC.nlCl], ['nl_free_dutch']),
    'c-europa-league': fixed([ZIGGO], [SRC.nlCl], ['nl_free_dutch']),
    'c-conference-league': fixed([ZIGGO], [SRC.nlCl], ['nl_free_dutch']),
    'c-nations-league': nationalTeamOnly('NED', [NOS], [SRC.nlNations]),
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

/**
 * Senderfamilien → offizielle Seite, je Land wo nötig. Greift, wenn der genaue Name nicht bekannt ist
 * ("Sky Bundesliga 2" → Sky Deutschland). Reihenfolge: speziell vor allgemein.
 */
const URL_PATTERNS: readonly [RegExp, string, string?][] = [
  [/^sky/i, 'https://www.sky.de/sport', 'DE'],
  [/^sky/i, 'https://sport.sky.at', 'AT'],
  [/^sky/i, 'https://www.sky.ch', 'CH'],
  [/^sky/i, 'https://www.skysports.com', 'GB'],
  [/^sky/i, 'https://sport.sky.it', 'IT'],
  [/^wow/i, 'https://www.wowtv.de/sport'],
  [/^dazn/i, 'https://www.dazn.com'],
  [/prime video|amazon/i, 'https://www.primevideo.com'],
  [/^(das erste|ard|sportschau)/i, 'https://www.sportschau.de'],
  [/^zdf/i, 'https://www.zdf.de/live-tv'],
  [/^(rtl\+|rtl|nitro)/i, 'https://plus.rtl.de'],
  [/^(sat\.?1|joyn)/i, 'https://www.joyn.de'],
  [/^magenta/i, 'https://www.magentasport.de'],
  [/^orf/i, 'https://on.orf.at'],
  [/^servus/i, 'https://www.servustv.com'],
  [/^canal\+/i, 'https://www.canalplus.com'],
  [/^(srf|rts|rsi)/i, 'https://www.srf.ch/play'],
  [/^blue/i, 'https://www.blueplus.ch/de/sport'],
  [/^(bein|digiturk)/i, 'https://www.beinsports.com'],
  [/^tod/i, 'https://www.todtv.com.tr'],
  [/^s sport/i, 'https://www.ssportplus.com'],
  [/^(trt|tabii)/i, 'https://www.tabii.com'],
  [/^(atv|a spor)/i, 'https://www.atv.com.tr'],
  [/^exxen/i, 'https://www.exxen.com'],
  [/^tnt/i, 'https://www.tntsports.co.uk'],
  [/^hbo/i, 'https://www.hbomax.com'],
  [/^laliga ?tv/i, 'https://www.laliga.com/en-GB/broadcasters/laligatv'],
  [/^(bbc)/i, 'https://www.bbc.co.uk/iplayer'],
  [/^itv/i, 'https://www.itv.com'],
  [/^premier sports/i, 'https://www.premiersports.com'],
  [/^peacock/i, 'https://www.peacocktv.com'],
  [/^(nbc|usa net)/i, 'https://www.nbcsports.com/soccer'],
  [/^(telemundo|universo)/i, 'https://www.telemundo.com/deportes'],
  [/^(paramount|cbs)/i, 'https://www.paramountplus.com'],
  [/^(espn|abc)/i, 'https://www.espn.com'],
  [/^(fox|fs1|fs2|tubi)/i, 'https://www.foxsports.com/soccer'],
  [/^(tudn|univision|vix)/i, 'https://www.tudn.com'],
  [/^fubo/i, 'https://www.fubo.tv'],
  [/^viaplay/i, 'https://viaplay.com'],
  [/^ziggo/i, 'https://www.ziggosport.nl'],
  [/^nos/i, 'https://nos.nl/sport'],
  [/^movistar/i, 'https://www.movistarplus.es/deportes'],
  [/^(rtve|la 1|teledeporte)/i, 'https://www.rtve.es/play/directos'],
  [/^(rai)/i, 'https://www.raiplay.it/dirette'],
  [/^(tf1)/i, 'https://www.tf1.fr'],
  [/^ligue 1\+/i, 'https://www.ligue1plus.fr'],
  [/^onefootball/i, 'https://onefootball.com'],
  [/^(globo|sportv|cazetv)/i, 'https://ge.globo.com'],
  [/^(tsn)/i, 'https://www.tsn.ca'],
  [/^(optus)/i, 'https://sport.optus.com.au'],
  [/^(stan)/i, 'https://www.stan.com.au/sport'],
]

/** Frei empfangbare Sender/kostenlose Streams (nach Namen) */
const FREE_PATTERN =
  /^(das erste|ard|zdf|sportschau|rtl$|nitro|sat\.?1|orf ?1|orf ?eins|servus|srf|rts|rsi|bbc|itv|s4c|trt|tabii|atv|a spor|tv8|nos|rai ?1|raiplay|tf1|rtve|la 1|teledeporte|telemundo|universo|cbs$|nbc$|abc$|fox$|tubi)/i

export function channelUrl(name: string, country?: string): string | undefined {
  const exact = KNOWN_URLS[name.toLowerCase()]
  if (exact) return exact
  return (
    URL_PATTERNS.find(([re, , c]) => re.test(name) && c === country)?.[1] ??
    URL_PATTERNS.find(([re, , c]) => re.test(name) && !c)?.[1] ??
    URL_PATTERNS.find(([re]) => re.test(name))?.[1]
  )
}

/** Sender, die die Datenquellen (ESPN, FotMob) für genau dieses Spiel melden – aktueller als die Rechteliste */
function reportedChannels(fixture: Fixture, country: string): Channel[] {
  return (fixture.broadcasts ?? [])
    .filter((b) => b.country === country)
    .map((b) => ({ name: b.name, kind: b.kind, free: FREE_PATTERN.test(b.name), url: channelUrl(b.name, country) }))
}

/** Übertragungsinfo für ein Spiel – undefined, wenn keine belegte Angabe vorliegt. */
export function tvInfoFor(fixture: Fixture, country: TvCountry): TvInfo | undefined {
  const fromRights = hasRightsList(country) ? RULES[country][fixture.competitionId]?.(fixture) : undefined
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
  /** Teams dieses Spiels, die aus diesem Land kommen */
  homeOf?: string[]
}

/**
 * Alle bekannten Sender weltweit. Reihenfolge: gewähltes Land, dann die Heimatländer der beiden Teams,
 * dann alle weiteren Länder mit Angaben.
 * `teamCountries`: Land je Team (ISO-Code), z. B. { 'Galatasaray': 'TR', 'Ajax': 'NL' }.
 */
export function tvWorldwide(fixture: Fixture, first: TvCountry, teamCountries: Record<string, string> = {}): CountryTv[] {
  const reportedCountries = (fixture.broadcasts ?? []).map((b) => b.country)
  const countries = [...new Set<string>([first, ...Object.values(teamCountries), ...TV_COUNTRIES, ...reportedCountries])]
  const homeOf = (country: string) => {
    const teams = Object.entries(teamCountries).filter(([, c]) => c === country).map(([team]) => team)
    return teams.length ? teams : undefined
  }
  const result: CountryTv[] = countries.flatMap((country) => {
    const info = tvInfoFor(fixture, country)
    return info ? [{ country, info, homeOf: homeOf(country) }] : []
  })
  return result
}
