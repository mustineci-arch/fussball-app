/**
 * Favoriten – lokal im Browser gespeichert (kein Konto nötig).
 * Zu jedem Favoriten wird eine kleine Momentaufnahme (Name, Logo, Paarung) gespeichert,
 * damit die Favoritenliste auch offline und ohne weitere Anfragen angezeigt werden kann.
 * Später kann dieselbe Struktur mit einem Benutzerkonto synchronisiert werden.
 */
import { useSyncExternalStore } from 'react'
import type { Competition, Favorite, FavoriteType, Fixture, Id, Team } from '../../domain/types'

type TeamSnapshot = Pick<Team, 'id' | 'name' | 'shortName' | 'code' | 'logoUrl'>

export interface StoredFavorite extends Favorite {
  name: string
  logoUrl?: string
  /** Nur bei Spielen */
  match?: {
    kickoffAt: string
    competitionId: Id
    homeTeam: TeamSnapshot
    awayTeam: TeamSnapshot
  }
}

const STORAGE_KEY = 'anstoss.favorites.v1'
const EMPTY: StoredFavorite[] = []

function load(): StoredFavorite[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as StoredFavorite[]).filter((f) => f && typeof f.id === 'string' && typeof f.type === 'string') : []
  } catch {
    return []
  }
}

let favorites: StoredFavorite[] = typeof window === 'undefined' ? EMPTY : load()
const listeners = new Set<() => void>()

function commit(next: StoredFavorite[]) {
  favorites = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Speicher voll oder gesperrt – Favoriten gelten dann nur für diese Sitzung
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // Änderungen aus anderen Tabs übernehmen
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      favorites = load()
      listener()
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

const getSnapshot = () => favorites

export function useFavorites(): StoredFavorite[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY)
}

export function useIsFavorite(type: FavoriteType, id: Id): boolean {
  const list = useFavorites()
  return list.some((f) => f.type === type && f.id === id)
}

export function favoriteIds(list: readonly StoredFavorite[], type: FavoriteType): Set<Id> {
  return new Set(list.filter((f) => f.type === type).map((f) => f.id))
}

export function toggleFavorite(entry: Omit<StoredFavorite, 'addedAt'>) {
  const exists = favorites.some((f) => f.type === entry.type && f.id === entry.id)
  commit(
    exists
      ? favorites.filter((f) => !(f.type === entry.type && f.id === entry.id))
      : [...favorites, { ...entry, addedAt: new Date().toISOString() }],
  )
}

// ------------------------------------------------------------ Hilfen zum Anlegen

const teamSnapshot = (t: Team): TeamSnapshot => ({ id: t.id, name: t.name, shortName: t.shortName, code: t.code, logoUrl: t.logoUrl })

export const favoriteFromTeam = (team: Team): Omit<StoredFavorite, 'addedAt'> => ({
  type: 'team',
  id: team.id,
  name: team.name,
  logoUrl: team.logoUrl,
})

export const favoriteFromCompetition = (c: Competition): Omit<StoredFavorite, 'addedAt'> => ({
  type: 'competition',
  id: c.id,
  name: c.name,
  logoUrl: c.logoUrl,
})

export const favoriteFromMatch =(fixture: Fixture): Omit<StoredFavorite, 'addedAt'> => ({
  type: 'match',
  id: fixture.id,
  name: `${fixture.homeTeam.name} – ${fixture.awayTeam.name}`,
  match: {
    kickoffAt: fixture.kickoffAt,
    competitionId: fixture.competitionId,
    homeTeam: teamSnapshot(fixture.homeTeam),
    awayTeam: teamSnapshot(fixture.awayTeam),
  },
})

/** Nur für Tests */
export function __resetFavorites(list: StoredFavorite[] = []) {
  favorites = list
}
