/** Datumslogik. Ein Kalendertag wird als lokaler Schlüssel "YYYY-MM-DD" behandelt. */
import { getLocale } from '../i18n'

const pad = (n: number) => String(n).padStart(2, '0')

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseDateKey(key: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!match) return undefined
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return toDateKey(date) === key ? date : undefined
}

export function addDays(key: string, days: number): string {
  const date = parseDateKey(key) ?? new Date()
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

export const todayKey = () => toDateKey(new Date())

/** Liegt der UTC-Zeitstempel am lokalen Kalendertag `key`? */
export function isOnDate(isoUtc: string, key: string): boolean {
  return toDateKey(new Date(isoUtc)) === key
}

export type RelativeDay = 'today' | 'yesterday' | 'tomorrow'

export function relativeDay(key: string, today = todayKey()): RelativeDay | undefined {
  if (key === today) return 'today'
  if (key === addDays(today, -1)) return 'yesterday'
  if (key === addDays(today, 1)) return 'tomorrow'
  return undefined
}

// Formatierer je Sprache nur einmal erzeugen
const formatters = new Map<string, Intl.DateTimeFormat>()
function fmt(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const locale = getLocale()
  const cacheKey = `${locale}|${JSON.stringify(options)}`
  let f = formatters.get(cacheKey)
  if (!f) {
    f = new Intl.DateTimeFormat(locale, options)
    formatters.set(cacheKey, f)
  }
  return f
}

const fromKey = (key: string) => parseDateKey(key) ?? new Date()

export const formatWeekday = (key: string) => fmt({ weekday: 'short' }).format(fromKey(key)).replace('.', '')
export const formatShortDate = (key: string) => fmt({ day: '2-digit', month: '2-digit' }).format(fromKey(key))
export const formatLongDate = (key: string) => fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(fromKey(key))
export const formatKickoff = (isoUtc: string) => fmt({ hour: '2-digit', minute: '2-digit' }).format(new Date(isoUtc))
export const formatDateTime = (isoUtc: string) =>
  fmt({ day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(isoUtc))

/** Liefert undefined statt eines Fehlers, wenn das Datum ungültig ist */
export function formatBirthDate(iso: string): string | undefined {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? undefined : fmt({ day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

export function ageFrom(birthDate: string, now = new Date()): number | undefined {
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return undefined
  let age = now.getFullYear() - birth.getFullYear()
  const beforeBirthday =
    now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  if (beforeBirthday) age--
  return age
}
