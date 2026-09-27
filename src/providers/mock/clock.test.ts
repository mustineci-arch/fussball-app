import { describe, expect, it } from 'vitest'
import { matchClock } from './clock'

const kickoff = '2026-09-27T18:00:00.000Z'
const at = (minutes: number) => new Date(kickoff).getTime() + minutes * 60_000

describe('matchClock', () => {
  it('bildet den Spielverlauf ab', () => {
    expect(matchClock(kickoff, at(-5)).status).toBe('scheduled')
    expect(matchClock(kickoff, at(10))).toMatchObject({ status: 'live_1h', minute: 11 })
    expect(matchClock(kickoff, at(46))).toMatchObject({ status: 'live_1h', minute: 45, extraMinute: 2 })
    expect(matchClock(kickoff, at(55)).status).toBe('halftime')
    expect(matchClock(kickoff, at(83))).toMatchObject({ status: 'live_2h', minute: 66 })
    expect(matchClock(kickoff, at(109))).toMatchObject({ status: 'live_2h', minute: 90, extraMinute: 3 })
    expect(matchClock(kickoff, at(130)).status).toBe('finished')
  })
})
