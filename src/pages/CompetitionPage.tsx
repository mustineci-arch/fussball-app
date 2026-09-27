import { CalendarX2, Table2, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { CompetitionBadge, TeamLogo } from '../components/media'
import { Card, Section } from '../components/ui/Card'
import { BackButton } from '../components/ui/PageHeader'
import { BlockSkeleton, Skeleton } from '../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../components/ui/States'
import { Chips, TabBar, useTabParam } from '../components/ui/Tabs'
import { useCompetition, useCompetitionFixtures, useCompetitionTeams, useStandings, useTopPlayers } from '../data/queries'
import { isFinished, isLive, isUpcoming } from '../domain/status'
import type { Competition, Id, TopPlayerCategory } from '../domain/types'
import { StandingsTable } from '../features/competitions/StandingsTable'
import { TopPlayersList } from '../features/competitions/TopPlayersList'
import { FavoriteButton } from '../features/favorites/FavoriteButton'
import { favoriteFromCompetition } from '../features/favorites/store'
import { FixtureList } from '../features/matches/FixtureList'
import { useT } from '../i18n'
import { provider } from '../providers'

const TAB_IDS = ['overview', 'matches', 'table', 'stats', 'teams'] as const

function Header({ competition, seasonLabel, round }: { competition: Competition; seasonLabel?: string; round?: string }) {
  return (
    <div className="flex items-center gap-4">
      <CompetitionBadge competition={competition} size={56} className="rounded-xl" />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-bold tracking-tight">{competition.name}</h1>
        <p className="text-sm text-muted">{[competition.country, seasonLabel, round].filter(Boolean).join(' · ')}</p>
      </div>
      <FavoriteButton entry={favoriteFromCompetition(competition)} />
    </div>
  )
}

function useFixtureBuckets(id: Id) {
  const query = useCompetitionFixtures(id)
  const all = query.data ?? []
  return {
    query,
    live: all.filter((f) => isLive(f.status)),
    upcoming: all.filter((f) => isUpcoming(f.status)),
    results: all.filter((f) => isFinished(f.status)).reverse(),
  }
}

function Overview({ id }: { id: Id }) {
  const t = useT()
  const { query, live, upcoming, results } = useFixtureBuckets(id)
  const standings = useStandings(id)
  const scorers = useTopPlayers(id, 'goals')
  const leader = standings.data?.[0]?.rows[0]

  if (query.isPending) return <BlockSkeleton rows={6} />
  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />

  return (
    <div className="space-y-5">
      {leader && (
        <Section title={t('competition.leader')}>
          <Card>
            <Link to={`/team/${leader.team.id}`} className="flex items-center gap-3">
              <TeamLogo team={leader.team} size={40} />
              <span className="flex-1 font-semibold">{leader.team.name}</span>
              <span className="text-right">
                <span className="block text-xl font-bold tabular-nums">{leader.points}</span>
                <span className="text-xs text-muted">{t('common.points')}</span>
              </span>
            </Link>
          </Card>
        </Section>
      )}
      <FixtureList title={t('common.live')} fixtures={live} />
      <FixtureList title={t('competition.nextMatches')} fixtures={upcoming.slice(0, 4)} />
      <FixtureList title={t('competition.lastResults')} fixtures={results.slice(0, 4)} />
      {scorers.data && scorers.data.length > 0 && (
        <Section title={t('competition.topScorers')}>
          <TopPlayersList entries={scorers.data.slice(0, 3)} />
        </Section>
      )}
      {!leader && live.length + upcoming.length + results.length === 0 && (
        <EmptyState icon={CalendarX2} title={t('common.noData')} description={t('competition.noDataText')} />
      )}
    </div>
  )
}

function Matches({ id }: { id: Id }) {
  const t = useT()
  const { query, live, upcoming, results } = useFixtureBuckets(id)
  if (query.isPending) return <BlockSkeleton rows={8} />
  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  if (live.length + upcoming.length + results.length === 0) {
    return <EmptyState icon={CalendarX2} title={t('matches.emptyTitle')} description={t('competition.noMatchesText')} />
  }
  return (
    <div className="space-y-5">
      <FixtureList title={t('common.live')} fixtures={live} />
      <FixtureList title={t('competition.upcoming')} fixtures={upcoming.slice(0, 20)} />
      <FixtureList title={t('competition.results')} fixtures={results.slice(0, 20)} />
    </div>
  )
}

function TableTab({ id }: { id: Id }) {
  const t = useT()
  const { data, isPending, error, refetch } = useStandings(id)
  if (isPending) return <BlockSkeleton rows={8} />
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />
  if (!data.length) return <EmptyState icon={Table2} title={t('table.noneTitle')} description={t('table.noneText')} />
  return (
    <div className="space-y-4">
      {data.map((table, i) => (
        <StandingsTable key={table.groupName ?? i} table={table} />
      ))}
    </div>
  )
}

function Stats({ id }: { id: Id }) {
  const t = useT()
  // Nur Kategorien anbieten, die die Datenquelle tatsächlich liefert
  const categories = provider.topPlayerCategories
  const [category, setCategory] = useState<TopPlayerCategory>(categories[0] ?? 'goals')
  const { data, isPending, error, refetch } = useTopPlayers(id, category)
  return (
    <div className="space-y-4">
      <Chips options={categories.map((c) => ({ id: c, label: t(`top.${c}`) }))} active={category} onChange={setCategory} />
      {isPending ? (
        <BlockSkeleton rows={6} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data.length === 0 ? (
        <EmptyState title={t('common.noData')} description={t('competition.noCategoryText')} />
      ) : (
        <TopPlayersList entries={data} />
      )}
    </div>
  )
}

function Teams({ id }: { id: Id }) {
  const t = useT()
  const { data, isPending, error, refetch } = useCompetitionTeams(id)
  if (isPending) return <BlockSkeleton rows={6} />
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />
  if (data.length === 0) return <EmptyState icon={Users} title={t('competition.noTeamsTitle')} description={t('competition.noTeamsText')} />
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {data.map((team) => (
        <Link key={team.id} to={`/team/${team.id}`}>
          <Card className="flex h-full flex-col items-center gap-2 text-center transition-colors hover:border-subtle">
            <TeamLogo team={team} size={44} />
            <span className="text-sm leading-tight font-semibold">{team.name}</span>
          </Card>
        </Link>
      ))}
    </div>
  )
}

export default function CompetitionPage() {
  const t = useT()
  const { id = '' } = useParams()
  const { data, isPending, error, refetch } = useCompetition(id)
  const tabs = TAB_IDS.map((tab) => ({ id: tab, label: t(`competition.tab.${tab}`) }))
  const [tab, setTab] = useTabParam(tabs)

  return (
    <div className="space-y-4">
      <BackButton />
      {isPending ? (
        <Skeleton className="h-14 w-2/3" />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <>
          <Header competition={data.competition} seasonLabel={data.season?.label} round={data.season?.currentRound} />
          <TabBar tabs={tabs} active={tab} onChange={setTab} />
          {tab === 'overview' && <Overview id={id} />}
          {tab === 'matches' && <Matches id={id} />}
          {tab === 'table' && <TableTab id={id} />}
          {tab === 'stats' && <Stats id={id} />}
          {tab === 'teams' && <Teams id={id} />}
        </>
      )}
    </div>
  )
}
