/**
 * ESPN liefert Ländernamen nur auf Englisch. Übersetzung ins Deutsche über die im Browser
 * eingebauten Ländernamen (Intl.DisplayNames) – plus Sonderfälle, die keine ISO-Länder sind
 * oder bei ESPN anders heißen.
 */

const SPECIAL: Record<string, string> = {
  england: 'England',
  scotland: 'Schottland',
  wales: 'Wales',
  'northern ireland': 'Nordirland',
  'rep ireland': 'Irland',
  'republic of ireland': 'Irland',
  türkiye: 'Türkei',
  turkey: 'Türkei',
  'bosnia-herzegovina': 'Bosnien und Herzegowina',
  'bosnia and herzegovina': 'Bosnien und Herzegowina',
  czechia: 'Tschechien',
  'czech republic': 'Tschechien',
  'korea republic': 'Südkorea',
  'south korea': 'Südkorea',
  'korea dpr': 'Nordkorea',
  'north korea': 'Nordkorea',
  'ivory coast': 'Elfenbeinküste',
  "cote d'ivoire": 'Elfenbeinküste',
  'dr congo': 'DR Kongo',
  'congo dr': 'DR Kongo',
  'cape verde islands': 'Kap Verde',
  'cape verde': 'Kap Verde',
  usa: 'USA',
  'united states': 'USA',
  'ir iran': 'Iran',
  'china pr': 'China',
  'faroe islands': 'Färöer',
  'north macedonia': 'Nordmazedonien',
  kosovo: 'Kosovo',
}

let lookup: Map<string, string> | undefined

/** Baut einmalig die Zuordnung "englischer Name" → "deutscher Name" für alle Regionscodes auf. */
function buildLookup(): Map<string, string> {
  const map = new Map<string, string>()
  try {
    const en = new Intl.DisplayNames(['en'], { type: 'region' })
    const de = new Intl.DisplayNames(['de'], { type: 'region' })
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    for (const a of letters) {
      for (const b of letters) {
        const code = a + b
        const english = en.of(code)
        const german = de.of(code)
        // Unbekannte Codes gibt Intl unverändert zurück
        if (english && german && english !== code) map.set(english.toLowerCase(), german)
      }
    }
  } catch {
    // Ohne Intl.DisplayNames bleiben die englischen Namen stehen.
  }
  return map
}

/** Ländername in der gewünschten Sprache – ESPN liefert bereits Englisch. */
export function localizeCountry(name: string | undefined, language: 'de' | 'en'): string | undefined {
  return language === 'de' ? toGermanCountry(name) : name
}

/** Übersetzt einen englischen Ländernamen; Unbekanntes bleibt unverändert. */
export function toGermanCountry(name: string | undefined): string | undefined {
  if (!name) return name
  const key = name.trim().toLowerCase()
  const special = SPECIAL[key]
  if (special) return special
  lookup ??= buildLookup()
  return lookup.get(key) ?? name
}
