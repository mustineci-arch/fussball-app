import clsx from 'clsx'
import { useT } from '../../i18n'
import { Card } from './Card'

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={clsx('animate-pulse rounded-md bg-surface-3', className)} />
}

/** Platzhalter für Spiellisten während des Ladens */
export function MatchListSkeleton({ groups = 3 }: { groups?: number }) {
  const t = useT()
  return (
    <div className="space-y-5" aria-busy="true" aria-label={t('common.loading')}>
      {Array.from({ length: groups }, (_, g) => (
        <div key={g} className="space-y-2.5">
          <Skeleton className="ml-1 h-3.5 w-32" />
          <Card padded={false} className="divide-y divide-border">
            {Array.from({ length: 2 + (g % 2) }, (_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </Card>
        </div>
      ))}
    </div>
  )
}

export function BlockSkeleton({ rows = 5 }: { rows?: number }) {
  const t = useT()
  return (
    <div aria-busy="true" aria-label={t('common.loading')}>
      <Card className="space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className={clsx('h-4', i % 3 === 2 ? 'w-2/3' : 'w-full')} />
        ))}
      </Card>
    </div>
  )
}
