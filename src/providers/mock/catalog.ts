/**
 * Stammdaten für den Demo-Modus.
 * Wettbewerbe sind echt benannt, Vereine und Spieler sind frei erfunden –
 * so entstehen keine falschen "Ergebnisse" realer Mannschaften.
 */
import type { Competition, Player, PlayerPosition, StandingZone, Team } from '../../domain/types'
import { slugify } from '../../domain/text'
import { createRng } from './random'

interface NamePool {
  first: readonly string[]
  last: readonly string[]
}

interface LeagueSeed {
  competition: Competition
  nationality: string
  teams: readonly string[]
  names: NamePool
  zones: StandingZone[]
  /** Anstoßzeiten (lokal) der zwei täglichen Demo-Spiele */
  kickoffTimes: readonly [string, string]
  hasXg: boolean
}

const comp = (
  slug: string,
  name: string,
  shortName: string,
  type: Competition['type'],
  priority: number,
  country?: string,
): Competition => ({ id: `c-${slug}`, slug, name, shortName, type, priority, country })

const ZONES_8: StandingZone[] = [
  { kind: 'champions_league', fromRank: 1, toRank: 2, label: 'Champions League' },
  { kind: 'europa_league', fromRank: 3, toRank: 3, label: 'Europa League' },
  { kind: 'conference_league', fromRank: 4, toRank: 4, label: 'Conference League' },
  { kind: 'relegation', fromRank: 8, toRank: 8, label: 'Abstieg' },
]

