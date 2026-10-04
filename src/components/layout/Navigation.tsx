import clsx from 'clsx'
import { Star } from 'lucide-react'
import { NavLink, useLocation } from 'react-router'
import { useCompetitions } from '../../data/queries'
import { favoriteIds, useFavorites } from '../../features/favorites/store'
import { useT } from '../../i18n'
import { CompetitionBadge } from '../media/CompetitionBadge'
import { LanguageSwitch } from './LanguageSwitch'
import { NAV_ITEMS } from './navItems'

/** "/" soll bei Match-Seiten (vom Spiele-Tab aus erreicht) aktiv bleiben */
function useIsActive() {
  const { pathname } = useLocation()
  return (to: string) => {
    if (to === '/') return pathname === '/' || pathname.startsWith('/match')
    if (to === '/competitions') return pathname.startsWith('/competition') || pathname.startsWith('/team') || pathname.startsWith('/player')
    return pathname.startsWith(to)
  }
}

/** Smartphone: feste Leiste unten */
export function BottomNav() {
  const t = useT()
  const isActive = useIsActive()
  return (
    <nav
      aria-label={t('nav.main')}
      className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/90 backdrop-blur-lg md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => {
          const active = isActive(to)
          return (
            <li key={to}>
              <NavLink
                to={to}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[10.5px] font-semibold',
                  active ? 'text-brand' : 'text-subtle',
                )}
              >
                <Icon className="size-[22px]" strokeWidth={active ? 2.4 : 2} aria-hidden />
                {t(labelKey)}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** Tablet: schmale Icon-Leiste; Desktop: breite Seitenleiste mit Wettbewerben (Favoriten zuerst) */
export function SideNav() {
  const t = useT()
  const isActive = useIsActive()
  const { data: competitions } = useCompetitions()
  const favorites = favoriteIds(useFavorites(), 'competition')
  const sorted = competitions && competitions.filter((c) => !c.hidden).sort((a, b) => Number(favorites.has(b.id)) - Number(favorites.has(a.id)))

  return (
    <aside className="sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface md:flex md:w-[92px] xl:w-64">
      <NavLink to="/" className="flex items-center gap-2.5 px-5 py-5 xl:px-6">
        <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="size-9 rounded-xl" />
        <span className="hidden text-lg font-bold tracking-tight xl:inline">{t('app.name')}</span>
      </NavLink>

      <nav aria-label={t('nav.main')} className="px-1.5 xl:px-3">
        <ul className="space-y-1">
          {NAV_ITEMS.filter((i) => !i.mobileOnly).map(({ to, labelKey, icon: Icon }) => {
            const active = isActive(to)
            return (
              <li key={to}>
                <NavLink
                  to={to}
                  aria-current={active ? 'page' : undefined}
                  title={t(labelKey)}
                  className={clsx(
                    'flex flex-col items-center gap-1 rounded-xl px-0.5 py-2.5 text-center text-[10px] leading-tight font-semibold transition-colors xl:flex-row xl:gap-3 xl:px-3 xl:text-left xl:text-[15px]',
                    active ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-surface-2 hover:text-text',
                  )}
                >
                  <Icon className="size-[22px] xl:size-5" aria-hidden />
                  <span className="max-w-full break-words">{t(labelKey)}</span>
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      {sorted && (
        <div className="mt-6 hidden min-h-0 flex-1 flex-col xl:flex">
          <p className="px-6 pb-2 text-xs font-semibold tracking-wide text-subtle uppercase">{t('nav.competitions')}</p>
          <ul className="scrollbar-none min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
            {sorted.map((c) => (
              <li key={c.id}>
                <NavLink
                  to={`/competition/${c.id}`}
                  className={({ isActive: a }) =>
                    clsx(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      a ? 'bg-surface-2 font-semibold text-text' : 'text-muted hover:bg-surface-2 hover:text-text',
                    )
                  }
                >
                  <CompetitionBadge competition={c} size={22} />
                  <span className="flex-1 truncate">{c.shortName}</span>
                  {favorites.has(c.id) && <Star className="size-3.5 text-amber-500" fill="currentColor" aria-hidden />}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-auto hidden border-t border-border p-4 xl:block">
        <LanguageSwitch compact />
      </div>
    </aside>
  )
}
