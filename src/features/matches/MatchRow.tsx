import clsx from 'clsx'
import { memo } from 'react'
import { Link } from 'react-router'
import { TeamLogo } from '../../components/media'
import { formatKickoff } from '../../domain/date'
import { formatMinute, isFinished, isLive, statusLabel } from '../../domain/status'
import type { Fixture } from '../../domain/types'

export function LiveBadge({ fixture, className }: { fixture: Fixture; className?: string }) {
  const minute = formatMinute(fixture)
  return (
    <span className={clsx('inline-flex items-center gap-1 text-xs font-bold text-live', className)}>
      <span className="animate-live size-1.5 rounded-full bg-live" aria-hidden />
      <span className="sr-only">Live, </span>
      {minute ?? 'LIVE'}
    </span>
  )
}

/** Mittlerer Block: Anstoßzeit, Spielstand oder Status */
function ScoreCell({ fixture }: { fixture: Fixture }) {
  const live = isLive(fixture.status)
  if (fixture.score && (live || isFinished(fixture.status))) {
    return (
      <span
        className={clsx(
          'inline-flex min-w-14 justify-center rounded-lg px-2 py-1 text-base font-bold tabular-nums',
          live ? 'bg-live-soft text-live' : 'bg-surface-2 text-text',
        )}
      >
        {fixture.score.home}
        <span className="mx-1 opacity-50">:</span>
        {fixture.score.away}
      </span>
    )
  }
  if (fixture.status === 'scheduled') {
    return <span className="inline-flex min-w-14 justify-center text-[15px] font-semibold tabular-nums">{formatKickoff(fixture.kickoffAt)}</span>
  }
  return <span className="inline-flex min-w-14 justify-center text-xs font-semibold text-muted">{statusLabel(fixture.status)}</span>
}

function StatusCell({ fixture }: { fixture: Fixture }) {
  if (isLive(fixture.status)) return <LiveBadge fixture={fixture} />
  if (isFinished(fixture.status)) {
    return <span className="text-xs font-medium text-subtle">{fixture.status === 'finished' ? 'Ende' : statusLabel(fixture.status)}</span>
  }
  if (fixture.status === 'scheduled') return null
  return <span className="text-xs font-semibold text-live">{statusLabel(fixture.status)}</span>
}

interface MatchRowProps {
  fixture: Fixture
  /** Team hervorheben (z. B. auf der Teamseite) */
  highlightTeamId?: string
}

export const MatchRow = memo(function MatchRow({ fixture, highlightTeamId }: MatchRowProps) {
  const winner =
    isFinished(fixture.status) && fixture.score
      ? fixture.score.home > fixture.score.away
        ? 'home'
        : fixture.score.away > fixture.score.home
          ? 'away'
          : undefined
      : undefined
  const teamClass = (side: 'home' | 'away', id: string) =>
    clsx(
      'truncate text-[15px]',
      winner === side || highlightTeamId === id ? 'font-semibold' : 'font-medium',
      winner && winner !== side && 'text-muted',
    )

  return (
    <Link
      to={`/match/${fixture.id}`}
      className="group grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-3 transition-colors hover:bg-surface-2 sm:gap-3 sm:px-4"
    >
      <span className="flex min-w-0 items-center justify-end gap-2 text-right">
        <span className={teamClass('home', fixture.homeTeam.id)}>{fixture.homeTeam.shortName}</span>
        <TeamLogo team={fixture.homeTeam} size={24} />
      </span>
      <span className="flex flex-col items-center gap-0.5">
        <ScoreCell fixture={fixture} />
        <StatusCell fixture={fixture} />
      </span>
      <span className="flex min-w-0 items-center gap-2">
        <TeamLogo team={fixture.awayTeam} size={24} />
        <span className={teamClass('away', fixture.awayTeam.id)}>{fixture.awayTeam.shortName}</span>
      </span>
    </Link>
  )
})