export const LEAGUES: readonly LeagueSeed[] = [
  {
    competition: comp('super-lig', 'Süper Lig', 'Süper Lig', 'league', 1, 'Türkei'),
    nationality: 'Türkei',
    teams: ['Boğaziçi SK', 'Anadolu Kartalları', 'Ege Spor', 'Karadeniz FK', 'Kapadokya SK', 'Marmara Yıldızları', 'Toros SK', 'Fırat Gençlik'],
    names: {
      first: ['Emre', 'Burak', 'Kerem', 'Mert', 'Arda', 'Oğuz', 'Cenk', 'Yusuf', 'Barış', 'Serkan', 'Onur', 'Kaan', 'Tolga', 'Umut', 'Deniz', 'Efe'],
      last: ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Aydın', 'Öztürk', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Koç', 'Kurt', 'Özdemir', 'Polat', 'Erdem'],
    },
    zones: ZONES_8,
    kickoffTimes: ['17:00', '20:00'],
    hasXg: false,
  },
  {
    competition: comp('bundesliga', 'Bundesliga', 'Bundesliga', 'league', 2, 'Deutschland'),
    nationality: 'Deutschland',
    teams: ['FC Rheinstadt', 'SV Nordhafen', 'Borussia Waldtal', 'TSV Bergheim', 'Eintracht Seeburg', 'VfB Alttal', 'Union Elbufer', 'SC Tannenfeld'],
    names: {
      first: ['Lukas', 'Jonas', 'Leon', 'Finn', 'Felix', 'Paul', 'Niklas', 'Tim', 'Jan', 'Moritz', 'Julian', 'David', 'Max', 'Tobias', 'Simon', 'Elias'],
      last: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Wagner', 'Becker', 'Hoffmann', 'Koch', 'Richter', 'Wolf', 'Neumann', 'Braun', 'Krüger', 'Hartmann', 'Lange'],
    },
    zones: ZONES_8,
    kickoffTimes: ['15:30', '18:30'],
    hasXg: false,
  },
  {
    competition: comp('premier-league', 'Premier League', 'Premier League', 'league', 3, 'England'),
    nationality: 'England',
    teams: ['Riverside United', 'Kingsbridge City', 'Harbour Town', 'Ashford Rovers', 'Northgate Athletic', 'Westmoor FC', 'Eastfield Wanderers', 'Stonebridge Albion'],
    names: {
      first: ['Jack', 'Harry', 'Oliver', 'George', 'Charlie', 'Thomas', 'James', 'William', 'Alfie', 'Jacob', 'Oscar', 'Leo', 'Henry', 'Mason', 'Ethan', 'Lewis'],
      last: ['Smith', 'Jones', 'Taylor', 'Brown', 'Davies', 'Evans', 'Wilson', 'Walker', 'Wright', 'Hughes', 'Green', 'Hall', 'Wood', 'Clarke', 'Turner', 'Hill'],
    },
    zones: ZONES_8,
    kickoffTimes: ['16:00', '18:30'],
    hasXg: true,
  },
  {
    competition: comp('la-liga', 'La Liga', 'La Liga', 'league', 4, 'Spanien'),
    nationality: 'Spanien',
    teams: ['Real Costa', 'Atlético Sierra', 'CD Puerto Alto', 'Valle FC', 'Racing Mirador', 'UD Olivar', 'Deportivo Faro', 'CF Almendra'],
    names: {
      first: ['Pablo', 'Álvaro', 'Sergio', 'Diego', 'Javier', 'Adrián', 'Iker', 'Marcos', 'Rubén', 'Raúl', 'Hugo', 'Mario', 'Íñigo', 'Dani', 'Carlos', 'Andrés'],
      last: ['García', 'Martínez', 'López', 'Sánchez', 'Pérez', 'Gómez', 'Ruiz', 'Díaz', 'Moreno', 'Muñoz', 'Jiménez', 'Romero', 'Navarro', 'Torres', 'Domínguez', 'Vázquez'],
    },
    zones: ZONES_8,
    kickoffTimes: ['18:30', '21:00'],
    hasXg: false,
  },
  {
    competition: comp('serie-a', 'Serie A', 'Serie A', 'league', 5, 'Italien'),
    nationality: 'Italien',
    teams: ['AC Collina', 'Inter Laguna', 'US Torrevecchia', 'Sporting Valdarno', 'FC Portomare', 'AS Montebello', 'Virtus Pineta', 'Calcio Riva'],
    names: {
      first: ['Luca', 'Marco', 'Matteo', 'Lorenzo', 'Andrea', 'Davide', 'Federico', 'Simone', 'Alessandro', 'Riccardo', 'Gabriele', 'Nicolò', 'Tommaso', 'Pietro', 'Filippo', 'Stefano'],
      last: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Costa', 'Giordano'],
    },
    zones: ZONES_8,
    kickoffTimes: ['18:00', '20:45'],
    hasXg: false,
  },
  {
    competition: comp('ligue-1', 'Ligue 1', 'Ligue 1', 'league', 6, 'Frankreich'),
    nationality: 'Frankreich',
    teams: ['Olympique Côte', 'AS Montclair', 'FC Val-Doré', 'Racing Pont-Neuf', 'Stade Lavande', 'SC Rivebelle', 'US Fontaine', 'RC Beaulieu'],
    names: {
      first: ['Lucas', 'Hugo', 'Théo', 'Louis', 'Nathan', 'Enzo', 'Mathis', 'Antoine', 'Maxime', 'Julien', 'Baptiste', 'Clément', 'Adrien', 'Romain', 'Florian', 'Kylian'],
      last: ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garnier', 'Fournier'],
    },
    zones: ZONES_8,
    kickoffTimes: ['17:00', '21:00'],
    hasXg: false,
  },
]

/** Europapokale nutzen Demo-Vereine aus den Ligen. Nationalmannschafts-Wettbewerbe haben im Demo-Modus keine Spiele. */
export const CUPS = {
  championsLeague: comp('champions-league', 'UEFA Champions League', 'Champions League', 'cup', 7, 'Europa'),
  europaLeague: comp('europa-league', 'UEFA Europa League', 'Europa League', 'cup', 8, 'Europa'),
  conferenceLeague: comp('conference-league', 'UEFA Conference League', 'Conference League', 'cup', 9, 'Europa'),
} as const

