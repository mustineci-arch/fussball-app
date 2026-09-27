/**
 * Design: Hell, Dunkel oder wie das Gerät (System).
 * Die Farben liegen als CSS-Variablen in styles/index.css; hier wird nur <html data-theme> gesetzt.
 */
import { useSyncExternalStore } from 'react'

export type ThemeSetting = 'system' | 'light' | 'dark'
export const THEME_SETTINGS: readonly ThemeSetting[] = ['system', 'light', 'dark']

const STORAGE_KEY = 'anstoss.theme'
const THEME_COLORS = { light: '#0f7a4a', dark: '#141c18' } as const

const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : undefined

function readSetting(): ThemeSetting {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {
    // Speicher nicht verfügbar
  }
  return 'system'
}

let setting: ThemeSetting = readSetting()
const listeners = new Set<() => void>()

export const resolveTheme = (s: ThemeSetting): 'light' | 'dark' => (s === 'system' ? (media?.matches ? 'dark' : 'light') : s)

function apply() {
  if (typeof document === 'undefined') return
  const theme = resolveTheme(setting)
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme])
}

apply()
// Bei "System" dem Gerät folgen, wenn es z. B. abends auf Dunkel umschaltet
media?.addEventListener('change', () => {
  if (setting === 'system') {
    apply()
    listeners.forEach((l) => l())
  }
})

export function setThemeSetting(next: ThemeSetting) {
  setting = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // gilt dann nur für diese Sitzung
  }
  apply()
  listeners.forEach((l) => l())
}

export function useThemeSetting(): ThemeSetting {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => setting,
    () => 'system',
  )
}
