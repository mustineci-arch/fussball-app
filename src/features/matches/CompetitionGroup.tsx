import { ChevronRight } from 'lucide-react'
import { memo } from 'react'
import { Link } from 'react-router'
import { CompetitionBadge } from '../../components/media'
import { Card } from '../../components/ui/Card'
import type { Competition, Fixture } from '../../domain/types'
import { MatchRow } from './MatchRow'

interface CompetitionGroupProps {
  competition: Competition
  fixtures: Fixture[]
}

export const CompetitionGroup = memo(function CompetitionGroup({ competition, fixtures }: CompetitionGroupProps) {
  return (
    <section>
      <Card padded={false} className="overflow-hidden">
        <Link
          to={`/competition/${competition.id}`}
          className="flex items-center gap-2.5 border-b border-border bg-surface-2 px-4 py-2.5 hover:bg-surface-3"
        >
          <CompetitionBadge competition={competition} size={22} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-bold tracking-wide uppercase">{competition.name}</span>
            {competition.country && <span className="block text-[11px] text-subtle">{competition.country}</span>}
          </span>
          <ChevronRight className="size-4 text-subtle" aria-hidden />
        </Link>
        <div className="divide-y divide-border">
          {fixtures.map((f) => (
            <MatchRow key={f.id} fixture={f} />
          ))}
        </div>
      </Card>
    </section>
  )
})
