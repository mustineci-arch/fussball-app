import { describe, expect, it } from 'vitest'
import { ratePlayer, rateLineup, ratingTier } from './rating'
import type { Lineup, LineupPlayer } from './types'

const player = (id: string, position: LineupPlayer['player']['position'], stats?: LineupPlayer['stats'], extra: Partial<LineupPlayer> = {}): LineupPlayer => ({
  player: { id, name: id, position },
  stats,
  ...extra,
})

describe('ratePlayer', () => {
  it('liefert ohne Einzelwerte keine Note', () => {
    expect(ratePlayer({ entry: player('a', 'MF') })).toBeUndefined()
  })

  it('belohnt Tore und Vorlagen, bestraft Karten', () => {
    const scorer = ratePlayer({ entry: player('a', 'FW', { goals: 2, assists: 1, shots: 4, shotsOnTarget: 3 }), outcome: 'win' })!
    const booked = ratePlayer({ entry: player('b', 'MF', { yellowCards: 1, redCards: 1, foulsCommitted: 3 }), outcome: 'loss' })!
    expect(scorer).toBeGreaterThan(8)
    expect(booked).toBeLessThan(5)
  })

  it('gibt Torhütern mit weißer Weste und Paraden einen Bonus', () => {
    const clean = ratePlayer({ entry: player('gk', 'GK', { saves: 5, goalsConceded: 0 }), outcome: 'draw', teamConceded: 0 })!
    const leaky = ratePlayer({ entry: player('gk', 'GK', { saves: 1, goalsConceded: 4 }), outcome: 'loss', teamConceded: 4 })!
    expect(clean).toBeGreaterThan(7.5)
    expect(leaky).toBeLessThan(5.5)
  })

  it('bleibt zwischen 3 und 10', () => {
    expect(ratePlayer({ entry: player('a', 'FW', { goals: 6, assists: 3 }) })).toBe(10)
    expect(ratePlayer({ entry: player('a', 'DF', { ownGoals: 3, redCards: 1 }) })).toBe(3)
  })
})

describe('rateLineup', () => {
  it('bewertet Startelf und Eingewechselte, nicht die Bank – beste zuerst', () => {
    const lineup: Lineup = {
      teamId: 't',
      starters: [player('s1', 'MF', {}), player('s2', 'FW', { goals: 1 })],
      substitutes: [player('in', 'FW', { assists: 1 }, { subbedIn: true }), player('bench', 'MF', {})],
    }
    const rated = rateLineup(lineup, 1, 0)
    expect(rated.map((r) => r.entry.player.id)).toEqual(['s2', 'in', 's1'])
    expect(rated.find((r) => r.entry.player.id === 'in')?.starter).toBe(false)
  })
})

it('ordnet Noten Farbstufen zu', () => {
  expect(ratingTier(8.4)).toBe('great')
  expect(ratingTier(7.1)).toBe('good')
  expect(ratingTier(6.6)).toBe('average')
  expect(ratingTier(6.2)).toBe('weak')
  expect(ratingTier(4.9)).toBe('poor')
})
