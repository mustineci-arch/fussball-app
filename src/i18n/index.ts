/**
 * Sprachsteuerung (Deutsch/Englisch).
 * Die aktuelle Sprache liegt außerhalb von React, damit auch der Datenadapter (z. B. für
 * Ländernamen) sie lesen kann. Komponenten nutzen useT() und rendern bei einem Wechsel neu.
 */
import { useCallback, useSyncExternalStore } from 'react'
import { de, type MessageKey } from './messages.de'
import { en } from './messages.en'

export type Language = 'de' | 'en'
export type { MessageKey }

export const LANGUAGES: readonly { id: Language; label: string }[] = [
  { id: 'de', label: 'Deutsch' },
  { id: 'en', label: 'English' },
]

const STORAGE_KEY = 'anstoss.language'
const DICTIONARIES: Record<Language, Record<MessageKey, string>> = { de, en }

function detectLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'de' || stored === 'en') return stored
  } catch {
    // Speicher nicht verfügbar (z. B. privater Modus)
  }
  const browser = typeof navigator !== 'undefined' ? navigator.language : 'de'
  return browser.toLowerCase().startsWith('de') ? 'de' : browser.toLowerCase().startsWith('en') ? 'en' : 'de'
}

let current: Language = detectLanguage()
const listeners = new Set<() => void>()

function applyToDocument() {
  if (typeof document !== 'undefined') document.documentElement.lang = current
}
applyToDocument()

export const getLanguage = (): Language => current

/** BCP-47-Locale für Intl-Formatierungen */
export const getLocale = (): string => (current === 'de' ? 'de-DE' : 'en-GB')

export function setLanguage(language: Language) {
  if (language === current) return
  current = language
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // ignorieren – Sprache gilt dann nur für diese Sitzung
  }
  applyToDocument()
  listeners.forEach((l) => l())
}

export function subscribeLanguage(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function translate(key: MessageKey, vars?: Record<string, string | number>, language = current): string {
  const text = DICTIONARIES[language][key] ?? de[key] ?? key
  return vars ? text.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`)) : text
}

export function useLanguage(): Language {
  return useSyncExternalStore(subscribeLanguage, getLanguage, getLanguage)
}

export type TFunction = (key: MessageKey, vars?: Record<string, string | number>) => string

export function useT(): TFunction {
  const language = useLanguage()
  return useCallback((key, vars) => translate(key, vars, language), [language])
}
