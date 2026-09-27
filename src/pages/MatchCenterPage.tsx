import { ClipboardList, ListOrdered, Table2 } from 'lucide-react'
import { useParams } from 'react-router'
import { Card, Section } from '../components/ui/Card'
import { BackButton } from '../components/ui/PageHeader'
import { BlockSkeleton, Skeleton } from '../components/ui/Skeleton'
import { EmptyState, ErrorState, StaleNotice } from '../components/ui/States'
import { TabBar, useTabParam } from '../components/ui/Tabs'
import { useCompetitions, useFixtureDetails, usePlayersPhotos, useSquad, useStandings } from '../data/queries'
import { formatDateTime } from '../domain/date'
import type { FixtureDetails } from '../domain/types'
import { StandingsTable } from '../features/competitions/StandingsTable'
import { EventTimeline } from '../features/match-center/EventTimeline'
import { LineupPitch } from '../features/match-center/LineupPitch'
import { MatchHeader } from '../features/match-center/MatchHeader'
import { StatsPanel } from '../features/match-center/StatsPanel'
import { useT } from '../i18n'
import { PhotoCredits } from '../media/PhotoCredit'
import { TvSection } from '../tv/TvSection'

const TAB_IDS = ['overview', 'lineups', 'stats', 'events', 'table'] as const
type TabId = (typeof TAB_IDS)[number]

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
  const t = useT()
  const { fixture, events } = details
  return (
    <div className="space-y-5">
      {events && events.length > 0 && (
        <Section title={t('match.keyEvents')}>
          <EventTimeline fixture={fixture} events={events} keyOnly />
        </Section>
      )}
      <Section title={t('match.info')}>
        <Card className="py-1">
          <dl className="divide-y divide-border">
            <InfoRow label={t('match.kickoff')} value={formatDateTime(fixture.kickoffAt)} />
            <InfoRow label={t('match.round')} value={fixture.round} />
            <InfoRow label={t('match.venue')} value={fixture.venue} />
            <InfoRow label={t('match.referee')} value={fixture.referee} />
          </dl>
        </Card>
      </Section>
      <TvSection fixture={fixture} />
    </div>
  )
}

function TableTab({ details }: { details: FixtureDetails }) {
  const t = useT()
  const { data, isPending, error, refetch } = useStandings(details.fixture.competitionId)
  if (isPending) return <BlockSkeleton rows={8} />
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />
  if (!data.length) return <EmptyState icon={Table2} title={t('table.noneTitle')} description={t('table.noneText')} />
  const ids = [details.fixture.homeTeam.id, details.fixture.awayTeam.id]
  return (
    <div className="space-y-4">
      {data.map((table, i) => (
        <StandingsTable key={table.groupName ?? i} table={table} highlightTeamIds={ids} />
      ))}
    </div>
  )
}

/** Aufstellung mit Fotos. Geburtsdaten kommen aus den Kadern – nötig für die sichere Foto-Zuordnung. */
function LineupsTab({ details }: { details: FixtureDetails }) {
  const { fixture, lineups } = details
  const homeSquad = useSquad(fixture.homeTeam.id)
  const awaySquad = useSquad(fixture.awayTeam.id)
  const squadsSettled = !homeSquad.isPending && !awaySquad.isPending
  const birthDates = new Map([...(homeSquad.data ?? []), ...(awaySquad.data ?? [])].map((p) => [p.id, p.birthDate]))
  const players = [lineups?.home, lineups?.away].flatMap((l) =>
    l ? [...l.starters, ...l.substitutes].map((e) => ({ id: e.player.id, name: e.player.name, birthDate: birthDates.get(e.player.id) })) : [],
  )
  const { data: photos } = usePlayersPhotos(`lineup:${fixture.id}`, squadsSettled ? players : undefined)
  return (
    <div className="space-y-5">
      <LineupPitch homeTeam={fixture.homeTeam} awayTeam={fixture.awayTeam} home={lineups?.home} away={lineups?.away} photos={photos} />
      {photos && (
        <PhotoCredits
          credits={players.flatMap((p) => {
            const photo = photos[p.id]
            return photo ? [{ subject: p.name, photo }] : []
          })}
        />
      )}
    </div>
  )
}

function TabContent({ tab, details }: { tab: TabId; details: FixtureDetails }) {
  const t = useT()
  const { fixture } = details
  switch (tab) {
    case 'overview':
      return <Overview details={details} />
    case 'lineups':
      return details.lineups && (details.lineups.home || details.lineups.away) ? (
        <LineupsTab details={details} />
      ) : (
        <EmptyState icon={ClipboardList} title={t('match.noLineupTitle')} description={t('match.noLineupText')} />
      )
    case 'stats':
      return details.statistics?.length ? (
        <StatsPanel statistics={details.statistics} />
      ) : (
        <EmptyState icon={ListOrdered} title={t('match.noStatsTitle')} description={t('match.noStatsText')} />
      )
    case 'events':
      return details.events?.length ? (
        <EventTimeline fixture={fixture} events={details.events} />
      ) : (
        <EmptyState icon={ListOrdered} title={t('match.noEventsTitle')} description={t('match.noEventsText')} />
      )
    case 'table':
      return <TableTab details={details} />
  }
}

export default function MatchCenterPage() {
  const t = useT()
  const { id = '' } = useParams()
  const { data, isPending, error, refetch, isRefetchError } = useFixtureDetails(id)
  const { data: competitions } = useCompetitions()
  const tabs = TAB_IDS.map((tab) => ({ id: tab, label: t(`match.tab.${tab}`) }))
  const [tab, setTab] = useTabParam(tabs)

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
          <TabBar tabs={tabs} active={tab} onChange={setTab} />
          <TabContent tab={tab} details={data} />
        </>
      )}
    </div>
  )
}
