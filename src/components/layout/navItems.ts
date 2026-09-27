import type { LucideIcon } from 'lucide-react'
import { CalendarDays, Ellipsis, Search, Star, Trophy } from 'lucide-react'
import type { MessageKey } from '../../i18n'

export interface NavItem {
  to: string
  labelKey: MessageKey
  icon: LucideIcon
  /** Auf Desktop ist die Suche im Kopfbereich – kein eigener Menüpunkt nötig */
  mobileOnly?: boolean
}

export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', labelKey: 'nav.matches', icon: CalendarDays },
  { to: '/competitions', labelKey: 'nav.competitions', icon: Trophy },
  { to: '/favorites', labelKey: 'nav.favorites', icon: Star },
  { to: '/search', labelKey: 'nav.search', icon: Search, mobileOnly: true },
  { to: '/more', labelKey: 'nav.more', icon: Ellipsis },
]
