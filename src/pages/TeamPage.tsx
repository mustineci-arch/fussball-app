import { CalendarX2, Table2, Users } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { PlayerAvatar, TeamLogo } from '../components/media'
import { Card, Section } from '../components/ui/Card'
import { BackButton } from '../components/ui/PageHeader'
import { BlockSkeleton, Skeleton } from '../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../components/ui/States'
import { TabBar, useTabParam } from '../components/ui/Tabs'
import { useCompetitions, useSquad, useStandings, useTeam, useTeamFixtures, useTopPlayers } from '../data/queries'
import { POSITION_LABELS, POSITION_ORDER } from '../domain/labels'
import { isFinished, isLive, isUpcoming } from '../domain/status'
import type { Fixture, FormResult, Id, Team } from '../domain/types'
import { FormStrip, StandingsTable } from '../features/competitions/StandingsTable'
import { FixtureList } from '../features/matches/FixtureList'

const TABS = [
  { id: 'overview', label: 'Übersicht' },
  { id: 'matches', label: 'Spiele' },
  { id: 'squad', label: 'Kader' },
  { id: 'table', label: 'Tabelle' },
  { id: 'stats', label: 'Statistiken' },
] as const

function resultFor(f: Fixture, teamId: Id): FormResult | undefined {
  if (!f.score || !isFinished(f.status)) return undefined
  const [own, other] = f.homeTeam.id === teamId ? [f.score.home, f.score.away] : [f.score.away, f.score.home]
  return own > other ? 'W' : own === other ? 'D' : 'L'
}

function Header({ team, leagueId }: { team: Team; leagueId?: Id }) {
  const { data: competitions } = useCompetitions()
  const league = competitions?.find((c) => c.id === leagueId)
  const facts = [
    { label: 'Land', value: team.country },
    { label: 'Liga', value: league?.name, to: league && `/competition/${league.id}` },
    { label: 'Stadion', value: team.venue },
    { label: 'Trainer', value: team.coach },
  ].filter((f) => f.value)

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-4">
        <TeamLogo team={team} size={64} />
        <h1 className="text-2xl font-bold tracking-tight">{team.name}</h1>
      </div>
      {facts.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm md:grid-cols-4">
          {facts.map((f) => (
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
  const row = standings.data?.flatMap((t) => t.rows).find((r) => r.team.id === teamId)
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
      <FixtureList title="Live" fixtures={live} highlightTeamId={teamId} />
      <FixtureList title="Nächstes Spiel" fixtures={upcoming.slice(0, 1)} highlightTeamId={teamId} />
      {form.length > 0 && (
        <Section title="Form (letzte 5)">
          <Card>
            <FormStrip form={form} size="md" />
          </Card>
        </Section>
      )}
      {row && (
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Tabellenplatz" value={`${row.rank}.`} />
          <StatTile label="Tore" value={row.goalsFor} />
          <StatTile label="Gegentore" value={row.goalsAgainst} />
        </div>
      )}
      {topScorer && (
        <Section title="Top-Torschütze">
          <Card>
            <Link to={`/player/${topScorer.player.id}`} className="flex items-center gap-3">
              <PlayerAvatar name={topScorer.player.name} photoUrl={topScorer.player.photoUrl} size={40} />
              <span className="flex-1 font-semibold">{topScorer.player.name}</span>
              <span className="text-xl font-bold tabular-nums">{topScorer.value}</span>
            </Link>
          </Card>
        </Section>
      )}
      <FixtureList title="Letzte Spiele" fixtures={results.slice(0, 5)} highlightTeamId={teamId} />
    </div>
  )
}

function Matches({ teamId }: { teamId: Id }) {
  const { fixtures, live, upcoming, results } = useTeamData(teamId)
  if (fixtures.isPending) return <BlockSkeleton rows={8} />
  if (fixtures.error) return <ErrorState error={fixtures.error} onRetry={() => void fixtures.refetch()} />
  if (live.length + upcoming.length + results.length === 0) return <EmptyState icon={CalendarX2} title="Keine Spiele" />
  return (
    <div className="space-y-5">
      <FixtureList title="Live" fixtures={live} highlightTeamId={teamId} />
      <FixtureList title="Kommende Spiele" fixtures={upcoming} highlightTeamId={teamId} />
      <FixtureList title="Ergebnisse" fixtures={results} highlightTeamId={teamId} />
    </div>
  )
}

function Squad({ teamId }: { teamId: Id }) {
  const { data, isPending, error, refetch } = useSquad(teamId)
  if (isPending) return <BlockSkeleton rows={8} />
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />
  if (data.length === 0) return <EmptyState icon={Users} title="Kader nicht verfügbar" />

  const groups = [
    ...POSITION_ORDER.map((pos) => ({ title: POSITION_LABELS[pos].group, players: data.filter((p) => p.position === pos) })),
    { title: 'Ohne Positionsangabe', players: data.filter((p) => !p.position) },
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
                  <PlayerAvatar name={p.name} photoUrl={p.photoUrl} shirtNumber={p.shirtNumber} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{p.name}</span>
                    <span className="text-xs text-muted">
                      {[p.position && POSITION_LABELS[p.position].singular, p.nationality].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </Link>
              ))}
            </Card>
          </Section>
        ))}
    </div>
  )
}

function TableTab({ teamId, leagueId }: { teamId: Id; leagueId?: Id }) {
  const { standings } = useTeamData(teamId, leagueId)
  if (!leagueId) return <EmptyState icon={Table2} title="Keine Tabelle" />
  if (standings.isPending) return <BlockSkeleton rows={8} />
  if (standings.error) return <ErrorState error={standings.error} onRetry={() => void standings.refetch()} />
  if (!standings.data.length) return <EmptyState icon={Table2} title="Keine Tabelle" description="Für diesen Wettbewerb ist keine Tabelle verfügbar." />
  return (
    <div className="space-y-4">
      {standings.data.map((t, i) => (
        <StandingsTable key={t.groupName ?? i} table={t} highlightTeamIds={[teamId]} />
      ))}
    </div>
  )
}

function Stats({ teamId, leagueId }: { teamId: Id; leagueId?: Id }) {
  const { row, standings } = useTeamData(teamId, leagueId)
  if (leagueId && standings.isPending) return <BlockSkeleton rows={4} />
  if (!row) return <EmptyState title="Keine Statistiken verfügbar" />
  const tiles = [
    { label: 'Spiele', value: row.played },
    { label: 'Siege', value: row.won },
    { label: 'Unentschieden', value: row.drawn },
    { label: 'Niederlagen', value: row.lost },
    { label: 'Tore', value: row.goalsFor },
    { label: 'Gegentore', value: row.goalsAgainst },
    { label: 'Tordifferenz', value: row.goalsFor - row.goalsAgainst },
    { label: 'Punkte', value: row.points },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((t) => (
        <StatTile key={t.label} label={t.label} value={t.value} />
      ))}
    </div>
  )
}

export default function TeamPage() {
  const { id = '' } = useParams()
  const { data, isPending, error, refetch } = useTeam(id)
  const [tab, setTab] = useTabParam(TABS)
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
          <TabBar tabs={TABS} active={tab} onChange={setTab} />
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
