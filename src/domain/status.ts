import type { Fixture, FixtureStatus } from './types'

const LIVE: ReadonlySet<FixtureStatus> = new Set([
  'live_1h',
  'halftime',
  'live_2h',
  'extra_time',
  'break',
  'penalties',
])

const FINISHED: ReadonlySet<FixtureStatus> = new Set(['finished', 'finished_aet', 'finished_pen'])

export type FixtureFilter = 'all' | 'live' | 'upcoming' | 'finished'

export const isLive = (status: FixtureStatus) => LIVE.has(status)
export const isFinished = (status: FixtureStatus) => FINISHED.has(status)
export const isUpcoming = (status: FixtureStatus) => status === 'scheduled'

export function matchesFilter(fixture: Fixture, filter: FixtureFilter): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'live':
      return isLive(fixture.status)
    case 'upcoming':
      return isUpcoming(fixture.status)
    case 'finished':
      return isFinished(fixture.status)
  }
}

const STATUS_LABELS: Record<FixtureStatus, string> = {
  scheduled: 'Geplant',
  live_1h: '1. Halbzeit',
  halftime: 'Halbzeit',
  live_2h: '2. Halbzeit',
  extra_time: 'Verlängerung',
  break: 'Pause',
  penalties: 'Elfmeterschießen',
  finished: 'Beendet',
  finished_aet: 'n. V.',
  finished_pen: 'n. E.',
  postponed: 'Verschoben',
  cancelled: 'Abgesagt',
  abandoned: 'Abgebrochen',
  suspended: 'Unterbrochen',
  unknown: '–',
}

export const statusLabel = (status: FixtureStatus) => STATUS_LABELS[status]

/** Anzeige der Spielminute, z. B. "67'" oder "90+3'". Undefined, wenn nicht verfügbar. */
export function formatMinute(fixture: Pick<Fixture, 'status' | 'minute' | 'extraMinute'>): string | undefined {
  if (fixture.status === 'halftime') return 'HZ'
  if (fixture.status === 'penalties') return 'Elf.'
  if (fixture.minute === undefined) return undefined
  return fixture.extraMinute ? `${fixture.minute}+${fixture.extraMinute}'` : `${fixture.minute}'`
}
