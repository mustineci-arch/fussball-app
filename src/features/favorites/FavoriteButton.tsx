import clsx from 'clsx'
import { Star } from 'lucide-react'
import { useT } from '../../i18n'
import { toggleFavorite, useIsFavorite, type StoredFavorite } from './store'

interface FavoriteButtonProps {
  entry: Omit<StoredFavorite, 'addedAt'>
  className?: string
  size?: 'sm' | 'md'
}

export function FavoriteButton({ entry, className, size = 'md' }: FavoriteButtonProps) {
  const t = useT()
  const active = useIsFavorite(entry.type, entry.id)
  const label = t(active ? 'favorites.remove' : 'favorites.add')
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={(e) => {
        // In verlinkten Zeilen soll der Stern nicht die Seite wechseln
        e.preventDefault()
        e.stopPropagation()
        toggleFavorite(entry)
      }}
      className={clsx(
        'grid shrink-0 place-items-center rounded-full transition-colors hover:bg-surface-3',
        size === 'md' ? 'size-10' : 'size-8',
        active ? 'text-amber-500' : 'text-subtle hover:text-text',
        className,
      )}
    >
      <Star className={size === 'md' ? 'size-5' : 'size-4'} fill={active ? 'currentColor' : 'none'} aria-hidden />
    </button>
  )
}
