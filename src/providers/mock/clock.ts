import type { FixtureStatus } from '../../domain/types'

export interface MatchClock {
  status: FixtureStatus
  minute?: number
  extraMinute?: number
  /** Ereignisse mit eventOrder <= cutoff sind bereits passiert */
  cutoff: number
}

/** Simulierte Spieluhr aus den Minuten seit Anpfiff (inkl. Halbzeitpause). */
export function matchClock(kickoffAt: string, now = Date.now()): MatchClock {
  const elapsed = (now - new Date(kickoffAt).getTime()) / 60_000
  if (elapsed < 0) return { status: 'scheduled', cutoff: -1 }
  if (elapsed < 45) {
    const minute = Math.floor(elapsed) + 1
    return { status: 'live_1h', minute, cutoff: minute }
  }
  if (elapsed < 48) {
    const extraMinute = Math.floor(elapsed - 45) + 1
    return { status: 'live_1h', minute: 45, extraMinute, cutoff: 45 + extraMinute / 10 }
  }
  if (elapsed < 63) return { status: 'halftime', minute: 45, cutoff: 45.9 }
  if (elapsed < 107) {
    const minute = 46 + Math.floor(elapsed - 63)
    return { status: 'live_2h', minute, cutoff: minute }
  }
  if (elapsed < 112) {
    const extraMinute = Math.floor(elapsed - 107) + 1
    return { status: 'live_2h', minute: 90, extraMinute, cutoff: 90 + extraMinute / 10 }
  }
  return { status: 'finished', cutoff: Number.POSITIVE_INFINITY }
}
