import { describe, expect, it } from 'vitest'
import { formatMinute, isFinished, isLive, isUpcoming, matchesFilter, needsLiveRefresh } from './status'
import type { Fixture } from './types'

const team = { id: 't', slug: 't', name: 'T', shortName: 'T' }
const fixture = (status: Fixture['status']): Fixture => ({
  id: 'f',
  competitionId: 'c',
  kickoffAt: '2026-01-01T18:00:00Z',
  status,
  homeTeam: team,
  awayTeam: team,
})

describe('status', () => {
  it('klassifiziert Live-, beendete und kommende Spiele', () => {
    expect(isLive('halftime')).toBe(true)
    expect(isLive('finished')).toBe(false)
    expect(isFinished('finished_pen')).toBe(true)
    expect(isUpcoming('scheduled')).toBe(true)
    expect(isUpcoming('postponed')).toBe(false)
  })

  it('filtert nach Status', () => {
    expect(matchesFilter(fixture('live_2h'), 'live')).toBe(true)
    expect(matchesFilter(fixture('live_2h'), 'finished')).toBe(false)
    expect(matchesFilter(fixture('cancelled'), 'all')).toBe(true)
  })

  it('formatiert die Spielminute', () => {
    expect(formatMinute({ status: 'live_2h', minute: 67 })).toBe("67'")
    expect(formatMinute({ status: 'live_2h', minute: 90, extraMinute: 3 })).toBe("90+3'")
    expect(formatMinute({ status: 'halftime', minute: 45 })).toBeUndefined()
    expect(formatMinute({ status: 'live_1h' })).toBeUndefined()
  })
})

describe('needsLiveRefresh', () => {
  const now = Date.parse('2026-10-04T18:00:00Z')
  const at = (minutes: number) => new Date(now + minutes * 60_000).toISOString()
  it('aktualisiert laufende Spiele und Spiele rund um den Anpfiff', () => {
    expect(needsLiveRefresh({ status: 'live_2h', kickoffAt: at(-70) }, now)).toBe(true)
    expect(needsLiveRefresh({ status: 'scheduled', kickoffAt: at(1) }, now)).toBe(true)
    expect(needsLiveRefresh({ status: 'scheduled', kickoffAt: at(-5) }, now)).toBe(true)
  })
  it('lässt geplante und beendete Spiele in Ruhe', () => {
    expect(needsLiveRefresh({ status: 'scheduled', kickoffAt: at(30) }, now)).toBe(false)
    expect(needsLiveRefresh({ status: 'scheduled', kickoffAt: at(-60) }, now)).toBe(false)
    expect(needsLiveRefresh({ status: 'finished', kickoffAt: at(-100) }, now)).toBe(false)
  })
})
