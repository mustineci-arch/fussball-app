import clsx from 'clsx'
import { Link } from 'react-router'
import { CompetitionBadge, TeamLogo } from '../../components/media'
import { Card } from '../../components/ui/Card'
import { formatKickoff, formatLongDate, toDateKey } from '../../domain/date'
import { formatMinute, isFinished, isLive, statusLabel } from '../../domain/status'
import type { Competition, Fixture, Team } from '../../domain/types'

function TeamBlock({ team }: { team: Team }) {
  return (
    <Link to={`/team/${team.id}`} className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center hover:opacity-80">
      <TeamLogo team={team} size={56} />
      <span className="line-clamp-2 text-sm leading-tight font-semibold md:text-base">{team.name}</span>
    </Link>
  )
}

export function MatchHeader({ fixture, competition }: { fixture: Fixture; competition?: Competition }) {
  const live = isLive(fixture.status)
  const finished = isFinished(fixture.status)
  const minute = formatMinute(fixture)

  return (
    <Card className="px-3 pt-3 pb-5 md:px-6">
      {competition && (
        <Link
          to={`/competition/${competition.id}`}
          className="mx-auto mb-4 flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-muted hover:bg-surface-2"
        >
          <CompetitionBadge competition={competition} size={18} />
          {competition.name}
          {fixture.round && <span className="font-normal text-subtle">· {fixture.round}</span>}
        </Link>
      )}

      <div className="flex items-start gap-2">
        <TeamBlock team={fixture.homeTeam} />
        <div className="flex w-28 shrink-0 flex-col items-center pt-2 md:w-36">
          {fixture.score && (live || finished) ? (
            <span className={clsx('text-4xl font-bold tracking-tight tabular-nums md:text-5xl', live && 'text-live')}>
              {fixture.score.home}
              <span className="mx-1.5 opacity-40">:</span>
              {fixture.score.away}
            </span>
          ) : (
            <span className="text-3xl font-bold tabular-nums md:text-4xl">
              {fixture.status === 'scheduled' ? formatKickoff(fixture.kickoffAt) : '– : –'}
            </span>
          )}

          <span className="mt-1.5 text-center text-xs font-semibold">
            {live ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-live-soft px-2.5 py-1 text-live">
                <span className="animate-live size-1.5 rounded-full bg-live" aria-hidden />
                LIVE{minute && ` – ${minute}`}
              </span>
            ) : fixture.status === 'scheduled' ? (
              <span className="text-muted">{formatLongDate(toDateKey(new Date(fixture.kickoffAt)))}</span>
            ) : (
              <span className={finished ? 'text-muted' : 'text-live'}>{statusLabel(fixture.status)}</span>
            )}
          </span>

          {fixture.halftimeScore && (live || finished) && (
            <span className="mt-1 text-[11px] text-subtle">
              HZ {fixture.halftimeScore.home}:{fixture.halftimeScore.away}
            </span>
          )}
        </div>
        <TeamBlock team={fixture.awayTeam} />
      </div>
    </Card>
  )
}
