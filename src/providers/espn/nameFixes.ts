/**
 * Korrekturen für Namen und Daten aus ESPN.
 *
 * ESPN entfernt Buchstaben wie ğ, ı, ş und İ ("Besiktas", "Ugurcan Çakir") und liefert Vereine
 * teils unter englischen Namen ("Bayern Munich"). Außerdem enthalten die Quelldaten vereinzelt
 * Fehler. Dieses Modul korrigiert das an einer zentralen Stelle – Grundlage sind die ESPN-IDs.
 */
import type { Language } from '../../i18n'
import { normalizeText } from '../../domain/text'

// ------------------------------------------------------------ Vereine

interface TeamName {
  /** Gilt für alle Sprachen, wenn keine sprachspezifische Variante existiert */
  name: string
  short?: string
  de?: { name: string; short?: string }
}

/** Korrekte Schreibweise bzw. deutsche Namen – Schlüssel ist die ESPN-Team-ID */
const TEAM_NAMES: Record<string, TeamName> = {
  // Türkei
  '1895': { name: 'Beşiktaş' },
  '7656': { name: 'Çaykur Rizespor' },
  '20729': { name: 'Eyüpspor' },
  '436': { name: 'Fenerbahçe' },
  '996': { name: 'Gençlerbirliği' },
  '789': { name: 'Göztepe' },
  '7914': { name: 'İstanbul Başakşehir', short: 'Başakşehir' },
  '6870': { name: 'Kasımpaşa' },
  '132334': { name: 'Çorum FK' },
  // Deutschland (deutsche Namen)
  '132': { name: 'Bayern Munich', short: 'Bayern', de: { name: 'Bayern München', short: 'Bayern' } },
  '122': { name: 'FC Cologne', short: 'Cologne', de: { name: '1. FC Köln', short: 'Köln' } },
  '127': { name: 'Hamburg SV', short: 'Hamburg', de: { name: 'Hamburger SV', short: 'HSV' } },
  '2950': { name: 'Mainz', de: { name: 'Mainz 05' } },
  // Weitere Europapokal-Teams
  '110': { name: 'Inter Milan', short: 'Inter', de: { name: 'Inter Mailand', short: 'Inter' } },
  '494': { name: 'Slavia Prague', de: { name: 'Slavia Prag' } },
  '433': { name: 'Sparta Prague', short: 'Sparta', de: { name: 'Sparta Prag', short: 'Sparta' } },
  '2290': { name: 'Red Star Belgrade', short: 'Red Star', de: { name: 'Roter Stern Belgrad', short: 'Roter Stern' } },
  '887': { name: 'AEK Athens', de: { name: 'AEK Athen' } },
  '1010': { name: 'OFI Crete', de: { name: 'OFI Kreta' } },
  '493': { name: 'Shakhtar Donetsk', short: 'Shakhtar', de: { name: 'Schachtar Donezk', short: 'Schachtar' } },
  '909': { name: 'FC Copenhagen', short: 'Copenhagen', de: { name: 'FC Kopenhagen', short: 'Kopenhagen' } },
  '10834': { name: 'CSKA Sofia', de: { name: 'ZSKA Sofia' } },
  '20024': { name: 'Ararat-Armenia' },
  '622': { name: 'Ferencváros' },
  '2990': { name: 'Lech Poznań' },
  '11505': { name: 'Jagiellonia Białystok', short: 'Jagiellonia' },
  '11706': { name: 'Viktoria Plzeň' },
  '987': { name: 'Lillestrøm' },
  '20028': { name: 'Kauno Žalgiris' },
  '2980': { name: 'Bodø/Glimt' },
}

export function fixTeamName(
  teamId: string,
  espn: { name: string; short: string },
  language: Language,
): { name: string; short: string } {
  const entry = TEAM_NAMES[teamId]
  if (!entry) return espn
  const localized = (language === 'de' && entry.de) || entry
  return { name: localized.name, short: localized.short ?? (entry.short && !entry.de ? entry.short : localized.name) }
}

// ------------------------------------------------------------ Türkische Spielernamen

/** ESPN-IDs türkischer Teams außerhalb der Süper Lig (Nationalmannschaften) */
const TURKISH_TEAM_IDS = new Set([
  '465', '6170', '19208', // Türkiye A, U19, U21
  // Süper Lig 2026/27
  '9078', '132335', '1895', '7656', '19267', '20729', '436', '432', '20070', '996', '789', '7914',
  '6870', '995', '7648', '11429', '997', '132334',
])

export interface NameContext {
  /** Erzwingt den türkischen Kontext (z. B. Spiel mit türkischer Beteiligung) */
  turkish?: boolean
  teamId?: string
  /** ESPN-Liga-Slug, z. B. "tur.1" */
  leagueSlug?: string
  /** Nationalität laut Quelle (englisch) */
  nationality?: string
}

/** Türkische Schreibweise nur anwenden, wo sie sicher passt: türkisches Team, türkische Liga oder Nationalität. */
export function isTurkishContext(ctx: NameContext): boolean {
  return (
    ctx.turkish === true ||
    (ctx.teamId !== undefined && TURKISH_TEAM_IDS.has(ctx.teamId)) ||
    (ctx.leagueSlug?.startsWith('tur.') ?? false) ||
    /^(türkiye|turkey)$/i.test(ctx.nationality ?? '')
  )
}

