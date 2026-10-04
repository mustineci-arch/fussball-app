import clsx from 'clsx'
import { Link } from 'react-router'
import { PlayerAvatar } from '../../components/media'
import { Card } from '../../components/ui/Card'
import { formatDate } from '../../domain/date'
import type { InjuryStatus, Player } from '../../domain/types'
import { useT } from '../../i18n'
import type { PlayerPhoto } from '../../media/wikimedia'

const STATUS_STYLES: Record<InjuryStatus, string> = {
  out: 'bg-red-600 text-white',
  suspended: 'bg-red-600 text-white',
  doubtful: 'bg-amber-500 text-white',
  day_to_day: 'bg-amber-500 text-white',
  other: 'bg-surface-3 text-text',
}

/** Spieler mit aktueller Verletzungs- oder Sperrmeldung */
export const injuredPlayers = (players: Player[] | undefined) => (players ?? []).filter((p) => p.injury)

export function InjuryStatusBadge({ status }: { status: InjuryStatus }) {
  const t = useT()
  return (
    <span className={clsx('shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold', STATUS_STYLES[status])}>
      {t(`injury.${status}`)}
    </span>
  )
}

export function InjuryList({ players, photos }: { players: Player[]; photos?: Record<string, PlayerPhoto | null> }) {
  const t = useT()
  return (
    <Card padded={false} className="divide-y divide-border overflow-hidden">
      {players.map((p) => {
        const injury = p.injury!
        const since = injury.since && formatDate(injury.since)
        const back = injury.expectedReturn && formatDate(injury.expectedReturn)
        const info = [
          p.position && t(`position.${p.position}`),
          injury.detail,
          since && t('injury.since', { date: since }),
          back && t('injury.return', { date: back }),
        ].filter(Boolean)
        return (
          <Link key={p.id} to={`/player/${p.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2">
            <PlayerAvatar name={p.name} photoUrl={photos?.[p.id]?.url ?? p.photoUrl} shirtNumber={p.shirtNumber} size={36} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{p.name}</span>
              <span className="block truncate text-xs text-muted">{info.join(' · ')}</span>
            </span>
            <InjuryStatusBadge status={injury.status} />
          </Link>
        )
      })}
    </Card>
  )
}
