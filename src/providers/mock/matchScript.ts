/**
 * Erzeugt für ein Demo-Spiel den kompletten Ablauf (Aufstellungen, Ereignisse, Statistik-Basis).
 * Was davon sichtbar ist, bestimmt die Spieluhr (siehe clock.ts).
 */
import type { Lineup, LineupPlayer, MatchEvent, MatchEventType, Player, PlayerPosition } from '../../domain/types'
import type { TeamRecord } from './catalog'
import { createRng, type Rng } from './random'
import type { ScheduledFixture } from './schedule'

export interface MatchScript {
  lineups: { home: Lineup; away: Lineup }
  /** Alle Ereignisse über 90+ Minuten, chronologisch */
  events: MatchEvent[]
  statBase: { possessionHome: number; shots: [number, number]; corners: [number, number]; fouls: [number, number]; offsides: [number, number]; passAccuracy: [number, number]; xg: [number, number] }
}

const FORMATIONS = ['4-2-3-1', '4-3-3', '4-4-2', '3-5-2', '4-1-4-1'] as const

export const eventOrder = (e: Pick<MatchEvent, 'minute' | 'extraMinute'>) => e.minute + (e.extraMinute ?? 0) / 10

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = rng.int(0, i)
    ;[copy[i], copy[j]] = [copy[j] as T, copy[i] as T]
  }
  return copy
}

const toLineupPlayer = (p: Player, gridRow?: number, gridCol?: number): LineupPlayer => ({
  player: { id: p.id, name: p.name, shortName: p.shortName, position: p.position, photoUrl: p.photoUrl },
  shirtNumber: p.shirtNumber,
  gridRow,
  gridCol,
})

function buildLineup(record: TeamRecord, rng: Rng): Lineup {
  const formation = rng.pick(FORMATIONS)
  const lines = formation.split('-').map(Number)
  const byPos = (pos: PlayerPosition) => shuffle(record.squad.filter((p) => p.position === pos), rng)
  const pools: Record<PlayerPosition, Player[]> = { GK: byPos('GK'), DF: byPos('DF'), MF: byPos('MF'), FW: byPos('FW') }

  const starters: LineupPlayer[] = []
  const gk = pools.GK.shift()
  if (gk) starters.push(toLineupPlayer(gk, 1, 1))

  lines.forEach((count, lineIndex) => {
    const pos: PlayerPosition = lineIndex === 0 ? 'DF' : lineIndex === lines.length - 1 ? 'FW' : 'MF'
    for (let col = 1; col <= count; col++) {
      const player = pools[pos].shift() ?? pools.MF.shift()
      if (player) starters.push(toLineupPlayer(player, lineIndex + 2, col))
    }
  })

  const starterIds = new Set(starters.map((s) => s.player.id))
  const substitutes = record.squad.filter((p) => !starterIds.has(p.id)).map((p) => toLineupPlayer(p))
  return { teamId: record.team.id, formation, coach: record.team.coach, starters, substitutes }
}

function goalCount(rng: Rng): number {
  const r = rng.next()
  return r < 0.25 ? 0 : r < 0.6 ? 1 : r < 0.85 ? 2 : r < 0.95 ? 3 : 4
}

function randomMinute(rng: Rng): { minute: number; extraMinute?: number } {
  const r = rng.next()
  if (r < 0.05) return { minute: 45, extraMinute: rng.int(1, 3) }
  if (r < 0.12) return { minute: 90, extraMinute: rng.int(1, 5) }
  return { minute: rng.int(1, 89) }
}

