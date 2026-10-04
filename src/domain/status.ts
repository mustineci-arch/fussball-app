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

/**
 * Laufende Spielminute, z. B. "67'" oder "90+3'".
 * Undefined in Pausen (Halbzeit, Elfmeterschießen) oder wenn die Quelle keine Minute liefert –
 * die UI zeigt dann den übersetzten Status.
 */
export function formatMinute(fixture: Pick<Fixture, 'status' | 'minute' | 'extraMinute'>): string | undefined {
  if (fixture.status === 'halftime' || fixture.status === 'penalties' || fixture.status === 'break') return undefined
  if (fixture.minute === undefined) return undefined
  return fixture.extraMinute ? `${fixture.minute}+${fixture.extraMinute}'` : `${fixture.minute}'`
}

const MINUTE = 60_000

/** Spiel läuft, beginnt in den nächsten 2 Minuten oder sollte schon laufen (Anpfiff noch nicht gemeldet) */
export function needsLiveRefresh(f: Pick<Fixture, 'status' | 'kickoffAt'>, now = Date.now()): boolean {
  if (isLive(f.status)) return true
  if (f.status !== 'scheduled') return false
  const toKickoff = new Date(f.kickoffAt).getTime() - now
  return toKickoff < 2 * MINUTE && toKickoff > -20 * MINUTE
}
