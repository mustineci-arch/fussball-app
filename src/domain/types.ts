/**
 * Internes Datenmodell der App.
 * Unabhängig von jedem externen Anbieter – Provider-Adapter mappen auf diese Typen.
 * Optionale Felder bedeuten: "von der Datenquelle nicht geliefert" – niemals raten.
 */

export type Id = string

export type CompetitionType = 'league' | 'cup' | 'international'

export interface Competition {
  id: Id
  slug: string
  name: string
  shortName: string
  type: CompetitionType
  country?: string
  logoUrl?: string
  /** Sortierung in Listen – kleiner = weiter oben */
  priority: number
}

export interface Season {
  id: Id
  competitionId: Id
  label: string
  startDate?: string
  endDate?: string
  currentRound?: string
}

export interface Team {
  id: Id
  slug: string
  name: string
  shortName: string
  /** Dreibuchstabiges Kürzel, z. B. "GAL" */
  code?: string
  country?: string
  logoUrl?: string
  venue?: string
  coach?: string
  isNational?: boolean
  /** Name der Hauptliga – nur zur Anzeige (z. B. in Suchergebnissen) */
  league?: string
}

export type PlayerPosition = 'GK' | 'DF' | 'MF' | 'FW'

export interface Player {
  id: Id
  slug: string
  name: string
  shortName?: string
  firstName?: string
  lastName?: string
  birthDate?: string
  nationality?: string
  position?: PlayerPosition
  shirtNumber?: number
  teamId?: Id
  /** Vereinsname – nur zur Anzeige, wenn das Team-Objekt nicht geladen ist */
  teamName?: string
  /** Nur gesetzt, wenn das Bild lizenziert/freigegeben ist */
  photoUrl?: string
}

export type FixtureStatus =
  | 'scheduled'
  | 'live_1h'
  | 'halftime'
  | 'live_2h'
  | 'extra_time'
  | 'break'
  | 'penalties'
  | 'finished'
  | 'finished_aet'
  | 'finished_pen'
  | 'postponed'
  | 'cancelled'
  | 'abandoned'
  | 'suspended'
  | 'unknown'

export interface Score {
  home: number
  away: number
}

export interface Fixture {
  id: Id
  competitionId: Id
  seasonId?: Id
  round?: string
  /** ISO-Zeitstempel in UTC */
  kickoffAt: string
  status: FixtureStatus
  /** Laufende Minute, nur bei Live-Spielen */
  minute?: number
  extraMinute?: number
  homeTeam: Team
  awayTeam: Team
  score?: Score
  halftimeScore?: Score
  penaltyScore?: Score
  venue?: string
  referee?: string
}

export type MatchEventType =
  | 'goal'
  | 'own_goal'
  | 'penalty_goal'
  | 'penalty_missed'
  | 'yellow'
  | 'second_yellow'
  | 'red'
  | 'substitution'
  | 'var'

export interface MatchEvent {
  id: Id
  fixtureId: Id
  teamId: Id
  type: MatchEventType
  minute: number
  extraMinute?: number
  /** Torschütze / Spieler mit Karte / eingewechselter Spieler */
  player?: Pick<Player, 'id' | 'name'>
  /** Vorlagengeber / ausgewechselter Spieler */
  relatedPlayer?: Pick<Player, 'id' | 'name'>
  /** Art des Tors, falls bekannt */
  qualifier?: 'header' | 'free_kick'
  /** Freitext der Quelle (z. B. VAR-Entscheidung) – wird unübersetzt angezeigt */
  detail?: string
}

export interface LineupPlayer {
  player: Pick<Player, 'id' | 'name' | 'shortName' | 'photoUrl' | 'position'>
  shirtNumber?: number
  /** Reihe auf dem Feld: 1 = Torwart, aufsteigend Richtung Angriff */
  gridRow?: number
  /** Position innerhalb der Reihe, 1-basiert von links */
  gridCol?: number
}

export interface Lineup {
  teamId: Id
  formation?: string
  coach?: string
  starters: LineupPlayer[]
  substitutes: LineupPlayer[]
}

export type MatchStatKey =
  | 'possession'
  | 'shots_total'
  | 'shots_on_target'
  | 'shots_off_target'
  | 'shots_blocked'
  | 'corners'
  | 'fouls'
  | 'offsides'
  | 'yellow_cards'
  | 'red_cards'
  | 'passes_total'
  | 'pass_accuracy'
  | 'xg'
  | 'big_chances'
  | 'saves'

export interface MatchStatistic {
  key: MatchStatKey
  home: number
  away: number
}

export interface FixtureDetails {
  fixture: Fixture
  events?: MatchEvent[]
  lineups?: { home?: Lineup; away?: Lineup }
  statistics?: MatchStatistic[]
}

export type StandingZoneKind =
  | 'champions_league'
  | 'europa_league'
  | 'conference_league'
  | 'promotion'
  | 'relegation_playoff'
  | 'relegation'
  /** Weiterkommen in einem Turnier (z. B. Achtelfinale) */
  | 'qualification'
  /** Play-off-Plätze in einem Turnier */
  | 'playoff'
  | 'eliminated'

/** Sprachneutrale Bezeichnung einer Tabellenzone – die UI übersetzt sie */
export type ZoneLabel =
  | 'champions_league'
  | 'cl_qualifying'
  | 'europa_league'
  | 'el_qualifying'
  | 'conference_league'
  | 'ecl_qualifying'
  | 'relegation_playoff'
  | 'relegation'
  | 'promotion'
  | 'round_of_16'
  | 'playoff_seeded'
  | 'playoff_unseeded'
  | 'playoff'
  | 'qualification'
  | 'eliminated'

export interface StandingZone {
  kind: StandingZoneKind
  fromRank: number
  toRank: number
  label: ZoneLabel
}

export interface StandingRow {
  rank: number
  team: Team
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  points: number
  form?: FormResult[]
}

export interface StandingTable {
  competitionId: Id
  groupName?: string
  rows: StandingRow[]
  zones: StandingZone[]
}

export type FormResult = 'W' | 'D' | 'L'

export type TopPlayerCategory = 'goals' | 'assists' | 'yellow_cards' | 'red_cards' | 'clean_sheets'

export interface TopPlayerEntry {
  rank: number
  player: Pick<Player, 'id' | 'name' | 'photoUrl'>
  team: Pick<Team, 'id' | 'name' | 'shortName' | 'logoUrl'>
  value: number
}

export interface PlayerSeasonStats {
  competitionId?: Id
  seasonLabel?: string
  appearances?: number
  starts?: number
  minutes?: number
  goals?: number
  assists?: number
  yellowCards?: number
  redCards?: number
}

export interface PlayerProfile {
  player: Player
  team?: Team
  seasonStats: PlayerSeasonStats[]
}

export interface SearchResults {
  teams: Team[]
  players: Player[]
  competitions: Competition[]
}

export type FavoriteType = 'team' | 'competition' | 'match'

export interface Favorite {
  type: FavoriteType
  id: Id
  addedAt: string
}
