import type { LucideIcon } from 'lucide-react'
import { CircleAlert, Inbox, RotateCw, WifiOff } from 'lucide-react'
import type { ReactNode } from 'react'
import { NotFoundError } from '../../providers/errors'
import { Card } from './Card'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: LucideIcon
  action?: ReactNode
}

export function EmptyState({ title, description, icon: Icon = Inbox, action }: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center px-6 py-10 text-center">
      <div className="mb-3 grid size-12 place-items-center rounded-full bg-surface-2 text-subtle">
        <Icon className="size-6" aria-hidden />
      </div>
      <p className="font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </Card>
  )
}

interface ErrorStateProps {
  error: unknown
  onRetry?: () => void
}

/** Einheitliche Fehleranzeige – niemals eine weiße Seite. */
export function ErrorState({ error, onRetry }: ErrorStateProps) {
  if (error instanceof NotFoundError) {
    return <EmptyState icon={CircleAlert} title="Nicht gefunden" description="Diese Seite gibt es nicht (mehr)." />
  }
  const offline = typeof navigator !== 'undefined' && !navigator.onLine
  return (
    <EmptyState
      icon={offline ? WifiOff : CircleAlert}
      title={offline ? 'Keine Internetverbindung' : 'Daten konnten nicht geladen werden'}
      description={
        offline
          ? 'Sobald du wieder online bist, werden die Daten automatisch aktualisiert.'
          : 'Die Datenquelle ist gerade nicht erreichbar. Bitte versuche es gleich noch einmal.'
      }
      action={
        onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong"
          >
            <RotateCw className="size-4" aria-hidden /> Erneut versuchen
          </button>
        )
      }
    />
  )
}

/** Dezenter Hinweis, wenn eine Live-Aktualisierung fehlschlägt, aber alte Daten noch angezeigt werden. */
export function StaleNotice({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <p role="status" className="flex items-center gap-2 rounded-xl bg-live-soft px-3 py-2 text-sm text-live">
      <WifiOff className="size-4 shrink-0" aria-hidden />
      Live-Daten konnten momentan nicht aktualisiert werden.
    </p>
  )
}
