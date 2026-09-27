import { CircleAlert } from 'lucide-react'
import { useRouteError } from 'react-router'
import { EmptyState } from '../components/ui/States'
import { useT } from '../i18n'

/** Fängt unerwartete Render-Fehler ab – statt einer weißen Seite. */
export function RouteError() {
  const t = useT()
  const error = useRouteError()
  console.error('[RouteError]', error)

  // Nach einem neuen Deployment fehlen evtl. alte Code-Chunks – dann hilft ein Neuladen.
  const chunkMissing = error instanceof Error && /dynamically imported module|Importing a module script failed/i.test(error.message)

  return (
    <div className="mx-auto max-w-xl p-4 pt-10">
      <EmptyState
        icon={CircleAlert}
        title={t(chunkMissing ? 'state.updateTitle' : 'state.crashTitle')}
        description={t(chunkMissing ? 'state.updateText' : 'state.crashText')}
        action={
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong"
          >
            {t('common.reload')}
          </button>
        }
      />
    </div>
  )
}
