/**
 * Zusätzliche Tabellenansichten, berechnet aus den Saisonergebnissen:
 * Heim/Auswärts, Hin-/Rückrunde, Fieberkurve (Platzierungsverlauf) und Kreuztabelle.
 * Reine Funktionen – unabhängig von Anbieter und UI.
 */
import { isFinished } from '../../domain/status'
import type { Fixture, FormResult, Id, Score, StandingRow, Team } from '../../domain/types'

export type TableSplit = 'all' | 'home' | 'away' | 'first' | 'second'

const finishedResults = (fixtures: Fixture[]): (Fixture & { score: Score })[] =>
  fixtures
    .filter((f): f is Fixture & { score: Score } => isFinished(f.status) && f.score !== undefined)
    .sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt))

const pairKey = (a: Id, b: Id) => (a < b ? `${a}|${b}` : `${b}|${a}`)

/** Hinrunde = erstes Aufeinandertreffen zweier Teams, Rückrunde = zweites */
function legOf(results: (Fixture & { score: Score })[]): Map<Id, 'first' | 'second'> {
  const seen = new Map<string, number>()
  const legs = new Map<Id, 'first' | 'second'>()
  for (const f of results) {
    const key = pairKey(f.homeTeam.id, f.awayTeam.id)
    const n = seen.get(key) ?? 0
    seen.set(key, n + 1)
    legs.set(f.id, n % 2 === 0 ? 'first' : 'second')
  }
  return legs
}

interface Acc {
  team: Team
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  form: FormResult[]
}

function add(acc: Acc, gf: number, ga: number) {
  acc.played++
  acc.goalsFor += gf
  acc.goalsAgainst += ga
  const r: FormResult = gf > ga ? 'W' : gf < ga ? 'L' : 'D'
  if (r === 'W') acc.won++
  else if (r === 'L') acc.lost++
  else acc.drawn++
  acc.form.push(r)
}

const points = (a: Acc) => a.won * 3 + a.drawn

/** Sortierung: Punkte, Tordifferenz, geschossene Tore, Name */
function rank(accs: Acc[]): StandingRow[] {
  const sorted = [...accs].sort(
    (a, b) =>
      points(b) - points(a) ||
      b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) ||
      b.goalsFor - a.goalsFor ||
      a.team.name.localeCompare(b.team.name, 'de'),
  )
  return sorted.map((a, i) => ({
    rank: i + 1,
    team: a.team,
    played: a.played,
    won: a.won,
    drawn: a.drawn,
    lost: a.lost,
    goalsFor: a.goalsFor,
    goalsAgainst: a.goalsAgainst,
    points: points(a),
    form: a.form.slice(-5).reverse(),
  }))
}

function emptyAccs(teams: Team[], results: Fixture[]): Map<Id, Acc> {
  const accs = new Map<Id, Acc>()
  const ensure = (team: Team) => {
    if (!accs.has(team.id)) accs.set(team.id, { team, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, form: [] })
  }
  teams.forEach(ensure)
  for (const f of results) {
    ensure(f.homeTeam)
    ensure(f.awayTeam)
  }
  return accs
}

/**
 * Tabelle aus Ergebnissen. `teams` legt fest, wer auch ohne Spiel erscheint
 * (z. B. alle Teams der Gesamttabelle in der Rückrunden-Tabelle).
 */
export function computeTable(fixtures: Fixture[], split: TableSplit = 'all', teams: Team[] = []): StandingRow[] {
  const results = finishedResults(fixtures)
  const accs = emptyAccs(teams, results)
  const legs = split === 'first' || split === 'second' ? legOf(results) : undefined
  for (const f of results) {
    if (legs && legs.get(f.id) !== split) continue
    if (split !== 'away') add(accs.get(f.homeTeam.id)!, f.score.home, f.score.away)
    if (split !== 'home') add(accs.get(f.awayTeam.id)!, f.score.away, f.score.home)
  }
  return rank([...accs.values()])
}

/**
 * Fieberkurve: Platzierung jedes Teams nach dem 1., 2., … eigenen Spiel.
 * Stand k berücksichtigt je Team nur dessen erste k Spiele – so bleiben Nachholspiele vergleichbar.
 * Ergebnis: Team-ID → Platzierungen (Index 0 = nach Spiel 1).
 */
export function positionHistory(fixtures: Fixture[], teams: Team[] = []): Map<Id, number[]> {
  const results = finishedResults(fixtures)
  const count = new Map<Id, number>()
  // Für jedes Spiel: das wievielte Spiel war es für Heim- bzw. Auswärtsteam?
  const nth = results.map((f) => {
    const h = (count.get(f.homeTeam.id) ?? 0) + 1
    const a = (count.get(f.awayTeam.id) ?? 0) + 1
    count.set(f.homeTeam.id, h)
    count.set(f.awayTeam.id, a)
    return { f, h, a }
  })
  const maxGames = Math.max(0, ...count.values())
  const history = new Map<Id, number[]>()
  for (let k = 1; k <= maxGames; k++) {
    const accs = emptyAccs(teams, results)
    for (const { f, h, a } of nth) {
      if (h <= k) add(accs.get(f.homeTeam.id)!, f.score.home, f.score.away)
      if (a <= k) add(accs.get(f.awayTeam.id)!, f.score.away, f.score.home)
    }
    for (const row of rank([...accs.values()])) {
      // Nur eintragen, solange das Team tatsächlich k Spiele absolviert hat
      if ((count.get(row.team.id) ?? 0) < k) continue
      const list = history.get(row.team.id) ?? []
      list.push(row.rank)
      history.set(row.team.id, list)
    }
  }
  return history
}

/** Kreuztabelle: Heimteam-ID → Auswärtsteam-ID → Ergebnisse (bei mehreren Duellen alle) */
export function crossResults(fixtures: Fixture[]): Map<Id, Map<Id, Fixture[]>> {
  const grid = new Map<Id, Map<Id, Fixture[]>>()
  for (const f of finishedResults(fixtures)) {
    const row = grid.get(f.homeTeam.id) ?? new Map<Id, Fixture[]>()
    row.set(f.awayTeam.id, [...(row.get(f.awayTeam.id) ?? []), f])
    grid.set(f.homeTeam.id, row)
  }
  return grid
}
