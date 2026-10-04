/**
 * Aus welchem Land kommt ein Team? Für die Senderanzeige: Spiele werden vor allem in den Heimatländern
 * der beteiligten Teams übertragen. Vereine über ihre Liga, Nationalteams über das Länderkürzel.
 */
import type { Fixture, Team } from '../domain/types'

/** Ligen der App → Land */
const COMPETITION_COUNTRY: Record<string, string> = {
  'c-bundesliga': 'DE',
  'c-2-bundesliga': 'DE',
  'c-dfb-pokal': 'DE',
  'c-super-lig': 'TR',
  'c-turkish-cup': 'TR',
  'c-premier-league': 'GB',
  'c-la-liga': 'ES',
  'c-serie-a': 'IT',
  'c-ligue-1': 'FR',
}

/** Länderpräfix der ESPN-Ligakürzel ("ned.1", "por.1") → Land */
const SLUG_PREFIX_COUNTRY: Record<string, string> = {
  ger: 'DE', eng: 'GB', sco: 'GB', wal: 'GB', esp: 'ES', ita: 'IT', fra: 'FR', ned: 'NL', tur: 'TR',
  aut: 'AT', sui: 'CH', por: 'PT', bel: 'BE', usa: 'US', den: 'DK', swe: 'SE', nor: 'NO', gre: 'GR',
}

/** FIFA-Kürzel der Nationalteams → Land */
const FIFA_COUNTRY: Record<string, string> = {
  GER: 'DE', AUT: 'AT', SUI: 'CH', TUR: 'TR', ENG: 'GB', SCO: 'GB', WAL: 'GB', NIR: 'GB', USA: 'US',
  ESP: 'ES', ITA: 'IT', FRA: 'FR', NED: 'NL', POR: 'PT', BEL: 'BE', DEN: 'DK', SWE: 'SE', NOR: 'NO', GRE: 'GR',
}

/** Land einer Liga/eines Wettbewerbs – nur bei nationalen Wettbewerben */
export function competitionCountry(competitionId: string | undefined): string | undefined {
  if (!competitionId) return undefined
  if (COMPETITION_COUNTRY[competitionId]) return COMPETITION_COUNTRY[competitionId]
  const prefix = /^l-([a-z]+)\./.exec(competitionId)?.[1]
  return prefix ? SLUG_PREFIX_COUNTRY[prefix] : undefined
}

/**
 * Land eines Teams. `leagueId` = Hauptliga des Teams (aus der Teamseite), falls bekannt.
 * Bei Spielen in einer nationalen Liga reicht die Liga des Spiels.
 */
export function teamCountry(team: Team, fixture: Pick<Fixture, 'competitionId'>, leagueId?: string): string | undefined {
  if (team.isNational) return team.code ? FIFA_COUNTRY[team.code.toUpperCase()] : undefined
  if (team.id.startsWith('fmt-')) return 'TR' // FotMob-Teams stammen aus dem türkischen Pokal
  return competitionCountry(leagueId) ?? competitionCountry(fixture.competitionId)
}

/** Braucht das Team die Hauptliga aus der Teamseite? (Europapokal, Testspiel …) */
export const needsTeamLeague = (team: Team, fixture: Pick<Fixture, 'competitionId'>) =>
  !team.isNational && !team.id.startsWith('fmt-') && competitionCountry(fixture.competitionId) === undefined
