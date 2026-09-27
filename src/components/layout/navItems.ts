import type { LucideIcon } from 'lucide-react'
import { CalendarDays, Ellipsis, Search, Star, Trophy } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Auf Desktop ist die Suche im Kopfbereich – kein eigener Menüpunkt nötig */
  mobileOnly?: boolean
}

export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Spiele', icon: CalendarDays },
  { to: '/competitions', label: 'Wettbewerbe', icon: Trophy },
  { to: '/favorites', label: 'Favoriten', icon: Star },
  { to: '/search', label: 'Suche', icon: Search, mobileOnly: true },
  { to: '/more', label: 'Mehr', icon: Ellipsis },
]
