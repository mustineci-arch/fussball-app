import { CalendarX2, Table2, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { CompetitionBadge, TeamLogo } from '../components/media'
import { Card, Section } from '../components/ui/Card'
import { BackButton } from '../components/ui/PageHeader'
import { BlockSkeleton, Skeleton } from '../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../components/ui/States'
import { Chips, TabBar, useTabParam } from '../components/ui/Tabs'
import {
  useCompetition,
  useCompetitionFixtures,
  useCompetitionTeams,
  useStandings,
  useTopPlayers,
} from '../data/queries'
import { TOP_CATEGORY_LABELS } from '../domain/labels'
import { isFinished, isLive, isUpcoming } from '../domain/status'
import type { Competition, Id, TopPlayerCategory } from '../domain/types'
import { StandingsTable } from '../features/competitions/StandingsTable'
import { TopPlayersList } from '../features/competitions/TopPlayersList'
import { FixtureList } from '../features/matches/FixtureList'

const TABS = [
  { id: 'overview', label: 'Übersicht' },
  { id: 'matches', label: 'Spiele' },
  { id: 'table', label: 'Tabelle' },
  { id: 'stats', label: 'Statistiken' },
  { id: 'teams', label: 'Teams' },
] as const

function Header({ competition, seasonLabel, round }: { competition: Competition; seasonLabel?: string; round?: string }) {
  return (
    <div className="flex items-center gap-4">
      <CompetitionBadge competition={competition} size={56} className="rounded-xl" />
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold tracking-tight">{competition.name}</h1>
        <p className="text-sm text-muted">{[competition.country, seasonLabel, round].filter(Boolean).join(' · ')}</p>
      </div>
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
  const { query, live, upcoming, results } = useFixtureBuckets(id)
  const standings = useStandings(id)
  const scorers = useTopPlayers(id, 'goals')
  const leader = standings.data?.[0]?.rows[0]

  if (query.isPending) return <BlockSkeleton rows={6} />
  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />

  return (
    <div className="space-y-5">
      {leader && (
        <Section title="Tabellenführer">
          <Card>
            <Link to={`/team/${leader.team.id}`} className="flex items-center gap-3">
              <TeamLogo team={leader.team} size={40} />
              <span className="flex-1 font-semibold">{leader.team.name}</span>
              <span className="text-right">
                <span className="block text-xl font-bold tabular-nums">{leader.points}</span>
                <span className="text-xs text-muted">Punkte</span>
              </span>
            </Link>
          </Card>
        </Section>
      )}
      <FixtureList title="Live" fixtures={live} />
      <FixtureList title="Nächste Spiele" fixtures={upcoming.slice(0, 4)} />
      <FixtureList title="Letzte Ergebnisse" fixtures={results.slice(0, 4)} />
      {scorers.data && scorers.data.length > 0 && (
        <Section title="Top-Torschützen">
          <TopPlayersList entries={scorers.data.slice(0, 3)} />
        </Section>
      )}
      {!leader && live.length + upcoming.length + results.length === 0 && (
        <EmptyState icon={CalendarX2} title="Keine Daten" description="Für diesen Wettbewerb liegen aktuell keine Spiele vor." />
      )}
    </div>
  )
}

function Matches({ id }: { id: Id }) {
  const { query, live, upcoming, results } = useFixtureBuckets(id)
  if (query.isPending) return <BlockSkeleton rows={8} />
  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  if (live.length + upcoming.length + results.length === 0) {
    return <EmptyState icon={CalendarX2} title="Keine Spiele" description="Für diesen Wettbewerb sind aktuell keine Spiele angesetzt." />
  }
  return (
    <div className="space-y-5">
      <FixtureList title="Live" fixtures={live} />
      <FixtureList title="Kommende Spiele" fixtures={upcoming.slice(0, 20)} />
      <FixtureList title="Ergebnisse" fixtures={results.slice(0, 20)} />
    </div>
  )
}

function TableTab({ id }: { id: Id }) {
  const { data, isPending, error, refetch } = useStandings(id)
  if (isPending) return <BlockSkeleton rows={8} />
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />
  if (!data.length) return <EmptyState icon={Table2} title="Keine Tabelle" description="Für diesen Wettbewerb ist keine Tabelle verfügbar." />
  return (
    <div className="space-y-4">
      {data.map((t, i) => (
        <StandingsTable key={t.groupName ?? i} table={t} />
      ))}
    </div>
  )
}

const CATEGORIES = Object.entries(TOP_CATEGORY_LABELS).map(([id, label]) => ({ id: id as TopPlayerCategory, label }))

function Stats({ id }: { id: Id }) {
  const [category, setCategory] = useState<TopPlayerCategory>('goals')
  const { data, isPending, error, refetch } = useTopPlayers(id, category)
  return (
    <div className="space-y-4">
      <Chips options={CATEGORIES} active={category} onChange={setCategory} />
      {isPending ? (
        <BlockSkeleton rows={6} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data.length === 0 ? (
        <EmptyState title="Keine Daten" description="Für diese Kategorie liegen noch keine Werte vor." />
      ) : (
        <TopPlayersList entries={data} />
      )}
    </div>
  )
}

function Teams({ id }: { id: Id }) {
  const { data, isPending, error, refetch } = useCompetitionTeams(id)
  if (isPending) return <BlockSkeleton rows={6} />
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />
  if (data.length === 0) return <EmptyState icon={Users} title="Keine Teams" description="Für diesen Wettbewerb sind keine Teams hinterlegt." />
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
  const { id = '' } = useParams()
  const { data, isPending, error, refetch } = useCompetition(id)
  const [tab, setTab] = useTabParam(TABS)

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
          <TabBar tabs={TABS} active={tab} onChange={setTab} />
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
