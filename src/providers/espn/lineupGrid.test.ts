import { describe, expect, it } from 'vitest'
import { assignGrid, type GridInput } from './lineupGrid'

/** Liefert pro Reihe die Positionen von links nach rechts */
function rows(players: GridInput[], formation: string): string[][] {
  const slots = assignGrid(players, formation)
  if (!slots) throw new Error('keine Zuordnung')
  const byRow = new Map<number, { col: number; pos: string }[]>()
  slots.forEach((s, i) => {
    if (!s) return
    byRow.set(s.gridRow, [...(byRow.get(s.gridRow) ?? []), { col: s.gridCol, pos: players[i]?.position ?? '' }])
  })
  return [...byRow.entries()].sort((a, b) => a[0] - b[0]).map(([, r]) => r.sort((a, b) => a.col - b.col).map((x) => x.pos))
}

const p = (position: string, formationPlace: number): GridInput => ({ position, formationPlace })

describe('assignGrid', () => {
  it('ordnet eine echte 5-4-1-Aufstellung (ESPN) zu', () => {
    const players = [p('G', 1), p('CD', 5), p('CD-L', 4), p('CD-R', 6), p('LB', 3), p('RB', 2), p('CM-L', 10), p('CM-R', 8), p('LM', 11), p('RM', 7), p('F', 9)]
    expect(rows(players, '5-4-1')).toEqual([
      ['G'],
      ['LB', 'CD-L', 'CD', 'CD-R', 'RB'],
      ['LM', 'CM-L', 'CM-R', 'RM'],
      ['F'],
    ])
  })

  it('ordnet eine echte 3-4-3-Aufstellung (ESPN) zu', () => {
    const players = [p('G', 1), p('CD', 5), p('CD-L', 4), p('CD-R', 6), p('CM-L', 8), p('CM-R', 7), p('LM', 3), p('RM', 2), p('F', 9), p('CF-L', 11), p('CF-R', 10)]
    expect(rows(players, '3-4-3')).toEqual([
      ['G'],
      ['CD-L', 'CD', 'CD-R'],
      ['LM', 'CM-L', 'CM-R', 'RM'],
      ['CF-L', 'F', 'CF-R'],
    ])
  })

  it('trennt bei 4-2-3-1 die Doppelsechs von der offensiven Dreierreihe', () => {
    const players = [p('G', 1), p('LB', 3), p('CD-L', 5), p('CD-R', 6), p('RB', 2), p('CM-L', 4), p('CM-R', 8), p('LM', 11), p('AM', 10), p('RM', 7), p('F', 9)]
    expect(rows(players, '4-2-3-1')).toEqual([
      ['G'],
      ['LB', 'CD-L', 'CD-R', 'RB'],
      ['CM-L', 'CM-R'],
      ['LM', 'AM', 'RM'],
      ['F'],
    ])
  })

  it('gibt nichts zurück, wenn Formation und Spielerzahl nicht passen', () => {
    expect(assignGrid([p('G', 1), p('CD', 2)], '4-4-2')).toBeUndefined()
    expect(assignGrid([p('G', 1)], undefined)).toBeUndefined()
    expect(assignGrid([p('G', 1)], 'abc')).toBeUndefined()
  })
})
