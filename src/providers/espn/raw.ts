/**
 * Rohformate der (inoffiziellen) ESPN-API – nur die Felder, die der Adapter liest.
 * Alles ist optional: Die API ist undokumentiert und kann Felder weglassen.
 */

export interface RawStatus {
  displayClock?: string
  period?: number
  type?: { name?: string; state?: 'pre' | 'in' | 'post'; completed?: boolean }
}

export interface RawLogo {
  href?: string
  rel?: string[]
}

export interface RawTeam {
  id?: string
  displayName?: string
  shortDisplayName?: string
  name?: string
  abbreviation?: string
  location?: string
  logo?: string
  logos?: RawLogo[]
  isNational?: boolean
}

export interface RawScore {
  value?: number
  displayValue?: string
}

export interface RawCompetitor {
  id?: string
  homeAway?: 'home' | 'away'
  score?: string | RawScore
  shootoutScore?: number
  linescores?: { displayValue?: string; value?: number }[]
  team?: RawTeam
}

export interface RawLeagueRef {
  slug?: string
  name?: string
}

export interface RawGeoBroadcast {
  type?: { shortName?: string }
  market?: { type?: string }
  media?: { shortName?: string }
  region?: string
}

export interface RawCompetition {
  date?: string
  status?: RawStatus
  venue?: { fullName?: string }
  competitors?: RawCompetitor[]
  geoBroadcasts?: RawGeoBroadcast[]
}

export interface RawEvent {
  id?: string
  date?: string
  status?: RawStatus
  season?: { slug?: string }
  league?: RawLeagueRef
  competitions?: RawCompetition[]
  venue?: { fullName?: string }
}

export interface RawScoreboard {
  leagues?: { slug?: string; season?: { displayName?: string } }[]
  events?: RawEvent[]
}

export interface RawAthleteRef {
  id?: string
  displayName?: string
  shortName?: string
}

export interface RawKeyEvent {
  id?: string
  type?: { type?: string; text?: string }
  clock?: { displayValue?: string }
  team?: { id?: string }
  participants?: { athlete?: RawAthleteRef }[]
}

export interface RawRosterEntry {
  starter?: boolean
  jersey?: string
  athlete?: RawAthleteRef
  position?: { abbreviation?: string; name?: string }
  formationPlace?: string | number
  subbedIn?: boolean
  subbedOut?: boolean
  /** Einzelwerte im Spiel, z. B. { name: 'totalGoals', value: 1 } */
  stats?: { name?: string; value?: number; displayValue?: string }[]
}

export interface RawRoster {
  homeAway?: 'home' | 'away'
  team?: RawTeam
  formation?: string
  roster?: RawRosterEntry[]
}

export interface RawBoxscoreTeam {
  team?: { id?: string }
  statistics?: { name?: string; displayValue?: string }[]
}

export interface RawSummary {
  header?: {
    id?: string
    league?: RawLeagueRef
    season?: { slug?: string }
    competitions?: (RawCompetition & { id?: string; status?: RawStatus })[]
  }
  gameInfo?: {
    venue?: { fullName?: string }
    officials?: { displayName?: string; position?: { name?: string } }[]
  }
  rosters?: RawRoster[]
  boxscore?: { teams?: RawBoxscoreTeam[] }
  keyEvents?: RawKeyEvent[]
}

export interface RawStandingEntry {
  team?: RawTeam
  note?: { description?: string; color?: string; rank?: number }
  stats?: { name?: string; value?: number; displayValue?: string }[]
}

export interface RawStandingGroup {
  name?: string
  abbreviation?: string
  standings?: { entries?: RawStandingEntry[] }
  children?: RawStandingGroup[]
}

export interface RawStandings extends RawStandingGroup {
  seasons?: unknown
}

export interface RawLeaders {
  stats?: {
    name?: string
    leaders?: { value?: number; athlete?: RawAthleteRef & { team?: RawTeam } }[]
  }[]
}

export interface RawTeamsList {
  sports?: { leagues?: { teams?: { team?: RawTeam }[] }[] }[]
}

export interface RawTeamResponse {
  team?: RawTeam & {
    defaultLeague?: RawLeagueRef
    standingSummary?: string
    franchise?: { venue?: { fullName?: string } }
  }
}

export interface RawRosterAthlete {
  id?: string
  displayName?: string
  shortName?: string
  firstName?: string
  lastName?: string
  dateOfBirth?: string
  citizenship?: string
  jersey?: string
  position?: { abbreviation?: string; name?: string }
  injuries?: RawInjury[]
}

export interface RawInjury {
  status?: string
  date?: string
  type?: { name?: string; description?: string; abbreviation?: string }
  details?: { type?: string; location?: string; detail?: string; returnDate?: string }
  shortComment?: string
}

export interface RawTeamRoster {
  athletes?: RawRosterAthlete[]
  team?: RawTeam
}

export interface RawSchedule {
  events?: RawEvent[]
}

export interface RawAthleteResponse {
  athlete?: {
    id?: string
    displayName?: string
    firstName?: string
    lastName?: string
    displayDOB?: string
    age?: number
    citizenship?: string
    jersey?: string
    position?: { abbreviation?: string; name?: string }
    team?: RawTeam
  }
}

export interface RawAthleteStats {
  categories?: {
    names?: string[]
    statistics?: { leagueSlug?: string; season?: { year?: number }; teamId?: string; stats?: string[] }[]
  }[]
}

export interface RawSearch {
  results?: {
    type?: string
    contents?: {
      uid?: string
      displayName?: string
      subtitle?: string
      sport?: string
      image?: { default?: string }
    }[]
  }[]
}
