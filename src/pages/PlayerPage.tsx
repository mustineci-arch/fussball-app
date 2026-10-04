import { Link, useParams } from 'react-router'
import { PlayerAvatar, TeamLogo } from '../components/media'
import { Card, Section } from '../components/ui/Card'
import { BackButton } from '../components/ui/PageHeader'
import { BlockSkeleton, Skeleton } from '../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../components/ui/States'
import { useCompetitions, usePlayer, usePlayerPhoto, useTeamExtras } from '../data/queries'
import { ageFrom, formatBirthDate, formatDate } from '../domain/date'
import type { PlayerSeasonStats } from '../domain/types'
import { injuryName } from '../features/injuries/injuryNames'
import { returnText } from '../features/injuries/returnText'
import { InjuryStatusBadge } from '../features/injuries/InjuryList'
import { RatingBadge } from '../features/match-center/RatingBadge'
import { useLanguage, useT } from '../i18n'
import { findPlayer } from '../providers/fotmob/fotmob'
import { PhotoCredit } from '../media/PhotoCredit'

type StatColumn = keyof Omit<PlayerSeasonStats, 'competitionId' | 'seasonLabel'>
const STAT_COLUMNS: readonly StatColumn[] = ['appearances', 'starts', 'minutes', 'goals', 'assists', 'yellowCards', 'redCards']

export default function PlayerPage() {
  const t = useT()
  const { id = '' } = useParams()
  const { data, isPending, error, refetch } = usePlayer(id)
  const { data: competitions } = useCompetitions()
  const { data: photo } = usePlayerPhoto(data?.player)
  const { data: extras } = useTeamExtras(data?.team)
  const language = useLanguage()

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
  const fm = extras ? findPlayer(player, extras) : undefined
  const injury = player.injury ?? fm?.injury
  // Nur Spalten zeigen, für die die Datenquelle überhaupt Werte liefert
  const columns = STAT_COLUMNS.filter((c) => seasonStats.some((s) => s[c] !== undefined))
  const age = player.birthDate ? ageFrom(player.birthDate) : undefined
  const facts = [
    { label: t('player.nationality'), value: player.nationality },
    { label: t('player.age'), value: age !== undefined ? t('common.years', { n: age }) : undefined },
    { label: t('player.birthDate'), value: player.birthDate && formatBirthDate(player.birthDate) },
    { label: t('player.position'), value: player.position && t(`position.${player.position}`) },
    { label: t('player.number'), value: player.shirtNumber?.toString() },
  ]

  return (
    <div className="space-y-5">
      <BackButton />
      <Card className="space-y-5">
        <div className="flex items-center gap-4">
          <PlayerAvatar name={player.name} photoUrl={photo?.url ?? player.photoUrl} shirtNumber={player.shirtNumber} size={96} />
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
        {(fm?.seasonRating || injury) && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {fm?.seasonRating && (
              <span className="flex items-center gap-2">
                <RatingBadge rating={fm.seasonRating} className="px-1.5 py-0.5 text-sm" />
                <span className="text-muted">{t('ratings.season')}</span>
              </span>
            )}
            {injury && (
              <span className="flex items-center gap-2">
                <InjuryStatusBadge status={injury.status} />
                <span className="text-muted">
                  {[
                    injuryName(injury.detail, language),
                    returnText(injury.expectedReturnText, language) && t('injury.return', { date: returnText(injury.expectedReturnText, language)! }),
                    injury.since && t('injury.reported', { date: formatDate(injury.since) ?? injury.since }),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
            )}
          </div>
        )}
        {photo && <PhotoCredit photo={photo} />}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
          {facts.map((f) => (
            <div key={f.label}>
              <dt className="text-xs text-muted">{f.label}</dt>
              <dd className="font-medium">{f.value ?? <span className="text-subtle">{t('common.notAvailable')}</span>}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Section title={t('player.seasonStats')}>
        {seasonStats.length === 0 ? (
          <EmptyState title={t('player.noStatsTitle')} description={t('player.noStatsText')} />
        ) : (
          <Card padded={false} className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] font-semibold tracking-wide text-subtle uppercase">
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left">{t('player.competition')}</th>
                  {columns.map((c) => (
                    <th key={c} title={t(`player.col.${c}.title`)} className="px-2 py-2 text-center">
                      {t(`player.col.${c}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {seasonStats.map((s, i) => (
                  <tr key={`${s.competitionId}-${s.seasonLabel}-${i}`}>
                    <td className="px-4 py-2.5 font-medium whitespace-nowrap">
                      {competitions?.find((c) => c.id === s.competitionId)?.shortName ?? t('competition.other')}
                      {s.seasonLabel && <span className="ml-1.5 text-xs text-subtle">{s.seasonLabel}</span>}
                    </td>
                    {columns.map((c) => (
                      <td key={c} className="px-2 py-2.5 text-center tabular-nums">
                        {s[c] ?? '–'}
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
