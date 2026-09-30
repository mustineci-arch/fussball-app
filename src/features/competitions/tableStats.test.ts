import { describe, expect, it } from 'vitest'
import type { Fixture, Team } from '../../domain/types'
import { computeTable, crossResults, positionHistory } from './tableStats'

const team = (id: string): Team => ({ id, slug: id, name: id, shortName: id })
const [A, B, C] = [team('A'), team('B'), team('C')]

let seq = 0
const game = (home: Team, away: Team, h: number, a: number, day: number, status: Fixture['status'] = 'finished'): Fixture => ({
  id: `f${++seq}`,
  competitionId: 'c',
  kickoffAt: `2026-08-${String(day).padStart(2, '0')}T15:00:00Z`,
  status,
  homeTeam: home,
  awayTeam: away,
  score: status === 'scheduled' ? undefined : { home: h, away: a },
})

const fixtures = [
  game(A, B, 2, 0, 1),
  game(C, A, 1, 1, 8),
  game(B, C, 3, 1, 15),
  // Rückrunde
  game(B, A, 2, 1, 22),
  game(A, C, 0, 1, 29),
  game(C, B, 0, 0, 30, 'scheduled'),
]

describe('computeTable', () => {
  it('berechnet die Gesamttabelle und ignoriert offene Spiele', () => {
    const rows = computeTable(fixtures)
    expect(rows.map((r) => [r.team.id, r.played, r.points])).toEqual([
      ['B', 3, 6],
      ['A', 4, 4],
      ['C', 3, 4],
    ])
    expect(rows[0]!.form).toEqual(['W', 'W', 'L'])
  })

  it('trennt Heim und Auswärts', () => {
    const home = computeTable(fixtures, 'home')
    expect(home.find((r) => r.team.id === 'A')).toMatchObject({ played: 2, won: 1, lost: 1, goalsFor: 2, goalsAgainst: 1 })
    const away = computeTable(fixtures, 'away')
    expect(away.find((r) => r.team.id === 'A')).toMatchObject({ played: 2, drawn: 1, lost: 1, points: 1 })
  })

  it('ordnet das erste Duell der Hinrunde und das zweite der Rückrunde zu', () => {
    expect(computeTable(fixtures, 'first').map((r) => [r.team.id, r.played])).toEqual([
      ['A', 2],
      ['B', 2],
      ['C', 2],
    ])
    const second = computeTable(fixtures, 'second', [A, B, C])
    expect(second.map((r) => [r.team.id, r.played, r.points])).toEqual([
      ['B', 1, 3],
      ['C', 1, 3],
      ['A', 2, 0],
    ])
  })
})

describe('positionHistory', () => {
  it('liefert die Platzierung nach jedem eigenen Spiel', () => {
    const history = positionHistory(fixtures)
    expect(history.get('A')).toEqual([1, 1, 2, 2])
    expect(history.get('B')).toEqual([3, 2, 1])
    expect(history.get('C')).toEqual([2, 3, 3])
  })
})

describe('crossResults', () => {
  it('ordnet Ergebnisse nach Heim- und Auswärtsteam', () => {
    const grid = crossResults(fixtures)
    expect(grid.get('A')?.get('B')?.[0]?.score).toEqual({ home: 2, away: 0 })
    expect(grid.get('B')?.get('A')?.[0]?.score).toEqual({ home: 2, away: 1 })
    expect(grid.get('C')?.get('B')).toBeUndefined()
  })
})
