/** Verletzungsarten der Quelle (englisch, z. B. "Thigh injury") für die Anzeige übersetzen */
import type { Language } from '../../i18n'

/** Ganze Bezeichnungen, die sich nicht aus Körperteil + "injury" zusammensetzen */
const PHRASES: Record<string, string> = {
  'injured': 'Verletzung',
  'unknown injury': 'Verletzung',
  'injury': 'Verletzung',
  'knock': 'Prellung',
  'illness': 'Erkrankung',
  'virus': 'Virusinfektion',
  'concussion': 'Gehirnerschütterung',
  'fitness': 'Fitnessrückstand',
  'lack of fitness': 'Fitnessrückstand',
  'personal reasons': 'private Gründe',
  'surgery': 'Operation',
  'suspended': 'Sperre',
  'suspension': 'Sperre',
  'red card suspension': 'Rotsperre',
  'yellow card suspension': 'Gelbsperre',
  'cruciate ligament rupture': 'Kreuzbandriss',
  'torn cruciate ligament': 'Kreuzbandriss',
  'acl injury': 'Kreuzbandverletzung',
  'muscle tear': 'Muskelfaserriss',
  'hamstring injury': 'Verletzung der Oberschenkelrückseite',
  'broken leg': 'Beinbruch',
  'broken foot': 'Fußbruch',
  'broken arm': 'Armbruch',
  'broken nose': 'Nasenbeinbruch',
  'covid-19': 'Covid-19',
  'physical discomfort': 'körperliche Beschwerden',
  'strain injury': 'Zerrung',
  'strain': 'Zerrung',
  'sprained ankle': 'Verstauchung des Sprunggelenks',
  'muscle cramps': 'Muskelkrämpfe',
  'heart problems': 'Herzprobleme',
}

/** Körperteile für "<X> injury", "<X> problems", "<X> surgery", "<X> fracture", "Broken <X>" */
const PARTS: Record<string, string> = {
  knee: 'Knie',
  thigh: 'Oberschenkel',
  hamstring: 'Oberschenkel',
  ankle: 'Sprunggelenk',
  foot: 'Fuß',
  calf: 'Waden',
  groin: 'Leisten',
  hip: 'Hüft',
  back: 'Rücken',
  shoulder: 'Schulter',
  muscle: 'Muskel',
  achilles: 'Achillessehnen',
  'achilles tendon': 'Achillessehnen',
  'cruciate ligament': 'Kreuzband',
  meniscus: 'Meniskus',
  ligament: 'Bänder',
  head: 'Kopf',
  hand: 'Hand',
  wrist: 'Handgelenk',
  arm: 'Arm',
  elbow: 'Ellbogen',
  finger: 'Finger',
  toe: 'Zehen',
  rib: 'Rippen',
  abdominal: 'Bauchmuskel',
  adductor: 'Adduktoren',
  heel: 'Fersen',
  neck: 'Nacken',
  face: 'Gesichts',
  eye: 'Augen',
  nose: 'Nasen',
  jaw: 'Kiefer',
  leg: 'Bein',
  shin: 'Schienbein',
  pelvis: 'Becken',
  tendon: 'Sehnen',
  collarbone: 'Schlüsselbein',
  'metatarsal': 'Mittelfuß',
}

/** "Thigh injury" → "Oberschenkelverletzung"; Unbekanntes bleibt englisch. */
export function injuryName(raw: string | undefined, language: Language): string | undefined {
  const text = raw?.trim()
  if (!text) return undefined
  if (language === 'en') return text
  const lower = text.toLowerCase()
  if (PHRASES[lower]) return PHRASES[lower]
  const patterns: [RegExp, (part: string) => string][] = [
    [/^(.+?) (?:injury|problems?|strain)$/, (p) => `${p}verletzung`],
    [/^(.+?) surgery$/, (p) => `${p}-OP`],
    [/^(.+?) (?:fracture|break)$/, (p) => `${p}bruch`],
    [/^broken (.+)$/, (p) => `${p}bruch`],
  ]
  for (const [re, build] of patterns) {
    const m = re.exec(lower)
    const part = m?.[1] && PARTS[m[1]]
    if (part) return build(part)
  }
  return text
}
