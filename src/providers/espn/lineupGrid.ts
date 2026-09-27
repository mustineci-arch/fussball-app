/**
 * Leitet aus Formation ("4-2-3-1") und Positionskürzeln ("CD-L", "RM", "F") die Feldposition ab.
 * Ergebnis: gridRow (1 = Torwart, aufsteigend Richtung Angriff) und gridCol (1-basiert, von links
 * aus Sicht des Teams). Lässt sich die Formation nicht zuordnen, bleiben die Felder leer –
 * die UI zeigt dann eine einfache Liste statt einer falschen Grafik.
 */

export interface GridInput {
  position?: string
  formationPlace?: number
}

export interface GridSlot {
  gridRow: number
  gridCol: number
}

const DEPTH: Record<string, number> = {
  G: 0, GK: 0,
  SW: 1, CB: 1, CD: 1, D: 1, LB: 1, RB: 1,
  LWB: 1.5, RWB: 1.5, WB: 1.5,
  DM: 2, CDM: 2, LDM: 2, RDM: 2,
  CM: 3, M: 3, LM: 3, RM: 3, MF: 3,
  AM: 4, CAM: 4, LAM: 4, RAM: 4,
  LW: 4.5, RW: 4.5, W: 4.5,
  F: 5, CF: 5, ST: 5, FW: 5, SS: 5, LF: 5, RF: 5,
}

function parse(position = '') {
  const [base = '', side] = position.toUpperCase().split('-')
  // "LB", "LM", "LW" = ganz links; Zusatz "-L"/"-R" (z. B. "CD-L") = halblinks/halbrechts
  let lateral = base.startsWith('L') ? -2 : base.startsWith('R') ? 2 : 0
  if (side === 'L') lateral = -1
  if (side === 'R') lateral = 1
  return { depth: DEPTH[base] ?? 3, lateral, isKeeper: base === 'G' || base === 'GK' }
}

export function parseFormation(formation?: string): number[] | undefined {
  if (!formation) return undefined
  const lines = formation.split('-').map((n) => Number.parseInt(n, 10))
  return lines.every((n) => Number.isFinite(n) && n > 0) ? lines : undefined
}

/** Liefert pro Eingabe-Index einen Slot – oder undefined, wenn keine sinnvolle Zuordnung möglich ist. */
export function assignGrid(players: readonly GridInput[], formation?: string): (GridSlot | undefined)[] | undefined {
  const lines = parseFormation(formation)
  if (!lines) return undefined

  const parsed = players.map((p, index) => ({ index, place: p.formationPlace ?? 99, ...parse(p.position) }))
  const keeper = parsed.find((p) => p.isKeeper) ?? parsed.find((p) => p.place === 1)
  if (!keeper) return undefined
  const outfield = parsed.filter((p) => p !== keeper)
  if (outfield.length !== lines.reduce((a, b) => a + b, 0)) return undefined

  // Nach Tiefe sortieren; bei gleicher Tiefe stehen zentrale Spieler weiter hinten als Außenspieler.
  outfield.sort((a, b) => a.depth - b.depth || Math.abs(a.lateral) - Math.abs(b.lateral) || a.place - b.place)

  const result: (GridSlot | undefined)[] = players.map(() => undefined)
  result[keeper.index] = { gridRow: 1, gridCol: 1 }

  let offset = 0
  lines.forEach((count, lineIndex) => {
    const line = outfield.slice(offset, offset + count)
    offset += count
    line
      .sort((a, b) => a.lateral - b.lateral || a.place - b.place)
      .forEach((p, col) => {
        result[p.index] = { gridRow: lineIndex + 2, gridCol: col + 1 }
      })
  })
  return result
}
