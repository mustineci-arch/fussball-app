import clsx from 'clsx'
import { memo, useState } from 'react'
import { initials } from '../../domain/text'

interface PlayerAvatarProps {
  name: string
  /** Nur lizenzierte/freigegebene Bild-URLs übergeben */
  photoUrl?: string
  shirtNumber?: number
  size?: number
  className?: string
}

/**
 * Spielerfoto oder Platzhalter (Initialen + Rückennummer).
 * Das Layout bleibt identisch – egal ob Foto vorhanden ist oder nicht.
 */
export const PlayerAvatar = memo(function PlayerAvatar({ name, photoUrl, shirtNumber, size = 40, className }: PlayerAvatarProps) {
  const [failed, setFailed] = useState(false)
  const showPhoto = photoUrl && !failed

  return (
    <span className={clsx('relative inline-block shrink-0', className)} style={{ width: size, height: size }}>
      {showPhoto ? (
        <img
          src={photoUrl}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="size-full rounded-full bg-surface-3 object-cover object-top"
        />
      ) : (
        <span
          aria-hidden
          className="grid size-full place-items-center rounded-full bg-surface-3 font-semibold text-muted"
          style={{ fontSize: Math.max(9, size * 0.36) }}
        >
          {initials(name)}
        </span>
      )}
      {shirtNumber !== undefined && size >= 32 && (
        <span
          className="absolute -right-1 -bottom-1 grid min-w-5 place-items-center rounded-full border-2 border-surface bg-text px-1 font-bold text-surface"
          style={{ fontSize: Math.max(9, size * 0.24), height: Math.max(18, size * 0.42) }}
        >
          {shirtNumber}
        </span>
      )}
    </span>
  )
})
