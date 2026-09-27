import { Link } from 'react-router'
import { PlayerAvatar, TeamLogo } from '../../components/media'
import { Card } from '../../components/ui/Card'
import type { TopPlayerEntry } from '../../domain/types'

export function TopPlayersList({ entries, unit }: { entries: TopPlayerEntry[]; unit?: string }) {
  return (
    <Card padded={false} className="divide-y divide-border overflow-hidden">
      {entries.map((e) => (
        <Link key={e.player.id} to={`/player/${e.player.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2">
          <span className="w-5 text-sm font-semibold text-subtle tabular-nums">{e.rank}</span>
          <PlayerAvatar name={e.player.name} photoUrl={e.player.photoUrl} size={36} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{e.player.name}</span>
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <TeamLogo team={e.team} size={14} />
              <span className="truncate">{e.team.shortName}</span>
            </span>
          </span>
          <span className="text-lg font-bold tabular-nums">
            {e.value}
            {unit && <span className="ml-0.5 text-xs font-medium text-muted">{unit}</span>}
          </span>
        </Link>
      ))}
    </Card>
  )
}
