import { CalendarX2, Table2, Users } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { PlayerAvatar, TeamLogo } from '../components/media'
import { Card, Section } from '../components/ui/Card'
import { BackButton } from '../components/ui/PageHeader'
import { BlockSkeleton, Skeleton } from '../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../components/ui/States'
import { TabBar, useTabParam } from '../components/ui/Tabs'
import { useCompetitions, usePlayersPhotos, useSquad, useStandings, useTeam, useTeamFixtures, useTopPlayers } from '../data/queries'
import { POSITION_ORDER } from '../domain/labels'
import { isFinished, isLive, isUpcoming } from '../domain/status'
import type { Fixture, FormResult, Id, Team } from '../domain/types'
import { FormStrip, StandingsTable } from '../features/competitions/StandingsTable'
import { FavoriteButton } from '../features/favorites/FavoriteButton'
import { favoriteFromTeam } from '../features/favorites/store'
import { FixtureList } from '../features/matches/FixtureList'
import { useT, type MessageKey } from '../i18n'
import { PhotoCredits } from '../media/PhotoCredit'

const TAB_IDS = ['overview', 'matches', 'squad', 'table', 'stats'] as const

function resultFor(f: Fixture, teamId: Id): FormResult | undefined {
  if (!f.score || !isFinished(f.status)) return undefined
  const [own, other] = f.homeTeam.id === teamId ? [f.score.home, f.score.away] : [f.score.away, f.score.home]
  return own > other ? 'W' : own === other ? 'D' : 'L'
}

