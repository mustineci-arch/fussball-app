import { Search as SearchIcon, SearchX } from 'lucide-react'
import { useDeferredValue, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CompetitionBadge, PlayerAvatar, TeamLogo } from '../components/media'
import { Card, Section } from '../components/ui/Card'
import { PageTitle } from '../components/ui/PageHeader'
import { BlockSkeleton } from '../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../components/ui/States'
import { useSearch } from '../data/queries'
import { POSITION_LABELS } from '../domain/labels'
import type { ReactNode } from 'react'

function ResultRow({ to, media, title, subtitle }: { to: string; media: ReactNode; title: string; subtitle?: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2">
      {media}
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{title}</span>
        {subtitle && <span className="block truncate text-xs text-muted">{subtitle}</span>}
      </span>
    </Link>
  )
}

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const deferred = useDeferredValue(query.trim())
  const { data, isFetching, error, refetch } = useSearch(deferred)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auf dem Smartphone direkt tippen können
  useEffect(() => {
    if (window.matchMedia('(max-width: 767px)').matches) inputRef.current?.focus()
  }, [])

  const total = data ? data.teams.length + data.players.length + data.competitions.length : 0

  return (
    <div className="space-y-5">
      <PageTitle>Suche</PageTitle>
      <label className="flex h-12 items-center gap-3 rounded-2xl border border-border bg-surface px-4 shadow-card focus-within:border-brand md:hidden">
        <SearchIcon className="size-5 text-subtle" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          value={query}
          onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })}
          placeholder="Teams, Spieler, Wettbewerbe"
          aria-label="Suchbegriff"
          className="h-full flex-1 bg-transparent text-base outline-none placeholder:text-subtle"
        />
      </label>

      {deferred.length < 2 ? (
        <EmptyState icon={SearchIcon} title="Wonach suchst du?" description="Gib mindestens zwei Buchstaben ein – z. B. einen Verein, Spieler oder Wettbewerb." />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !data && isFetching ? (
        <BlockSkeleton rows={6} />
      ) : total === 0 ? (
        <EmptyState icon={SearchX} title="Keine Treffer" description={`Für „${deferred}“ wurde nichts gefunden.`} />
      ) : (
        data && (
          <div className="space-y-5">
            {data.teams.length > 0 && (
              <Section title="Teams">
                <Card padded={false} className="divide-y divide-border overflow-hidden">
                  {data.teams.map((t) => (
                    <ResultRow key={t.id} to={`/team/${t.id}`} media={<TeamLogo team={t} size={32} />} title={t.name} subtitle={t.country} />
                  ))}
                </Card>
              </Section>
            )}
            {data.players.length > 0 && (
              <Section title="Spieler">
                <Card padded={false} className="divide-y divide-border overflow-hidden">
                  {data.players.map((p) => (
                    <ResultRow
                      key={p.id}
                      to={`/player/${p.id}`}
                      media={<PlayerAvatar name={p.name} photoUrl={p.photoUrl} size={32} />}
                      title={p.name}
                      subtitle={[p.position && POSITION_LABELS[p.position].singular, p.nationality].filter(Boolean).join(' · ')}
                    />
                  ))}
                </Card>
              </Section>
            )}
            {data.competitions.length > 0 && (
              <Section title="Wettbewerbe">
                <Card padded={false} className="divide-y divide-border overflow-hidden">
                  {data.competitions.map((c) => (
                    <ResultRow key={c.id} to={`/competition/${c.id}`} media={<CompetitionBadge competition={c} size={32} />} title={c.name} subtitle={c.country} />
                  ))}
                </Card>
              </Section>
            )}
          </div>
        )
      )}
    </div>
  )
}