/**
 * Namensteile mit türkischen Sonderbuchstaben. Bewusst NICHT enthalten sind Namen, die es auch
 * in anderen Sprachen ohne Sonderzeichen gibt (z. B. Ismail, Ibrahim) – sonst würde
 * aus "Ismail Jakobs" fälschlich "İsmail Jakobs".
 */
const TURKISH_TOKENS = [
  // Vornamen
  'Uğur', 'Uğurcan', 'Doğan', 'Doğukan', 'Tuğrul', 'Tuğberk', 'Buğra', 'Ertuğrul', 'Çağlar', 'Çağatay', 'Çağan',
  'Çağrı', 'Çağdaş', 'Barış', 'Işık', 'İlkay', 'İrfan', 'İlhan', 'İzzet', 'İsmet', 'İlker', 'İlkan', 'Şükrü',
  'Şener', 'Şenol', 'Şeref', 'Görkem', 'Gökhan', 'Gökay', 'Göktan', 'Gökdeniz', 'Göktuğ', 'Ömer', 'Özgür',
  'Oğuz', 'Oğuzhan', 'Oğulcan', 'Yağız', 'Yiğit', 'Kağan', 'Çınar', 'Alparslan', 'Aşkın', 'Hüseyin', 'Mücahit',
  'Abdülkerim', 'Abdülkadir', 'Abdülsamed', 'Eyüp', 'Ünal', 'Ümit', 'Kazım', 'Kazımcan', 'Rıdvan', 'Rıza',
  'Tarık', 'Fırat', 'Anıl', 'Selçuk', 'Kübilay', 'Aytaç', 'Erdoğan', 'Bünyamin', 'Süleyman', 'Gürkan', 'Güray',
  'Muhammet', 'Hüsamettin', 'Nazım', 'Müslüm', 'Yıldıray', 'Tunç', 'Taşkın', 'Batıhan', 'Baran', 'Emirhan',
  // Nachnamen
  'Yılmaz', 'Şahin', 'Çelik', 'Yıldız', 'Yıldırım', 'Öztürk', 'Aydın', 'Özdemir', 'Kılıç', 'Çetin', 'Koç',
  'Özkan', 'Şimşek', 'Özcan', 'Çakır', 'Aktaş', 'Güler', 'Yalçın', 'Güneş', 'Keskin', 'Işıklı', 'Avcı', 'Sarı',
  'Taş', 'Köse', 'Yüksel', 'Ateş', 'Çiftçi', 'Kılınç', 'Karataş', 'Bardakcı', 'Güvenç', 'Elmalı', 'Ünyay',
  'Gündoğan', 'Akgün', 'Gül', 'Kökçü', 'Söyüncü', 'Kahveci', 'Ünder', 'Aktürkoğlu', 'Yazıcı', 'Müldür',
  'Kadıoğlu', 'Yüksek', 'Özbayraklı', 'Bayındır', 'Günok', 'Şengezer', 'Akaydın', 'Kızıldağ', 'Kılıçsoy',
  'Özkacar', 'Dervişoğlu', 'Yokuşlu', 'Taşdemir', 'Büyük', 'Kaplan', 'Doğru', 'Sağlam', 'Tekdemir', 'Kütük',
  'Aydoğdu', 'Uğurlu', 'Ağaoğlu', 'Çalık', 'Kaçar', 'Coşkun', 'Özmen', 'Topçu', 'Durmuş', 'Şeker', 'Toköz',
  'Gürler', 'Çalhanoğlu', 'Ayhan', 'Kısa', 'Kıyak', 'Çiçek', 'Özyakup', 'Akçiçek', 'Arıcı', 'Sırrı',
]

const TOKEN_MAP = new Map(TURKISH_TOKENS.map((t) => [normalizeText(t), t]))

function fixTurkishToken(token: string): string {
  const key = normalizeText(token)
  const known = TOKEN_MAP.get(key)
  if (known) return known
  // Nachnamen auf "-oğlu" sind eindeutig türkisch
  if (/oglu$/i.test(token)) return token.replace(/oglu$/i, (m) => (m[0] === 'O' ? 'Oğlu' : 'oğlu'))
  return token
}

// ------------------------------------------------------------ Spieler

interface PlayerCorrection {
  name?: string
  /** Englischer Ländername wie bei ESPN (wird danach übersetzt) */
  nationality?: string
}

/**
 * Nachweislich falsche Angaben der Datenquelle – Schlüssel ist die ESPN-Spieler-ID.
 * Neue Einträge immer mit Grund und Datum kommentieren.
 */
const PLAYER_CORRECTIONS: Record<string, PlayerCorrection> = {
  // Can Güner (Galatasaray): ESPN führt ihn als Argentinier – gemeldet 27.09.2026
  '403895': { nationality: 'Türkiye' },
}

export function correctedNationality(playerId: string, espnNationality?: string): string | undefined {
  return PLAYER_CORRECTIONS[playerId]?.nationality ?? espnNationality
}

/** Korrekte Schreibweise eines Spielernamens (Korrekturliste vor türkischem Wörterbuch) */
export function fixPlayerName(playerId: string | undefined, name: string, ctx: NameContext): string {
  const override = playerId ? PLAYER_CORRECTIONS[playerId]?.name : undefined
  if (override) return override
  const nationality = playerId ? correctedNationality(playerId, ctx.nationality) : ctx.nationality
  if (!isTurkishContext({ ...ctx, nationality })) return name
  return name
    .split(/(\s+|-|\.)/)
    .map((part) => (/^[\p{L}']+$/u.test(part) ? fixTurkishToken(part) : part))
    .join('')
}
