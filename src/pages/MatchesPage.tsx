import { CalendarX2, Radio, Star } from 'lucide-react'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { Card } from '../components/ui/Card'
import { MatchListSkeleton } from '../components/ui/Skeleton'
import { EmptyState, ErrorState, StaleNotice } from '../components/ui/States'
import { Chips } from '../components/ui/Tabs'
import { useCompetitions, useFixturesByDate } from '../data/queries'
import { formatLongDate, parseDateKey, relativeDay, todayKey } from '../domain/date'
import { matchesFilter, type FixtureFilter } from '../domain/status'
import { favoriteIds, useFavorites } from '../features/favorites/store'
import { CompetitionGroup } from '../features/matches/CompetitionGroup'
import { DateStrip } from '../features/matches/DateStrip'
import { groupFixturesByCompetition } from '../features/matches/groupFixtures'
import { MatchRow } from '../features/matches/MatchRow'
import { useT } from '../i18n'

const FILTERS: readonly FixtureFilter[] = ['all', 'live', 'upcoming', 'finished']

export default function MatchesPage() {
  const t = useT()
  const [params, setParams] = useSearchParams()
  const today = todayKey()
  const rawDate = params.get('date')
  const date = rawDate && parseDateKey(rawDate) ? rawDate : today
  const filter = FILTERS.find((f) => f === params.get('filter')) ?? 'all'

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
  const favorites = useFavorites()

  const counts = useMemo(() => {
    const list = fixtures.data ?? []
    return Object.fromEntries(FILTERS.map((f) => [f, list.filter((x) => matchesFilter(x, f)).length])) as Record<FixtureFilter, number>
  }, [fixtures.data])

  const { mine, groups } = useMemo(() => {
    const teams = favoriteIds(favorites, 'team')
    const matches = favoriteIds(favorites, 'match')
    const visible = (fixtures.data ?? []).filter((f) => matchesFilter(f, filter))
    const isMine = (f: (typeof visible)[number]) => matches.has(f.id) || teams.has(f.homeTeam.id) || teams.has(f.awayTeam.id)
    return {
      // Spiele mit Lieblingsteams bzw. favorisierte Spiele stehen oben – und nicht doppelt weiter unten
      mine: visible.filter(isMine).sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt)),
      groups: groupFixturesByCompetition(
        visible.filter((f) => !isMine(f)),
        competitions.data ?? [],
        favoriteIds(favorites, 'competition'),
      ),
    }
  }, [fixtures.data, competitions.data, filter, favorites])

  const isPending = fixtures.isPending || competitions.isPending
  const error = fixtures.error ?? competitions.error
  const relative = relativeDay(date, today)

  return (
    <div className="space-y-4">
      <h1 className="sr-only">
        {t('matches.title')} {relative ? t(`day.${relative}`) : ''} – {formatLongDate(date)}
      </h1>
      <DateStrip value={date} onChange={(d) => update({ date: d })} />
      <Chips
        options={FILTERS.map((f) => ({ id: f, label: t(`filter.${f}`), count: fixtures.data ? counts[f] : undefined }))}
        active={filter}
        onChange={(f) => update({ filter: f })}
      />

      <StaleNotice show={fixtures.isRefetchError} />

      {isPending ? (
        <MatchListSkeleton />
      ) : error && !fixtures.data ? (
        <ErrorState error={error} onRetry={() => void fixtures.refetch()} />
      ) : groups.length === 0 && mine.length === 0 ? (
        <EmptyState icon={filter === 'live' ? Radio : CalendarX2} title={t('matches.emptyTitle')} description={t(`matches.empty.${filter}`)} />
      ) : (
        <div className="space-y-4">
          {mine.length > 0 && (
            <Card padded={false} className="overflow-hidden border-amber-300/60">
              <p className="flex items-center gap-2 border-b border-border bg-amber-50 px-4 py-2.5 dark:bg-amber-400/10 text-[13px] font-bold tracking-wide uppercase">
                <Star className="size-4 text-amber-500" fill="currentColor" aria-hidden />
                {t('matches.myMatches')}
              </p>
              <div className="divide-y divide-border">
                {mine.map((f) => (
                  <MatchRow key={f.id} fixture={f} />
                ))}
              </div>
            </Card>
          )}
          {groups.map((g) => (
            <CompetitionGroup key={g.competition.id} competition={g.competition} fixtures={g.fixtures} />
          ))}
        </div>
      )}
    </div>
  )
}
