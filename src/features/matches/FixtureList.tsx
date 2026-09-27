import { Card, Section } from '../../components/ui/Card'
import { formatLongDate, relativeDayLabel, toDateKey } from '../../domain/date'
import type { Fixture } from '../../domain/types'
import { MatchRow } from './MatchRow'

interface FixtureListProps {
  title: string
  fixtures: Fixture[]
  highlightTeamId?: string
}

/** Spiele nach Kalendertag gruppiert (für Wettbewerbs- und Teamseiten). */
export function FixtureList({ title, fixtures, highlightTeamId }: FixtureListProps) {
  if (fixtures.length === 0) return null
  const byDay = new Map<string, Fixture[]>()
  for (const f of fixtures) {
    const key = toDateKey(new Date(f.kickoffAt))
    byDay.set(key, [...(byDay.get(key) ?? []), f])
  }
  return (
    <Section title={title}>
      <Card padded={false} className="overflow-hidden">
        {[...byDay.entries()].map(([day, list]) => (
          <div key={day}>
            <p className="border-y border-border bg-surface-2 px-4 py-1.5 text-xs font-semibold text-muted first:border-t-0">
              {relativeDayLabel(day) ? `${relativeDayLabel(day)}, ` : ''}
              {formatLongDate(day)}
            </p>
            <div className="divide-y divide-border">
              {list.map((f) => (
                <MatchRow key={f.id} fixture={f} highlightTeamId={highlightTeamId} />
              ))}
            </div>
          </div>
        ))}
      </Card>
    </Section>
  )
}
