/**
 * Installation als App.
 * - Android/Chrome/Edge/Desktop: Browser meldet "beforeinstallprompt" → eigener Installieren-Button
 * - iPhone/iPad (Safari): kein Installations-Dialog möglich → Anleitung "Teilen → Zum Home-Bildschirm"
 */
import { useSyncExternalStore } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | undefined
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // eigenen Button statt Browser-Leiste zeigen
    deferredPrompt = e as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = undefined
    notify()
  })
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const nav = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
}

export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  // iPadOS meldet sich als Mac mit Touchscreen
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export type InstallState = 'installed' | 'prompt' | 'ios' | 'unavailable'

function getState(): InstallState {
  if (isStandalone()) return 'installed'
  if (deferredPrompt) return 'prompt'
  if (isIos()) return 'ios'
  return 'unavailable'
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    getState,
    () => 'unavailable',
  )
}

export async function promptInstall(): Promise<void> {
  if (!deferredPrompt) return
  await deferredPrompt.prompt()
  await deferredPrompt.userChoice
  deferredPrompt = undefined
  notify()
}
