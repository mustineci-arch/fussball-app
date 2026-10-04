import { useSyncExternalStore } from 'react'
import { ALL_COUNTRIES, type TvCountry } from './broadcasts'

const STORAGE_KEY = 'anstoss.tvCountry'

/** Land des Geräts aus den Spracheinstellungen ("de-AT" → AT), sonst Deutschland */
export function detectCountry(languages: readonly string[] = typeof navigator === 'undefined' ? [] : navigator.languages ?? [navigator.language]): TvCountry {
  for (const lang of languages) {
    const region = /[-_]([A-Za-z]{2})\b/.exec(lang)?.[1]?.toUpperCase()
    if (region && ALL_COUNTRIES.includes(region)) return region
  }
  return 'DE'
}

function read(): TvCountry {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && ALL_COUNTRIES.includes(stored)) return stored
  } catch {
    // Speicher nicht verfügbar
  }
  return detectCountry()
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
