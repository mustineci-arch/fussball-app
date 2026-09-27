import { ClipboardList, ListOrdered, Table2 } from 'lucide-react'
import { useParams } from 'react-router'
import { Card, Section } from '../components/ui/Card'
import { BackButton } from '../components/ui/PageHeader'
import { BlockSkeleton, Skeleton } from '../components/ui/Skeleton'
import { EmptyState, ErrorState, StaleNotice } from '../components/ui/States'
import { TabBar, useTabParam } from '../components/ui/Tabs'
import { useCompetitions, useFixtureDetails, useStandings } from '../data/queries'
import { formatDateTime } from '../domain/date'
import type { FixtureDetails } from '../domain/types'
import { StandingsTable } from '../features/competitions/StandingsTable'
import { EventTimeline } from '../features/match-center/EventTimeline'
import { LineupPitch } from '../features/match-center/LineupPitch'
import { MatchHeader } from '../features/match-center/MatchHeader'
import { StatsPanel } from '../features/match-center/StatsPanel'

const TABS = [
  { id: 'overview', label: 'Übersicht' },
  { id: 'lineups', label: 'Aufstellung' },
  { id: 'stats', label: 'Statistik' },
  { id: 'events', label: 'Ereignisse' },
  { id: 'table', label: 'Tabelle' },
] as const

type TabId = (typeof TABS)[number]['id']

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  )
}

function Overview({ details }: { details: FixtureDetails }) {
  const { fixture, events } = details
  return (
    <div className="space-y-5">
      {events && events.length > 0 && (
        <Section title="Wichtige Ereignisse">
          <EventTimeline fixture={fixture} events={events} keyOnly />
        </Section>
      )}
      <Section title="Spielinfo">
        <Card className="py-1">
          <dl className="divide-y divide-border">
            <InfoRow label="Anstoß" value={formatDateTime(fixture.kickoffAt)} />
            <InfoRow label="Runde" value={fixture.round} />
            <InfoRow label="Stadion" value={fixture.venue} />
            <InfoRow label="Schiedsrichter" value={fixture.referee} />
          </dl>
        </Card>
      </Section>
    </div>
  )
}

function TableTab({ details }: { details: FixtureDetails }) {
  const { data, isPending, error, refetch } = useStandings(details.fixture.competitionId)
  if (isPending) return <BlockSkeleton rows={8} />
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />
  if (!data.length) return <EmptyState icon={Table2} title="Keine Tabelle" description="Für diesen Wettbewerb ist keine Tabelle verfügbar." />
  const ids = [details.fixture.homeTeam.id, details.fixture.awayTeam.id]
  return (
    <div className="space-y-4">
      {data.map((t, i) => (
        <StandingsTable key={t.groupName ?? i} table={t} highlightTeamIds={ids} />
      ))}
    </div>
  )
}

function TabContent({ tab, details }: { tab: TabId; details: FixtureDetails }) {
  const { fixture } = details
  switch (tab) {
    case 'overview':
      return <Overview details={details} />
    case 'lineups':
      return details.lineups && (details.lineups.home || details.lineups.away) ? (
        <LineupPitch homeTeam={fixture.homeTeam} awayTeam={fixture.awayTeam} home={details.lineups.home} away={details.lineups.away} />
      ) : (
        <EmptyState
          icon={ClipboardList}
          title="Aufstellung noch nicht verfügbar"
          description="Die offizielle Aufstellung erscheint automatisch, sobald sie veröffentlicht ist – meist etwa eine Stunde vor Anpfiff."
        />
      )
    case 'stats':
      return details.statistics?.length ? (
        <StatsPanel statistics={details.statistics} />
      ) : (
        <EmptyState icon={ListOrdered} title="Keine Statistiken verfügbar" description="Statistiken gibt es, sobald das Spiel läuft – sofern die Datenquelle sie liefert." />
      )
    case 'events':
      return details.events?.length ? (
        <EventTimeline fixture={fixture} events={details.events} />
      ) : (
        <EmptyState icon={ListOrdered} title="Noch keine Ereignisse" description="Tore, Karten und Wechsel erscheinen hier während des Spiels." />
      )
    case 'table':
      return <TableTab details={details} />
  }
}

export default function MatchCenterPage() {
  const { id = '' } = useParams()
  const { data, isPending, error, refetch, isRefetchError } = useFixtureDetails(id)
  const { data: competitions } = useCompetitions()
  const [tab, setTab] = useTabParam(TABS)

  return (
    <div className="space-y-4">
      <BackButton />
      {isPending ? (
        <>
          <Skeleton className="h-44 w-full rounded-2xl" />
          <BlockSkeleton />
        </>
      ) : error && !data ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <>
          <MatchHeader fixture={data.fixture} competition={competitions?.find((c) => c.id === data.fixture.competitionId)} />
          <StaleNotice show={isRefetchError} />
          <TabBar tabs={TABS} active={tab} onChange={setTab} />
          <TabContent tab={tab} details={data} />
        </>
      )}
    </div>
  )
}