function Header({ team, leagueId }: { team: Team; leagueId?: Id }) {
  const t = useT()
  const { data: competitions } = useCompetitions()
  const league = competitions?.find((c) => c.id === leagueId)
  const facts: { label: string; value?: string; to?: string }[] = [
    { label: t('team.country'), value: team.country },
    { label: t('team.league'), value: league?.name ?? team.league, to: leagueId && `/competition/${leagueId}` },
    { label: t('team.venue'), value: team.venue },
    { label: t('team.coach'), value: team.coach },
  ]
  const visible = facts.filter((f) => f.value)

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-4">
        <TeamLogo team={team} size={64} />
        <h1 className="flex-1 text-2xl font-bold tracking-tight">{team.name}</h1>
        <FavoriteButton entry={favoriteFromTeam(team)} />
      </div>
      {visible.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm md:grid-cols-4">
          {visible.map((f) => (
            <div key={f.label} className="min-w-0">
              <dt className="text-xs text-muted">{f.label}</dt>
              <dd className="truncate font-medium">
                {f.to ? (
                  <Link to={f.to} className="hover:text-brand">
                    {f.value}
                  </Link>
                ) : (
                  f.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  )
}

function useTeamData(teamId: Id, leagueId?: Id) {
  const fixtures = useTeamFixtures(teamId)
  const standings = useStandings(leagueId ?? '')
  const all = fixtures.data ?? []
  const row = standings.data?.flatMap((table) => table.rows).find((r) => r.team.id === teamId)
  return {
    fixtures,
    live: all.filter((f) => isLive(f.status)),
    upcoming: all.filter((f) => isUpcoming(f.status)),
    results: all.filter((f) => isFinished(f.status)).reverse(),
    row,
    standings,
  }
}

function StatTile({ label, value }: { label: string; value?: number | string }) {
  return (
    <Card className="text-center">
      <p className="text-2xl font-bold tabular-nums">{value ?? '–'}</p>
      <p className="text-xs text-muted">{label}</p>
    </Card>
  )
}

function Overview({ teamId, leagueId }: { teamId: Id; leagueId?: Id }) {
  const t = useT()
  const { fixtures, live, upcoming, results, row } = useTeamData(teamId, leagueId)
  const scorers = useTopPlayers(leagueId ?? '', 'goals')
  const topScorer = scorers.data?.find((e) => e.team.id === teamId)
  const form = results
    .slice(0, 5)
    .map((f) => resultFor(f, teamId))
    .filter((r): r is FormResult => r !== undefined)
    .reverse()

  if (fixtures.isPending) return <BlockSkeleton rows={6} />
  if (fixtures.error) return <ErrorState error={fixtures.error} onRetry={() => void fixtures.refetch()} />

  return (
    <div className="space-y-5">
      <FixtureList title={t('common.live')} fixtures={live} highlightTeamId={teamId} />
      <FixtureList title={t('team.nextMatch')} fixtures={upcoming.slice(0, 1)} highlightTeamId={teamId} />
      {form.length > 0 && (
        <Section title={t('team.form')}>
          <Card>
            <FormStrip form={form} size="md" />
          </Card>
        </Section>
      )}
      {row && (
        <div className="grid grid-cols-3 gap-3">
          <StatTile label={t('team.position')} value={`${row.rank}.`} />
          <StatTile label={t('team.goals')} value={row.goalsFor} />
          <StatTile label={t('team.goalsAgainst')} value={row.goalsAgainst} />
        </div>
      )}
      {topScorer && (
        <Section title={t('team.topScorer')}>
          <Card>
            <Link to={`/player/${topScorer.player.id}`} className="flex items-center gap-3">
              <PlayerAvatar name={topScorer.player.name} photoUrl={topScorer.player.photoUrl} size={40} />
              <span className="flex-1 font-semibold">{topScorer.player.name}</span>
              <span className="text-xl font-bold tabular-nums">{topScorer.value}</span>
            </Link>
          </Card>
        </Section>
      )}
      <FixtureList title={t('team.lastMatches')} fixtures={results.slice(0, 5)} highlightTeamId={teamId} />
    </div>
  )
}

function Matches({ teamId }: { teamId: Id }) {
  const t = useT()
  const { fixtures, live, upcoming, results } = useTeamData(teamId)
  if (fixtures.isPending) return <BlockSkeleton rows={8} />
  if (fixtures.error) return <ErrorState error={fixtures.error} onRetry={() => void fixtures.refetch()} />
  if (live.length + upcoming.length + results.length === 0) return <EmptyState icon={CalendarX2} title={t('matches.emptyTitle')} />
  return (
    <div className="space-y-5">
      <FixtureList title={t('common.live')} fixtures={live} highlightTeamId={teamId} />
      <FixtureList title={t('competition.upcoming')} fixtures={upcoming} highlightTeamId={teamId} />
      <FixtureList title={t('competition.results')} fixtures={results} highlightTeamId={teamId} />
    </div>
  )
}

function Squad({ teamId }: { teamId: Id }) {
  const t = useT()
  const { data, isPending, error, refetch } = useSquad(teamId)
  const { data: photos } = usePlayersPhotos(`squad:${teamId}`, data)
  if (isPending) return <BlockSkeleton rows={8} />
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />
  if (data.length === 0) return <EmptyState icon={Users} title={t('team.noSquad')} />

  const groups = [
    ...POSITION_ORDER.map((pos) => ({ title: t(`position.${pos}`), players: data.filter((p) => p.position === pos) })),
    { title: t('team.noPosition'), players: data.filter((p) => !p.position) },
  ]
  return (
    <div className="space-y-5">
      {groups
        .filter((g) => g.players.length > 0)
        .map((g) => (
          <Section key={g.title} title={g.title}>
            <Card padded={false} className="grid divide-y divide-border overflow-hidden sm:grid-cols-2 sm:divide-y-0 sm:[&>*]:border-b sm:[&>*]:border-border">
              {g.players.map((p) => (
                <Link key={p.id} to={`/player/${p.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2">
                  <PlayerAvatar name={p.name} photoUrl={photos?.[p.id]?.url ?? p.photoUrl} shirtNumber={p.shirtNumber} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{p.name}</span>
                    <span className="text-xs text-muted">
                      {[p.position && t(`position.${p.position}`), p.nationality].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </Link>
              ))}
            </Card>
          </Section>
        ))}
      {photos && (
        <PhotoCredits
          credits={data.flatMap((p) => {
            const photo = photos[p.id]
            return photo ? [{ subject: p.name, photo }] : []
          })}
        />
      )}
    </div>
  )
}

function TableTab({ teamId, leagueId }: { teamId: Id; leagueId?: Id }) {
  const t = useT()
  const { standings } = useTeamData(teamId, leagueId)
  if (!leagueId) return <EmptyState icon={Table2} title={t('table.noneTitle')} />
  if (standings.isPending) return <BlockSkeleton rows={8} />
  if (standings.error) return <ErrorState error={standings.error} onRetry={() => void standings.refetch()} />
  if (!standings.data.length) return <EmptyState icon={Table2} title={t('table.noneTitle')} description={t('table.noneText')} />
  return (
    <div className="space-y-4">
      {standings.data.map((table, i) => (
        <StandingsTable key={table.groupName ?? i} table={table} highlightTeamIds={[teamId]} />
      ))}
    </div>
  )
}

const STAT_TILES: readonly [MessageKey, (r: NonNullable<ReturnType<typeof useTeamData>['row']>) => number][] = [
  ['team.stat.played', (r) => r.played],
  ['team.stat.won', (r) => r.won],
  ['team.stat.drawn', (r) => r.drawn],
  ['team.stat.lost', (r) => r.lost],
  ['team.stat.goalsFor', (r) => r.goalsFor],
  ['team.stat.goalsAgainst', (r) => r.goalsAgainst],
  ['team.stat.diff', (r) => r.goalsFor - r.goalsAgainst],
  ['team.stat.points', (r) => r.points],
]

function Stats({ teamId, leagueId }: { teamId: Id; leagueId?: Id }) {
  const t = useT()
  const { row, standings } = useTeamData(teamId, leagueId)
  if (leagueId && standings.isPending) return <BlockSkeleton rows={4} />
  if (!row) return <EmptyState title={t('team.noStats')} />
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {STAT_TILES.map(([key, value]) => (
        <StatTile key={key} label={t(key)} value={value(row)} />
      ))}
    </div>
  )
}

export default function TeamPage() {
  const t = useT()
  const { id = '' } = useParams()
  const { data, isPending, error, refetch } = useTeam(id)
  const tabs = TAB_IDS.map((tab) => ({ id: tab, label: t(`team.tab.${tab}`) }))
  const [tab, setTab] = useTabParam(tabs)
  const leagueId = data?.competitionIds[0]

  return (
    <div className="space-y-4">
      <BackButton />
      {isPending ? (
        <Skeleton className="h-36 w-full rounded-2xl" />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <>
          <Header team={data.team} leagueId={leagueId} />
          <TabBar tabs={tabs} active={tab} onChange={setTab} />
          {tab === 'overview' && <Overview teamId={id} leagueId={leagueId} />}
          {tab === 'matches' && <Matches teamId={id} />}
          {tab === 'squad' && <Squad teamId={id} />}
          {tab === 'table' && <TableTab teamId={id} leagueId={leagueId} />}
          {tab === 'stats' && <Stats teamId={id} leagueId={leagueId} />}
        </>
      )}
    </div>
  )
}
