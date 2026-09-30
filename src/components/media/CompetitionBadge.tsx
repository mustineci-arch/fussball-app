import clsx from 'clsx'
import { memo } from 'react'
import type { Competition } from '../../domain/types'
import { useLogoUrl } from './useLogoUrl'

interface CompetitionBadgeProps {
  competition: Pick<Competition, 'name' | 'shortName' | 'logoUrl' | 'type'>
  size?: number
  className?: string
}

/** Wettbewerbslogo oder neutrales Kürzel */
export const CompetitionBadge = memo(function CompetitionBadge({ competition, size = 24, className }: CompetitionBadgeProps) {
  const { src, onError } = useLogoUrl(competition.logoUrl)
  if (src) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={onError}
        style={{ width: size, height: size }}
        className={clsx('shrink-0 object-contain', className)}
      />
    )
  }
  // Kurze Kürzel (z. B. "U13") vollständig, sonst Anfangsbuchstaben
  const label = (
    competition.shortName.length <= 3
      ? competition.shortName
      : competition.shortName
          .split(/\s+/)
          .map((w) => w[0])
          .join('')
          .slice(0, 3)
  ).toUpperCase()
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.max(8, size * 0.36) }}
      className={clsx(
        'grid shrink-0 place-items-center rounded-md font-bold',
        competition.type === 'league' ? 'bg-brand-soft text-brand' : 'bg-surface-3 text-muted',
        className,
      )}
    >
      {label}
    </span>
  )
})
