import { CircleAlert } from 'lucide-react'
import { useRouteError } from 'react-router'
import { EmptyState } from '../components/ui/States'

/** Fängt unerwartete Render-Fehler ab – statt einer weißen Seite. */
export function RouteError() {
  const error = useRouteError()
  console.error('[RouteError]', error)

  // Nach einem neuen Deployment fehlen evtl. alte Code-Chunks – dann hilft ein Neuladen.
  const chunkMissing = error instanceof Error && /dynamically imported module|Importing a module script failed/i.test(error.message)

  return (
    <div className="mx-auto max-w-xl p-4 pt-10">
      <EmptyState
        icon={CircleAlert}
        title={chunkMissing ? 'Neue Version verfügbar' : 'Etwas ist schiefgelaufen'}
        description={
          chunkMissing
            ? 'Die App wurde aktualisiert. Bitte einmal neu laden.'
            : 'Dieser Bereich konnte nicht angezeigt werden. Bitte lade die Seite neu.'
        }
        action={
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong"
          >
            Neu laden
          </button>
        }
      />
    </div>
  )
}
