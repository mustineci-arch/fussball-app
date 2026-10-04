import { Link } from 'react-router'
import { PlayerAvatar, TeamLogo } from '../../components/media'
import { Card, Section } from '../../components/ui/Card'
import { rateLineup, type RatedPlayer } from '../../domain/rating'
import type { FixtureDetails, PlayerMatchStats, Team } from '../../domain/types'
import { useT, type MessageKey } from '../../i18n'
import type { PlayerPhoto } from '../../media/wikimedia'
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

function TeamRatings({ team, rated, bestId, photos }: { team: Team; rated: RatedPlayer[]; bestId?: string; photos: Photos }) {
  const t = useT()
  if (rated.length === 0) return null
  return (
    <Section title={team.name}>
      <Card padded={false} className="divide-y divide-border overflow-hidden">
        {rated.map(({ entry, rating, starter }) => (
          <Link key={entry.player.id} to={`/player/${entry.player.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2">
            <PlayerAvatar name={entry.player.name} photoUrl={photos?.[entry.player.id]?.url ?? entry.player.photoUrl} shirtNumber={entry.shirtNumber} size={36} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{entry.player.name}</span>
              <span className="flex flex-wrap gap-x-2">
                <span className="text-xs text-muted">
                  {[entry.player.position && t(`position.${entry.player.position}`), !starter && t('ratings.subbedIn')].filter(Boolean).join(' · ')}
                </span>
                <StatLine stats={entry.stats} />
              </span>
            </span>
            <RatingBadge rating={rating} best={entry.player.id === bestId} className="text-sm" />
          </Link>
        ))}
      </Card>
    </Section>
  )
}

export function PlayerRatings({ details, photos }: { details: FixtureDetails; photos?: Photos }) {
  const t = useT()
  const { fixture, lineups } = details
  const score = fixture.score
  const home = rateLineup(lineups?.home, score?.home, score?.away)
  const away = rateLineup(lineups?.away, score?.away, score?.home)
  const best = [...home, ...away].sort((a, b) => b.rating - a.rating)[0]

  return (
    <div className="space-y-5">
      {best && (
        <Card className="flex items-center gap-3">
          <PlayerAvatar name={best.entry.player.name} photoUrl={photos?.[best.entry.player.id]?.url} size={48} />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold tracking-wide text-muted uppercase">{t('ratings.best')}</span>
            <Link to={`/player/${best.entry.player.id}`} className="block truncate font-bold hover:text-brand">
              {best.entry.player.name}
            </Link>
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <TeamLogo team={home.includes(best) ? fixture.homeTeam : fixture.awayTeam} size={14} />
              {(home.includes(best) ? fixture.homeTeam : fixture.awayTeam).shortName}
            </span>
          </span>
          <RatingBadge rating={best.rating} className="px-2 py-1 text-base" />
        </Card>
      )}
      <TeamRatings team={fixture.homeTeam} rated={home} bestId={best?.entry.player.id} photos={photos} />
      <TeamRatings team={fixture.awayTeam} rated={away} bestId={best?.entry.player.id} photos={photos} />
      <p className="text-xs text-muted">{t('ratings.note')}</p>
    </div>
  )
}

/** true, wenn für mindestens einen Spieler Einzelwerte vorliegen */
export const hasPlayerRatings = (details: FixtureDetails) =>
  rateLineup(details.lineups?.home).length + rateLineup(details.lineups?.away).length > 0
