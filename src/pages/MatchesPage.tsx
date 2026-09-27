import { CalendarX2, Radio } from 'lucide-react'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { MatchListSkeleton } from '../components/ui/Skeleton'
import { EmptyState, ErrorState, StaleNotice } from '../components/ui/States'
import { Chips } from '../components/ui/Tabs'
import { useCompetitions, useFixturesByDate } from '../data/queries'
import { formatLongDate, parseDateKey, relativeDayLabel, todayKey } from '../domain/date'
import { matchesFilter, type FixtureFilter } from '../domain/status'
import { CompetitionGroup } from '../features/matches/CompetitionGroup'
import { DateStrip } from '../features/matches/DateStrip'
import { groupFixturesByCompetition } from '../features/matches/groupFixtures'

const FILTERS: readonly { id: FixtureFilter; label: string }[] = [
  { id: 'all', label: 'Alle' },
  { id: 'live', label: 'Live' },
  { id: 'upcoming', label: 'Kommend' },
  { id: 'finished', label: 'Beendet' },
]

const EMPTY_TEXT: Record<FixtureFilter, string> = {
  all: 'An diesem Tag finden keine Spiele statt.',
  live: 'Gerade läuft kein Spiel.',
  upcoming: 'An diesem Tag stehen keine Spiele mehr an.',
  finished: 'An diesem Tag ist noch kein Spiel beendet.',
}

export default function MatchesPage() {
  const [params, setParams] = useSearchParams()
  const today = todayKey()
  const rawDate = params.get('date')
  const date = rawDate && parseDateKey(rawDate) ? rawDate : today
  const filter = FILTERS.find((f) => f.id === params.get('filter'))?.id ?? 'all'

  const update = (next: { date?: string; filter?: FixtureFilter }) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        const d = next.date ?? date
        const f = next.filter ?? filter
        if (d === today) p.delete('date')
        else p.set('date', d)
        if (f === 'all') p.delete('filter')
        else p.set('filter', f)
        return p
      },
      { replace: true },
    )

  const fixtures = useFixturesByDate(date)
  const competitions = useCompetitions()

  const counts = useMemo(() => {
    const list = fixtures.data ?? []
    return Object.fromEntries(FILTERS.map((f) => [f.id, list.filter((x) => matchesFilter(x, f.id)).length])) as Record<FixtureFilter, number>
  }, [fixtures.data])

  const groups = useMemo(
    () =>
      groupFixturesByCompetition(
        (fixtures.data ?? []).filter((f) => matchesFilter(f, filter)),
        competitions.data ?? [],
      ),
    [fixtures.data, competitions.data, filter],
  )

  const isPending = fixtures.isPending || competitions.isPending
  const error = fixtures.error ?? competitions.error
  const heading = relativeDayLabel(date, today)

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Spiele {heading ?? ''} – {formatLongDate(date)}</h1>
      <DateStrip value={date} onChange={(d) => update({ date: d })} />
      <Chips
        options={FILTERS.map((f) => ({ ...f, count: fixtures.data ? counts[f.id] : undefined }))}
        active={filter}
        onChange={(f) => update({ filter: f })}
      />

      <StaleNotice show={fixtures.isRefetchError} />

      {isPending ? (
        <MatchListSkeleton />
      ) : error && !fixtures.data ? (
        <ErrorState error={error} onRetry={() => void fixtures.refetch()} />
      ) : groups.length === 0 ? (
        <EmptyState icon={filter === 'live' ? Radio : CalendarX2} title="Keine Spiele" description={EMPTY_TEXT[filter]} />
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <CompetitionGroup key={g.competition.id} competition={g.competition} fixtures={g.fixtures} />
          ))}
        </div>
      )}
    </div>
  )
}
