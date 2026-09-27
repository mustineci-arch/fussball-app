import { Link, useParams } from 'react-router'
import { PlayerAvatar, TeamLogo } from '../components/media'
import { Card, Section } from '../components/ui/Card'
import { BackButton } from '../components/ui/PageHeader'
import { BlockSkeleton, Skeleton } from '../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../components/ui/States'
import { useCompetitions, usePlayer } from '../data/queries'
import { ageFrom, formatBirthDate } from '../domain/date'
import { POSITION_LABELS } from '../domain/labels'
import type { PlayerSeasonStats } from '../domain/types'

const STAT_COLUMNS: readonly { key: keyof PlayerSeasonStats; label: string; title: string }[] = [
  { key: 'appearances', label: 'Sp', title: 'Spiele' },
  { key: 'starts', label: 'SE', title: 'Startelf' },
  { key: 'minutes', label: 'Min', title: 'Spielminuten' },
  { key: 'goals', label: 'T', title: 'Tore' },
  { key: 'assists', label: 'A', title: 'Assists' },
  { key: 'yellowCards', label: 'GK', title: 'Gelbe Karten' },
  { key: 'redCards', label: 'RK', title: 'Rote Karten' },
]

export default function PlayerPage() {
  const { id = '' } = useParams()
  const { data, isPending, error, refetch } = usePlayer(id)
  const { data: competitions } = useCompetitions()

  if (isPending) {
    return (
      <div className="space-y-4">
        <BackButton />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <BlockSkeleton />
      </div>
    )
  }
  if (error) {
    return (
      <div className="space-y-4">
        <BackButton />
        <ErrorState error={error} onRetry={() => void refetch()} />
      </div>
    )
  }

  const { player, team, seasonStats } = data
  const age = player.birthDate ? ageFrom(player.birthDate) : undefined
  const facts = [
    { label: 'Nationalität', value: player.nationality },
    { label: 'Alter', value: age !== undefined ? `${age} Jahre` : undefined },
    { label: 'Geburtsdatum', value: player.birthDate && formatBirthDate(player.birthDate) },
    { label: 'Position', value: player.position && POSITION_LABELS[player.position].singular },
    { label: 'Rückennummer', value: player.shirtNumber?.toString() },
  ]

  return (
    <div className="space-y-5">
      <BackButton />
      <Card className="space-y-5">
        <div className="flex items-center gap-4">
          <PlayerAvatar name={player.name} photoUrl={player.photoUrl} shirtNumber={player.shirtNumber} size={80} />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">{player.name}</h1>
            {team && (
              <Link to={`/team/${team.id}`} className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-brand">
                <TeamLogo team={team} size={18} />
                {team.name}
              </Link>
            )}
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
          {facts.map((f) => (
            <div key={f.label}>
              <dt className="text-xs text-muted">{f.label}</dt>
              <dd className="font-medium">{f.value ?? <span className="text-subtle">nicht verfügbar</span>}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Section title="Saisonstatistiken">
        {seasonStats.length === 0 ? (
          <EmptyState title="Keine Statistiken verfügbar" description="Für diese Saison liegen noch keine Einsätze vor." />
        ) : (
          <Card padded={false} className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] font-semibold tracking-wide text-subtle uppercase">
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left">Wettbewerb</th>
                  {STAT_COLUMNS.map((c) => (
                    <th key={c.key} title={c.title} className="px-2 py-2 text-center">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {seasonStats.map((s, i) => (
                  <tr key={s.competitionId ?? i}>
                    <td className="px-4 py-2.5 font-medium whitespace-nowrap">
                      {competitions?.find((c) => c.id === s.competitionId)?.shortName ?? '–'}
                      {s.seasonLabel && <span className="ml-1.5 text-xs text-subtle">{s.seasonLabel}</span>}
                    </td>
                    {STAT_COLUMNS.map((c) => (
                      <td key={c.key} className="px-2 py-2.5 text-center tabular-nums">
                        {s[c.key] ?? '–'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </Section>
    </div>
  )
}
