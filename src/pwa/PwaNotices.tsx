import { RefreshCw, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useT } from '../i18n'

/** Hinweis bei neuer App-Version – Live-Daten brauchen nie ein Update, nur neuer Code. */
export function UpdatePrompt() {
  const t = useT()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Einmal pro Stunde nach einer neuen Version schauen
      if (registration) setInterval(() => void registration.update(), 60 * 60_000)
    },
  })

  if (!needRefresh) return null
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-24 z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-text px-4 py-3 text-sm text-surface shadow-lg md:bottom-6"
    >
      <RefreshCw className="size-4 shrink-0" aria-hidden />
      <span className="flex-1">{t('pwa.updateAvailable')}</span>
      <button type="button" onClick={() => setNeedRefresh(false)} className="rounded-full px-2 py-1 opacity-70 hover:opacity-100">
        {t('pwa.dismiss')}
      </button>
      <button type="button" onClick={() => void updateServiceWorker(true)} className="rounded-full bg-brand px-3 py-1 font-semibold text-white">
        {t('pwa.update')}
      </button>
    </div>
  )
}

/** Dezenter Balken, solange keine Internetverbindung besteht */
export function OfflineBanner() {
  const t = useT()
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine)
  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  if (!offline) return null
  return (
    <p role="status" className="flex items-center justify-center gap-2 bg-text px-4 py-1.5 text-xs font-medium text-surface">
      <WifiOff className="size-3.5" aria-hidden />
      {t('state.offlineBanner')}
    </p>
  )
}
