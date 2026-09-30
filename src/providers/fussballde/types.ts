/**
 * Format der Datei public/data/fussballde.json.
 * Sie wird von Hand gepflegt (später evtl. automatisch)
 * und zur Laufzeit von der App geladen – kein neuer Build nötig.
 */
export interface FdeTeam {
  id: string
  name: string
  shortName?: string
  logoUrl?: string
  /** Teamseite auf fussball.de */
  sourceUrl?: string
}

export interface FdeTableRow {
  teamId: string
  rank: number
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  points: number
}

export interface FdeMatch {
  id: string
  /** ISO-Zeitstempel */
  kickoffAt: string
  homeTeamId: string
  awayTeamId: string
  /** Fehlt, solange das Spiel nicht gespielt ist */
  score?: { home: number; away: number }
  round?: string
  venue?: string
  /** z. B. abgesagt/verlegt */
  cancelled?: boolean
}

export interface FdeCompetition {
  id: string
  name: string
  shortName: string
  /** Region/Verband, z. B. "Hamburg" */
  region?: string
  season: string
  /** Seite auf fussball.de (Quelle) */
  sourceUrl?: string
  teams: FdeTeam[]
  table: FdeTableRow[]
  matches: FdeMatch[]
}

export interface FdeData {
  /** Zeitpunkt der letzten Synchronisierung (ISO) */
  updatedAt: string
  competitions: FdeCompetition[]
}
