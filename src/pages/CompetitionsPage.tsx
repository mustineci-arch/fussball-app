import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { CompetitionBadge } from '../components/media'
import { Card, Section } from '../components/ui/Card'
import { PageTitle } from '../components/ui/PageHeader'
import { BlockSkeleton } from '../components/ui/Skeleton'
import { ErrorState } from '../components/ui/States'
import { useCompetitions } from '../data/queries'
import type { Competition, CompetitionType } from '../domain/types'

const GROUPS: readonly { type: CompetitionType; title: string }[] = [
  { type: 'league', title: 'Ligen' },
  { type: 'cup', title: 'Europapokal' },
  { type: 'international', title: 'Nationalmannschaften' },
]

function CompetitionCard({ competition }: { competition: Competition }) {
  return (
    <Link to={`/competition/${competition.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
      <CompetitionBadge competition={competition} size={36} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{competition.name}</span>
        {competition.country && <span className="block text-xs text-muted">{competition.country}</span>}
      </span>
      <ChevronRight className="size-4 text-subtle" aria-hidden />
    </Link>
  )
}

export default function CompetitionsPage() {
  const { data, isPending, error, refetch } = useCompetitions()

  return (
    <div className="space-y-5">
      <PageTitle>Wettbewerbe</PageTitle>
      {isPending ? (
        <BlockSkeleton rows={8} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        GROUPS.map(({ type, title }) => {
          const list = data.filter((c) => c.type === type)
          if (list.length === 0) return null
          return (
            <Section key={type} title={title}>
              <Card padded={false} className="grid divide-y divide-border overflow-hidden md:grid-cols-2 md:divide-y-0 md:[&>*]:border-b md:[&>*]:border-border">
                {list.map((c) => (
                  <CompetitionCard key={c.id} competition={c} />
                ))}
              </Card>
            </Section>
          )
        })
      )}
    </div>
  )
}