export const INTERNATIONAL: readonly Competition[] = [
  comp('nations-league', 'UEFA Nations League', 'Nations League', 'international', 10, 'Europa'),
  comp('euro', 'Europameisterschaft', 'EM', 'international', 11, 'Europa'),
  comp('world-cup', 'Weltmeisterschaft', 'WM', 'international', 12, 'Welt'),
]

export const ALL_COMPETITIONS: readonly Competition[] = [
  ...LEAGUES.map((l) => l.competition),
  ...Object.values(CUPS),
  ...INTERNATIONAL,
]

// ---------------------------------------------------------------- Teams & Spieler

export interface TeamRecord {
  team: Team
  leagueId: string
  squad: Player[]
}

const SQUAD_LAYOUT: readonly PlayerPosition[] = [
  'GK', 'GK', 'DF', 'DF', 'DF', 'DF', 'DF', 'DF', 'MF', 'MF', 'MF', 'MF', 'MF', 'MF', 'FW', 'FW', 'FW', 'FW',
]
const SHIRT_NUMBERS: readonly number[] = [1, 12, 2, 3, 4, 5, 15, 22, 6, 8, 10, 14, 16, 18, 7, 9, 11, 19]

function teamCode(name: string): string {
  const words = name.replace(/\b(FC|SK|SC|SV|TSV|VfB|FK|AC|AS|US|UD|CD|CF|RC)\b/g, '').trim().split(/\s+/)
  return (words[0] ?? name).slice(0, 3).toUpperCase()
}

function buildTeam(league: LeagueSeed, name: string, index: number): TeamRecord {
  const rng = createRng(`team:${name}`)
  const id = `t-${slugify(name)}`
  const personName = () => `${rng.pick(league.names.first)} ${rng.pick(league.names.last)}`
  const city = name.split(' ').find((w) => w.length > 3 && !/^(Borussia|Eintracht|Union|Sporting|Racing|Olympique|Stade|Virtus|Calcio|Real|Deportivo|Atlético|Inter)$/.test(w)) ?? name

  const team: Team = {
    id,
    slug: slugify(name),
    name,
    shortName: name,
    code: teamCode(name),
    country: league.competition.country,
    venue: `${city}-Arena`,
    coach: personName(),
  }

  const usedNames = new Set<string>()
  const squad = SQUAD_LAYOUT.map((position, i): Player => {
    let playerName = personName()
    while (usedNames.has(playerName)) playerName = personName()
    usedNames.add(playerName)
    const [firstName = '', ...rest] = playerName.split(' ')
    const lastName = rest.join(' ')
    const birthYear = 2007 - rng.int(0, 16)
    return {
      id: `p-${index}-${slugify(league.competition.slug)}-${i}`,
      slug: slugify(playerName),
      name: playerName,
      shortName: `${firstName[0]}. ${lastName}`,
      firstName,
      lastName,
      birthDate: `${birthYear}-${String(rng.int(1, 12)).padStart(2, '0')}-${String(rng.int(1, 28)).padStart(2, '0')}`,
      nationality: rng.chance(0.8) ? league.nationality : rng.pick(['Brasilien', 'Portugal', 'Niederlande', 'Belgien', 'Kroatien', 'Senegal', 'Japan']),
      position,
      shirtNumber: SHIRT_NUMBERS[i],
      teamId: id,
    }
  })

  return { team, leagueId: league.competition.id, squad }
}

export const TEAMS: ReadonlyMap<string, TeamRecord> = new Map(
  LEAGUES.flatMap((league) => league.teams.map((name, i) => buildTeam(league, name, i))).map((r) => [r.team.id, r]),
)

export const PLAYERS: ReadonlyMap<string, Player> = new Map(
  [...TEAMS.values()].flatMap((r) => r.squad).map((p) => [p.id, p]),
)

export function leagueTeams(leagueId: string): TeamRecord[] {
  return [...TEAMS.values()].filter((r) => r.leagueId === leagueId)
}

export function requireTeam(id: string): TeamRecord {
  const record = TEAMS.get(id)
  if (!record) throw new Error(`Demo-Team ${id} fehlt`)
  return record
}
