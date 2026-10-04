import clsx from 'clsx'
import { ratingTier, type RatingTier } from '../../domain/rating'

const TIER_STYLES: Record<RatingTier, string> = {
  poor: 'bg-red-600',
  weak: 'bg-orange-500',
  average: 'bg-amber-500',
  good: 'bg-green-600',
  great: 'bg-blue-600',
}

export function RatingBadge({ rating, best, className }: { rating: number; best?: boolean; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex min-w-8 items-center justify-center gap-0.5 rounded-md px-1 py-px text-xs font-bold text-white tabular-nums',
        TIER_STYLES[ratingTier(rating)],
        className,
      )}
    >
      {rating.toFixed(1)}
      {best && <span aria-hidden>★</span>}
    </span>
  )
}
