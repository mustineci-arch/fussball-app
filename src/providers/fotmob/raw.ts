/** Rohformate der (inoffiziellen) FotMob-API – nur die Felder, die die App liest. */

export interface RawFmSuggestion {
  type?: string
  id?: string
  name?: string
  leagueName?: string
}

export type RawFmSuggest = { suggestions?: RawFmSuggestion[] }[]

export interface RawFmMember {
  id?: number
  name?: string
  shirtNumber?: number | string
  dateOfBirth?: string
  injured?: boolean
  injury?: { id?: string; expectedReturn?: string } | null
  /** Durchschnittsnote der Saison */
  rating?: number | null
}

export interface RawFmFixture {
  id?: number
  home?: { id?: number; name?: string; score?: number }
  away?: { id?: number; name?: string; score?: number }
  status?: { utcTime?: string; finished?: boolean; started?: boolean }
}

export interface RawFmLineupPlayer {
  id?: number
  name?: string
  shirtNumber?: string | number
  performance?: {
    rating?: number
    playerOfTheMatch?: boolean
    substitutionEvents?: { type?: string; time?: number }[]
  }
  unavailability?: { type?: string; injuryId?: number; expectedReturn?: string; expectedReturnDate?: string }
}

export interface RawFmLineupTeam {
  id?: number
  name?: string
  starters?: RawFmLineupPlayer[]
  subs?: RawFmLineupPlayer[]
  unavailable?: RawFmLineupPlayer[]
}

export interface RawFmTeam {
  details?: { id?: number; name?: string }
  squad?: { squad?: { title?: string; members?: RawFmMember[] }[] }
  fixtures?: { allFixtures?: { fixtures?: RawFmFixture[] } }
}

export interface RawFmMatchDetails {
  general?: { homeTeam?: { id?: number }; awayTeam?: { id?: number }; finished?: boolean; started?: boolean }
  content?: { lineup?: { homeTeam?: RawFmLineupTeam; awayTeam?: RawFmLineupTeam } }
}

// ------------------------------------------------------------ Wettbewerb (eigene Datenquelle für den türkischen Pokal)

export interface RawFmStatus {
  utcTime?: string
  started?: boolean
  finished?: boolean
  cancelled?: boolean
  awarded?: boolean
  ongoing?: boolean
  scoreStr?: string
  reason?: { short?: string; long?: string }
  liveTime?: { short?: string; long?: string }
  halfs?: { secondHalfStarted?: string; firstExtraHalfStarted?: string; secondExtraHalfStarted?: string }
}

export interface RawFmLeagueMatch {
  id?: string | number
  round?: string | number
  roundName?: string | number
  home?: { id?: string | number; name?: string; shortName?: string }
  away?: { id?: string | number; name?: string; shortName?: string }
  status?: RawFmStatus
}

export interface RawFmTableRow {
  id?: number
  name?: string
  shortName?: string
  played?: number
  wins?: number
  draws?: number
  losses?: number
  scoresStr?: string
  pts?: number
  idx?: number
}

export interface RawFmTableGroup {
  leagueName?: string
  legend?: { tKey?: string; indices?: number[] }[]
  table?: { all?: RawFmTableRow[] }
}

export interface RawFmLeague {
  details?: { id?: number; name?: string; selectedSeason?: string }
  table?: { data?: { tables?: RawFmTableGroup[]; table?: { all?: RawFmTableRow[] }; legend?: RawFmTableGroup['legend'] } }[]
  fixtures?: { allMatches?: RawFmLeagueMatch[] }
}

export interface RawFmEvent {
  type?: string
  time?: number
  overloadTime?: number | null
  isHome?: boolean
  player?: { id?: number | null; name?: string }
  ownGoal?: boolean | null
  goalDescription?: string | null
  assistPlayerId?: number
  assistInput?: string
  card?: string
  swap?: { name?: string; id?: string }[]
  isPenaltyShootoutEvent?: boolean
}

export interface RawFmStat {
  key?: string
  stats?: (number | string | null)[]
}

export interface RawFmMatchFull {
  general?: {
    matchId?: string
    leagueId?: number
    parentLeagueId?: number
    leagueRoundName?: string | null
    homeTeam?: { id?: number; name?: string }
    awayTeam?: { id?: number; name?: string }
    matchTimeUTCDate?: string
    started?: boolean
    finished?: boolean
  }
  header?: { teams?: { id?: number; name?: string; score?: number }[]; status?: RawFmStatus }
  content?: {
    matchFacts?: {
      events?: { events?: RawFmEvent[] }
      infoBox?: { Stadium?: { name?: string }; Referee?: { text?: string } }
    }
    stats?: { Periods?: { All?: { stats?: { stats?: RawFmStat[] }[] } } } | null
    lineup?: {
      homeTeam?: RawFmLineupTeamFull
      awayTeam?: RawFmLineupTeamFull
    }
  }
}

export interface RawFmLineupTeamFull extends RawFmLineupTeam {
  formation?: string
  coach?: { name?: string }
  starters?: (RawFmLineupPlayer & { usualPlayingPositionId?: number; positionId?: number; verticalLayout?: { x?: number; y?: number } })[]
  subs?: (RawFmLineupPlayer & { usualPlayingPositionId?: number })[]
}

export interface RawFmPlayerData {
  id?: number
  name?: string
  birthDate?: { utcTime?: string }
  primaryTeam?: { teamId?: number; teamName?: string }
  positionDescription?: { primaryPosition?: { key?: string } }
  playerInformation?: { title?: string; translationKey?: string; value?: { numberValue?: number; fallback?: unknown }; countryCode?: string }[]
  injuryInformation?: { name?: string; key?: string; expectedReturn?: { expectedReturnFallback?: string }; lastUpdated?: { utcTime?: string } } | null
  mainLeague?: { leagueId?: number; season?: string; stats?: { localizedTitleId?: string; value?: number }[] }
}

export interface RawFmTeamFull extends RawFmTeam {
  details?: { id?: number; name?: string; shortName?: string; country?: string }
  overview?: { venue?: { widget?: { name?: string } } }
  squad?: { squad?: { title?: string; members?: (RawFmMember & { role?: { key?: string }; cname?: string })[] }[] }
  fixtures?: { allFixtures?: { fixtures?: (RawFmFixture & { tournament?: { leagueId?: number; name?: string } })[] } }
}
