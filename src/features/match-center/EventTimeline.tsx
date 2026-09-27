import clsx from 'clsx'
import { Link } from 'react-router'
import { Card } from '../../components/ui/Card'
import type { Fixture, MatchEvent } from '../../domain/types'
import { useT } from '../../i18n'
import { EventIcon } from './EventIcon'

const formatEventMinute = (e: MatchEvent) => (e.extraMinute ? `${e.minute}+${e.extraMinute}'` : `${e.minute}'`)

function PlayerLink({ player, className }: { player?: MatchEvent['player']; className?: string }) {
  if (!player) return null
  return (
    <Link to={`/player/${player.id}`} className={clsx('hover:underline', className)}>
      {player.name}
    </Link>
  )
}

function EventText({ event }: { event: MatchEvent }) {
  const t = useT()
  if (event.type === 'substitution') {
    return (
      <span className="flex flex-col">
        <span className="font-medium text-brand">
          <PlayerLink player={event.player} />
        </span>
        {event.relatedPlayer && (
          <span className="text-xs text-muted">
            {t('match.for')} <PlayerLink player={event.relatedPlayer} />
          </span>
        )}
      </span>
    )
  }
  const details = [
    event.player ? t(`event.${event.type}`) : undefined,
    event.qualifier ? t(`event.qualifier.${event.qualifier}`) : undefined,
    event.detail,
  ].filter(Boolean)
  return (
    <span className="flex flex-col">
      <span className="font-medium">{event.player ? <PlayerLink player={event.player} /> : t(`event.${event.type}`)}</span>
      <span className="text-xs text-muted">
        {details.join(' · ')}
        {event.type === 'goal' && event.relatedPlayer && (
          <>
            {` · ${t('match.assist')} `}
            <PlayerLink player={event.relatedPlayer} />
          </>
        )}
      </span>
    </span>
  )
}

interface EventTimelineProps {
  fixture: Fixture
  events: MatchEvent[]
  /** Nur Tore & Platzverweise (für die Übersicht) */
  keyOnly?: boolean
}

const KEY_TYPES = new Set<MatchEvent['type']>(['goal', 'own_goal', 'penalty_goal', 'red', 'second_yellow'])

/** Chronologische Timeline, Heimteam links, Gastteam rechts. Neueste Ereignisse oben. */
export function EventTimeline({ fixture, events, keyOnly }: EventTimelineProps) {
  const list = (keyOnly ? events.filter((e) => KEY_TYPES.has(e.type)) : events).slice().reverse()
  if (list.length === 0) return null

  return (
    <Card padded={false}>
      <ol className="divide-y divide-border">
        {list.map((event) => {
          const home = event.teamId === fixture.homeTeam.id
          return (
            <li key={event.id} className={clsx('flex items-center gap-3 px-4 py-2.5 text-sm', !home && 'flex-row-reverse text-right')}>
              <span className="w-11 shrink-0 text-center text-xs font-bold text-muted tabular-nums">{formatEventMinute(event)}</span>
              <span className="grid w-5 shrink-0 place-items-center">
                <EventIcon type={event.type} />
              </span>
              <span className="min-w-0 flex-1">
                <EventText event={event} />
              </span>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
