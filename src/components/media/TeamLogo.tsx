import clsx from 'clsx'
import { memo } from 'react'
import type { Team } from '../../domain/types'
import { useLogoUrl } from './useLogoUrl'

const HUES = [152, 205, 262, 12, 38, 330, 186, 96]

function hueFor(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return HUES[h % HUES.length] ?? 152
}

interface TeamLogoProps {
  team: Pick<Team, 'id' | 'name' | 'code' | 'logoUrl'>
  size?: number
  className?: string
}

/** Vereinslogo – fällt auf ein neutrales Kürzel-Emblem zurück, wenn kein (freigegebenes) Logo vorhanden ist. */
export const TeamLogo = memo(function TeamLogo({ team, size = 24, className }: TeamLogoProps) {
  const { src, onError } = useLogoUrl(team.logoUrl)
  const style = { width: size, height: size }

  if (src) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        style={style}
        onError={onError}
        className={clsx('shrink-0 object-contain', className)}
      />
    )
  }

  const hue = hueFor(team.id)
  const label = (team.code ?? team.name).slice(0, 3).toUpperCase()
  return (
    <span
      aria-hidden
      style={{ ...style, fontSize: Math.max(8, size * 0.32), ['--hue' as string]: hue }}
      className={clsx(
        'grid shrink-0 place-items-center rounded-full border font-bold tracking-tight',
        // Farbton je Team, Helligkeit je nach Design
        'border-[hsl(var(--hue)_45%_80%)] bg-[hsl(var(--hue)_55%_92%)] text-[hsl(var(--hue)_60%_28%)]',
        'dark:border-[hsl(var(--hue)_30%_32%)] dark:bg-[hsl(var(--hue)_30%_20%)] dark:text-[hsl(var(--hue)_60%_80%)]',
        className,
      )}
    >
      {label}
    </span>
  )
})
