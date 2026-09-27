import clsx from 'clsx'
import { memo, useState } from 'react'
import type { Team } from '../../domain/types'

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
  const [failed, setFailed] = useState(false)
  const style = { width: size, height: size }

  if (team.logoUrl && !failed) {
    return (
      <img
        src={team.logoUrl}
        alt=""
        loading="lazy"
        decoding="async"
        style={style}
        onError={() => setFailed(true)}
        className={clsx('shrink-0 object-contain', className)}
      />
    )
  }

  const hue = hueFor(team.id)
  const label = (team.code ?? team.name).slice(0, 3).toUpperCase()
  return (
    <span
      aria-hidden
      style={{
        ...style,
        fontSize: Math.max(8, size * 0.32),
        background: `hsl(${hue} 55% 92%)`,
        color: `hsl(${hue} 60% 28%)`,
        borderColor: `hsl(${hue} 45% 80%)`,
      }}
      className={clsx('grid shrink-0 place-items-center rounded-full border font-bold tracking-tight', className)}
    >
      {label}
    </span>
  )
})
