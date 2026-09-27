/** Datumslogik. Ein Kalendertag wird als lokaler Schlüssel "YYYY-MM-DD" behandelt. */

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

export function relativeDayLabel(key: string, today = todayKey()): string | undefined {
  if (key === today) return 'Heute'
  if (key === addDays(today, -1)) return 'Gestern'
  if (key === addDays(today, 1)) return 'Morgen'
  return undefined
}

const weekdayFmt = new Intl.DateTimeFormat('de-DE', { weekday: 'short' })
const shortDateFmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' })
const longDateFmt = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
const birthDateFmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
const timeFmt = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' })

const fromKey = (key: string) => parseDateKey(key) ?? new Date()

export const formatWeekday = (key: string) => weekdayFmt.format(fromKey(key)).replace('.', '')
export const formatShortDate = (key: string) => shortDateFmt.format(fromKey(key))
export const formatLongDate = (key: string) => longDateFmt.format(fromKey(key))
export const formatKickoff = (isoUtc: string) => timeFmt.format(new Date(isoUtc))
export const formatBirthDate = (iso: string) => birthDateFmt.format(new Date(iso))
export const formatDateTime = (isoUtc: string) =>
  `${shortDateFmt.format(new Date(isoUtc))}, ${timeFmt.format(new Date(isoUtc))}`

export function ageFrom(birthDate: string, now = new Date()): number | undefined {
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return undefined
  let age = now.getFullYear() - birth.getFullYear()
  const beforeBirthday =
    now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  if (beforeBirthday) age--
  return age
}
