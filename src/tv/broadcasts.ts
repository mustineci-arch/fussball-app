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

export type TvCountry = 'DE' | 'TR'
export const TV_COUNTRIES: readonly TvCountry[] = ['DE', 'TR']

export const RIGHTS_AS_OF = '2026-09-27'

export interface Channel {
  name: string
  /** true = frei empfangbar / kostenlos, false = Abo nötig */
  free: boolean
  kind: 'tv' | 'stream'
  /** Offizielle Seite des Anbieters (Live-/Sportbereich) – nur legale Angebote, keine fremden Streams */
  url: string
}

export type TvNote = 'buli_free_extra' | 'cl_final_free' | 'uel_top_free' | 'no_fta' | 'depends_on_match'

export interface TvInfo {
  channels: Channel[]
  notes: TvNote[]
  sources: string[]
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

const SRC = {
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

/** Übertragungsinfo für ein Spiel – undefined, wenn keine belegte Angabe vorliegt. */
export function tvInfoFor(fixture: Fixture, country: TvCountry): TvInfo | undefined {
  return RULES[country][fixture.competitionId]?.(fixture)
}
