/** Rückkehrtexte der Quelle ("A few weeks", "Mid October 2026") für die Anzeige übersetzen */
import type { Language } from '../../i18n'

const MONTHS_DE: Record<string, string> = {
  january: 'Januar', february: 'Februar', march: 'März', april: 'April', may: 'Mai', june: 'Juni',
  july: 'Juli', august: 'August', september: 'September', october: 'Oktober', november: 'November', december: 'Dezember',
}
const PART_DE: Record<string, string> = { early: 'Anfang', mid: 'Mitte', late: 'Ende' }

export function returnText(raw: string | undefined, language: Language): string | undefined {
  const text = raw?.trim()
  if (!text || /^unknown$/i.test(text)) return undefined
  if (language === 'en') return text
  const lower = text.toLowerCase()
  if (lower === 'a few weeks') return 'in einigen Wochen'
  if (lower === 'a few days') return 'in einigen Tagen'
  if (lower === 'about a week') return 'in ca. einer Woche'
  if (lower === 'back in training') return 'wieder im Training'
  if (/out for (the )?season|season/i.test(lower)) return 'nach Saisonende'
  let m = /^about (\d+)(?:\s*-\s*(\d+))? (day|week|month)s?$/.exec(lower)
  if (m) {
    const unit = { day: ['Tag', 'Tagen'], week: ['Woche', 'Wochen'], month: ['Monat', 'Monaten'] }[m[3] as 'day' | 'week' | 'month']
    const range = m[2] ? `${m[1]}–${m[2]}` : m[1]
    return `in ca. ${range} ${m[2] || m[1] !== '1' ? unit[1] : unit[0]}`
  }
  m = /^(early|mid|late) (\w+)(?: (\d{4}))?$/.exec(lower)
  if (m && MONTHS_DE[m[2]!]) return [PART_DE[m[1]!], MONTHS_DE[m[2]!], m[3]].filter(Boolean).join(' ')
  m = /^(\w+) (\d{4})$/.exec(lower)
  if (m && MONTHS_DE[m[1]!]) return `${MONTHS_DE[m[1]!]} ${m[2]}`
  return text
}
