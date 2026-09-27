import clsx from 'clsx'
import { ArrowLeftRight, CircleSlash, MonitorPlay } from 'lucide-react'
import type { MatchEventType } from '../../domain/types'

const Card = ({ color, second }: { color: string; second?: boolean }) => (
  <span className="relative inline-block h-4 w-3" aria-hidden>
    {second && <span className="absolute top-0 left-0 h-3.5 w-2.5 rounded-[2px] bg-yellow-400" />}
    <span className={clsx('absolute right-0 bottom-0 h-3.5 w-2.5 rounded-[2px]', color)} />
  </span>
)

export function EventIcon({ type }: { type: MatchEventType }) {
  switch (type) {
    case 'goal':
    case 'penalty_goal':
      return <span aria-hidden>⚽</span>
    case 'own_goal':
      return (
        <span aria-hidden className="grayscale">
          ⚽
        </span>
      )
    case 'penalty_missed':
      return <CircleSlash className="size-4 text-live" aria-hidden />
    case 'yellow':
      return <Card color="bg-yellow-400" />
    case 'second_yellow':
      return <Card color="bg-red-600" second />
    case 'red':
      return <Card color="bg-red-600" />
    case 'substitution':
      return <ArrowLeftRight className="size-4 text-brand" aria-hidden />
    case 'var':
      return <MonitorPlay className="size-4 text-muted" aria-hidden />
  }
}