export function buildMatchScript(fixture: ScheduledFixture): MatchScript {
  const rng = createRng(`match:${fixture.id}`)
  const lineups = { home: buildLineup(fixture.home, rng), away: buildLineup(fixture.away, rng) }
  const events: MatchEvent[] = []
  let seq = 0
  const push = (e: Omit<MatchEvent, 'id' | 'fixtureId'>) => events.push({ ...e, id: `${fixture.id}-e${seq++}`, fixtureId: fixture.id })
  const ref = (p: LineupPlayer) => ({ id: p.player.id, name: p.player.name })

  const sides = [
    { lineup: lineups.home, teamId: fixture.home.team.id },
    { lineup: lineups.away, teamId: fixture.away.team.id },
  ] as const

  // Wechsel zuerst, damit Torschützen/Karten nur Spieler betreffen, die auf dem Platz stehen.
  const subsBySide = sides.map(({ lineup, teamId }) => {
    const minutes = [rng.int(55, 70), rng.int(65, 80), rng.int(75, 88)].sort((a, b) => a - b)
    const outfield = shuffle(lineup.starters.filter((s) => s.player.position !== 'GK'), rng)
    const bench = shuffle(lineup.substitutes.filter((s) => s.player.position !== 'GK'), rng)
    return minutes.flatMap((minute, i) => {
      const off = outfield[i]
      const on = bench[i]
      if (!off || !on) return []
      push({ teamId, type: 'substitution', minute, player: ref(on), relatedPlayer: ref(off) })
      return [{ minute, off, on }]
    })
  })

  const onPitch = (side: 0 | 1, at: number): LineupPlayer[] => {
    const subs = subsBySide[side] ?? []
    const out = new Set(subs.filter((s) => s.minute <= at).map((s) => s.off.player.id))
    const inn = subs.filter((s) => s.minute <= at).map((s) => s.on)
    return [...(sides[side].lineup.starters.filter((p) => !out.has(p.player.id))), ...inn]
  }
  const outfieldAt = (side: 0 | 1, at: number, pos?: PlayerPosition) => {
    const players = onPitch(side, at).filter((p) => p.player.position !== 'GK')
    const filtered = pos ? players.filter((p) => p.player.position === pos) : players
    return filtered.length > 0 ? filtered : players
  }

  ;([0, 1] as const).forEach((side) => {
    const other = side === 0 ? 1 : 0
    const teamId = sides[side].teamId

    for (let g = goalCount(rng); g > 0; g--) {
      const time = randomMinute(rng)
      const at = eventOrder(time)
      const roll = rng.next()
      if (roll < 0.06) {
        push({ teamId, type: 'own_goal', ...time, player: ref(rng.pick(outfieldAt(other, at, 'DF'))) })
        continue
      }
      const type: MatchEventType = roll < 0.14 ? 'penalty_goal' : 'goal'
      const posRoll = rng.next()
      const scorer = rng.pick(outfieldAt(side, at, posRoll < 0.5 ? 'FW' : posRoll < 0.85 ? 'MF' : 'DF'))
      const mates = outfieldAt(side, at).filter((p) => p.player.id !== scorer.player.id)
      const assist = type === 'goal' && rng.chance(0.65) && mates.length > 0 ? ref(rng.pick(mates)) : undefined
      push({ teamId, type, ...time, player: ref(scorer), relatedPlayer: assist })
    }

    const booked = new Set<string>()
    for (let c = rng.int(0, 3); c > 0; c--) {
      const time = { minute: rng.int(8, 89) }
      const player = rng.pick(outfieldAt(side, time.minute))
      if (booked.has(player.player.id)) continue
      booked.add(player.player.id)
      push({ teamId, type: 'yellow', ...time, player: ref(player) })
    }
    if (rng.chance(0.05)) {
      const time = { minute: rng.int(30, 88) }
      push({ teamId, type: 'red', ...time, player: ref(rng.pick(outfieldAt(side, time.minute))) })
    }
    if (rng.chance(0.06)) {
      const time = { minute: rng.int(10, 88) }
      push({ teamId, type: 'penalty_missed', ...time, player: ref(rng.pick(outfieldAt(side, time.minute, 'FW'))) })
    }
  })

  if (rng.chance(0.12)) {
    push({ teamId: (rng.chance(0.5) ? sides[0] : sides[1]).teamId, type: 'var', minute: rng.int(15, 88), detail: 'Tor aberkannt – Abseits' })
  }

  events.sort((a, b) => eventOrder(a) - eventOrder(b))

  const possessionHome = rng.int(36, 64)
  return {
    lineups,
    events,
    statBase: {
      possessionHome,
      shots: [rng.int(5, 19), rng.int(4, 17)],
      corners: [rng.int(1, 10), rng.int(1, 9)],
      fouls: [rng.int(7, 17), rng.int(7, 17)],
      offsides: [rng.int(0, 5), rng.int(0, 5)],
      passAccuracy: [rng.int(74, 91), rng.int(72, 90)],
      xg: [Math.round(rng.next() * 280) / 100, Math.round(rng.next() * 250) / 100],
    },
  }
}
