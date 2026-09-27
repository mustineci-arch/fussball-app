import { useSyncExternalStore } from 'react'
import type { TvCountry } from './broadcasts'

const STORAGE_KEY = 'anstoss.tvCountry'

function read(): TvCountry {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'DE' || stored === 'TR') return stored
  } catch {
    // Speicher nicht verfügbar
  }
  return 'DE'
}

let country: TvCountry = typeof window === 'undefined' ? 'DE' : read()
const listeners = new Set<() => void>()

export function setTvCountry(next: TvCountry) {
  country = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // gilt dann nur für diese Sitzung
  }
  listeners.forEach((l) => l())
}

export function useTvCountry(): TvCountry {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => country,
    () => 'DE',
  )
}
