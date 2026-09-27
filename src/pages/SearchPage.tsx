import { Search as SearchIcon, SearchX } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CompetitionBadge, PlayerAvatar, TeamLogo } from '../components/media'
import { Card, Section } from '../components/ui/Card'
import { PageTitle } from '../components/ui/PageHeader'
import { BlockSkeleton } from '../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../components/ui/States'
import { useSearch } from '../data/queries'
import { useT } from '../i18n'

/** Wartet, bis der Nutzer kurz nicht tippt – spart Anfragen an die Datenquelle. */
function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

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
  const t = useT()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const debounced = useDebounced(query.trim(), 350)
  const { data, isFetching, error, refetch } = useSearch(debounced)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auf dem Smartphone direkt tippen können
  useEffect(() => {
    if (window.matchMedia('(max-width: 767px)').matches) inputRef.current?.focus()
  }, [])

  const total = data ? data.teams.length + data.players.length + data.competitions.length : 0

  return (
    <div className="space-y-5">
      <PageTitle>{t('nav.search')}</PageTitle>
      <label className="flex h-12 items-center gap-3 rounded-2xl border border-border bg-surface px-4 shadow-card focus-within:border-brand md:hidden">
        <SearchIcon className="size-5 text-subtle" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          value={query}
          onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })}
          placeholder={t('search.placeholderShort')}
          aria-label={t('search.inputLabel')}
          className="h-full flex-1 bg-transparent text-base outline-none placeholder:text-subtle"
        />
      </label>

      {debounced.length < 2 ? (
        <EmptyState icon={SearchIcon} title={t('search.promptTitle')} description={t('search.promptText')} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !data && isFetching ? (
        <BlockSkeleton rows={6} />
      ) : total === 0 ? (
        <EmptyState icon={SearchX} title={t('search.noResultsTitle')} description={t('search.noResultsText', { q: debounced })} />
      ) : (
        data && (
          <div className="space-y-5">
            {data.teams.length > 0 && (
              <Section title={t('search.teams')}>
                <Card padded={false} className="divide-y divide-border overflow-hidden">
                  {data.teams.map((team) => (
                    <ResultRow key={team.id} to={`/team/${team.id}`} media={<TeamLogo team={team} size={32} />} title={team.name} subtitle={team.league ?? team.country} />
                  ))}
                </Card>
              </Section>
            )}
            {data.players.length > 0 && (
              <Section title={t('search.players')}>
                <Card padded={false} className="divide-y divide-border overflow-hidden">
                  {data.players.map((p) => (
                    <ResultRow
                      key={p.id}
                      to={`/player/${p.id}`}
                      media={<PlayerAvatar name={p.name} photoUrl={p.photoUrl} size={32} />}
                      title={p.name}
                      subtitle={[p.teamName, p.position && t(`position.${p.position}`), p.nationality].filter(Boolean).join(' · ')}
                    />
                  ))}
                </Card>
              </Section>
            )}
            {data.competitions.length > 0 && (
              <Section title={t('search.competitions')}>
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
