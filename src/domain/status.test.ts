import { describe, expect, it } from 'vitest'
import { formatMinute, isFinished, isLive, isUpcoming, matchesFilter } from './status'
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
    expect(formatMinute({ status: 'halftime', minute: 45 })).toBe('HZ')
    expect(formatMinute({ status: 'live_1h' })).toBeUndefined()
  })
})
