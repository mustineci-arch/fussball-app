import { Link } from 'react-router'
import { PlayerAvatar, TeamLogo } from '../../components/media'
import { Card, Section } from '../../components/ui/Card'
import type { Fixture, PlayerMatchStats, Team } from '../../domain/types'
import { useT, type MessageKey } from '../../i18n'
import type { PlayerPhoto } from '../../media/wikimedia'
import type { MatchRatings, RatingRow } from './matchRatings'
import { RatingBadge } from './RatingBadge'

type Photos = Record<string, PlayerPhoto | null> | undefined

const STAT_CHIPS: readonly [keyof PlayerMatchStats, MessageKey][] = [
  ['goals', 'ratings.goals'],
  ['assists', 'ratings.assists'],
  ['shotsOnTarget', 'ratings.shotsOnTarget'],
  ['saves', 'ratings.saves'],
  ['yellowCards', 'ratings.yellow'],
  ['redCards', 'ratings.red'],
  ['ownGoals', 'ratings.ownGoals'],
]

function StatLine({ stats }: { stats: PlayerMatchStats | undefined }) {
  const t = useT()
  const parts = STAT_CHIPS.flatMap(([key, label]) => {
    const v = stats?.[key]
    return v ? [`${v} ${t(label)}`] : []
  })
  return parts.length ? <span className="text-xs text-muted">{parts.join(' · ')}</span> : null
}

function PlayerLink({ row, className, children }: { row: RatingRow; className: string; children: React.ReactNode }) {
  return row.playerId ? (
    <Link to={`/player/${row.playerId}`} className={`${className} hover:bg-surface-2`}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  )
}

function TeamRatings({ team, rows, bestKey, photos }: { team: Team; rows: RatingRow[]; bestKey?: string; photos: Photos }) {
  const t = useT()
  if (rows.length === 0) return null
  return (
    <Section title={team.name}>
      <Card padded={false} className="divide-y divide-border overflow-hidden">
        {rows.map((row) => (
          <PlayerLink key={row.key} row={row} className="flex items-center gap-3 px-4 py-2.5">
            <PlayerAvatar name={row.name} photoUrl={row.playerId ? photos?.[row.playerId]?.url : undefined} shirtNumber={row.shirtNumber} size={36} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{row.name}</span>
              <span className="flex flex-wrap gap-x-2">
                <span className="text-xs text-muted">
                  {[row.position && t(`position.${row.position}`), !row.starter && t('ratings.subbedIn')].filter(Boolean).join(' · ')}
                </span>
                <StatLine stats={row.stats} />
              </span>
            </span>
            <RatingBadge rating={row.rating} best={row.key === bestKey} className="text-sm" />
          </PlayerLink>
        ))}
      </Card>
    </Section>
  )
}

export function PlayerRatings({ fixture, ratings, photos }: { fixture: Fixture; ratings: MatchRatings; photos?: Photos }) {
  const t = useT()
  const { home, away, bestKey } = ratings
  const best = [...home, ...away].find((r) => r.key === bestKey)
  const bestTeam = best && home.includes(best) ? fixture.homeTeam : fixture.awayTeam

  return (
    <div className="space-y-5">
      {best && (
        <Card className="flex items-center gap-3">
          <PlayerAvatar name={best.name} photoUrl={best.playerId ? photos?.[best.playerId]?.url : undefined} size={48} />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold tracking-wide text-muted uppercase">{t('ratings.best')}</span>
            {best.playerId ? (
              <Link to={`/player/${best.playerId}`} className="block truncate font-bold hover:text-brand">
                {best.name}
              </Link>
            ) : (
              <span className="block truncate font-bold">{best.name}</span>
            )}
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <TeamLogo team={bestTeam} size={14} />
              {bestTeam.shortName}
            </span>
          </span>
          <RatingBadge rating={best.rating} className="px-2 py-1 text-base" />
        </Card>
      )}
      <TeamRatings team={fixture.homeTeam} rows={home} bestKey={bestKey} photos={photos} />
      <TeamRatings team={fixture.awayTeam} rows={away} bestKey={bestKey} photos={photos} />
      <p className="text-xs text-muted">{t(ratings.source === 'fotmob' ? 'ratings.noteFotmob' : 'ratings.note')}</p>
    </div>
  )
}
