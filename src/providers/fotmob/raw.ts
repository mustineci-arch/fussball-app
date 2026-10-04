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
  home?: { id?: number; name?: string }
  away?: { id?: number; name?: string }
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
  unavailability?: { type?: string; expectedReturn?: string; expectedReturnDate?: string }
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
