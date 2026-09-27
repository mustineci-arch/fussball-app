import { Search } from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'
import { Link, Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router'
import { provider } from '../../providers'
import { MatchListSkeleton } from '../ui/Skeleton'
import { BottomNav, SideNav } from './Navigation'
import { RightRail } from './RightRail'

/** Smartphone-Kopfzeile mit App-Name und Such-Symbol */
function MobileTopBar() {
  return (
    <header className="pt-safe sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur-lg md:hidden">
      <div className="flex h-13 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="size-7 rounded-lg" />
          <span className="text-[17px] font-bold tracking-tight">Anstoß</span>
        </Link>
        <Link to="/search" aria-label="Suche" className="grid size-9 place-items-center rounded-full text-muted hover:bg-surface-3">
          <Search className="size-5" />
        </Link>
      </div>
    </header>
  )
}

/** Tablet/Desktop: Suchfeld oben im Hauptbereich */
function DesktopSearchBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!pathname.startsWith('/search')) setQ('')
  }, [pathname])

  return (
    <div className="sticky top-0 z-20 hidden border-b border-border bg-bg/85 backdrop-blur-lg md:block">
      <form
        role="search"
        className="mx-auto flex max-w-3xl items-center px-6 py-3"
        onSubmit={(e) => {
          e.preventDefault()
          navigate(`/search?q=${encodeURIComponent(q)}`)
        }}
      >
        <label className="flex h-10 flex-1 items-center gap-2.5 rounded-full border border-border bg-surface px-4 focus-within:border-brand">
          <Search className="size-4 text-subtle" aria-hidden />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              navigate(`/search?q=${encodeURIComponent(e.target.value)}`, { replace: pathname.startsWith('/search') })
            }}
            placeholder="Teams, Spieler, Wettbewerbe suchen"
            aria-label="Suche"
            className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-subtle"
          />
        </label>
      </form>
    </div>
  )
}

function DemoBanner() {
  if (!provider.isDemo) return null
  return (
    <p className="rounded-xl border border-dashed border-border bg-surface-2 px-3 py-2 text-xs text-muted">
      <strong className="font-semibold text-text">Demo-Modus:</strong> Vereine, Spieler und Ergebnisse sind frei erfunden.
      Echte Daten folgen in Phase 2.
    </p>
  )
}

export function AppShell() {
  return (
    <div className="flex min-h-dvh">
      <SideNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar />
        <DesktopSearchBar />
        <div className="mx-auto flex w-full max-w-[1200px] flex-1 gap-8 md:px-6">
          <main className="mx-auto min-w-0 flex-1 px-4 pt-4 pb-28 md:px-0 md:pt-6 md:pb-12 xl:max-w-3xl">
            <div className="mb-4">
              <DemoBanner />
            </div>
            <Suspense fallback={<MatchListSkeleton />}>
              <Outlet />
            </Suspense>
          </main>
          <RightRail />
        </div>
      </div>
      <BottomNav />
      <ScrollRestoration />
    </div>
  )
}
