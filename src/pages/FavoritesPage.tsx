import { ChevronRight, Star } from 'lucide-react'
import { Link } from 'react-router'
import { CompetitionBadge, TeamLogo } from '../components/media'
import { Card, Section } from '../components/ui/Card'
import { PageTitle } from '../components/ui/PageHeader'
import { EmptyState } from '../components/ui/States'
import { useFixtureDetails, useTeamFixtures } from '../data/queries'
import { formatDateTime } from '../domain/date'
import { isLive, isUpcoming } from '../domain/status'
import { FavoriteButton } from '../features/favorites/FavoriteButton'
import { useFavorites, type StoredFavorite } from '../features/favorites/store'
import { MatchRow } from '../features/matches/MatchRow'
import { useT } from '../i18n'

/** Team mit laufendem oder nächstem Spiel */
function TeamRow({ favorite }: { favorite: StoredFavorite }) {
  const { data } = useTeamFixtures(favorite.id)
  const current = data?.find((f) => isLive(f.status)) ?? data?.find((f) => isUpcoming(f.status))
  return (
    <div>
      <Link to={`/team/${favorite.id}`} className="flex items-center gap-3 py-2 pr-2 pl-4 hover:bg-surface-2">
        <TeamLogo team={{ id: favorite.id, name: favorite.name, logoUrl: favorite.logoUrl }} size={32} />
        <span className="flex-1 truncate font-semibold">{favorite.name}</span>
        <FavoriteButton entry={favorite} size="sm" />
        <ChevronRight className="size-4 text-subtle" aria-hidden />
      </Link>
      {current && (
        <div className="border-t border-dashed border-border">
          <MatchRow fixture={current} highlightTeamId={favorite.id} />
        </div>
      )}
    </div>
  )
}

/** Favorisiertes Spiel – mit aktuellem Stand, solange es nicht beendet ist */
function MatchFavorite({ favorite }: { favorite: StoredFavorite }) {
  const { data } = useFixtureDetails(favorite.id)
  const snapshot = favorite.match
  return (
    <div className="flex items-center">
      <div className="min-w-0 flex-1">
        {data ? (
          <MatchRow fixture={data.fixture} />
        ) : (
          <Link to={`/match/${favorite.id}`} className="block px-4 py-3 text-sm hover:bg-surface-2">
            <span className="font-semibold">{favorite.name}</span>
            {snapshot && <span className="ml-2 text-muted">{formatDateTime(snapshot.kickoffAt)}</span>}
          </Link>
        )}
      </div>
      <FavoriteButton entry={favorite} size="sm" className="mr-2" />
    </div>
  )
}

export default function FavoritesPage() {
  const t = useT()
  const favorites = useFavorites()
  const teams = favorites.filter((f) => f.type === 'team')
  const competitions = favorites.filter((f) => f.type === 'competition')
  // Spiele: späteste Anstoßzeit zuerst. Beendete bleiben stehen, bis man sie entfernt.
  const matches = favorites
    .filter((f) => f.type === 'match')
    .sort((a, b) => (b.match?.kickoffAt ?? '').localeCompare(a.match?.kickoffAt ?? ''))

  return (
    <div className="space-y-5">
      <PageTitle>{t('favorites.title')}</PageTitle>
      {favorites.length === 0 ? (
        <EmptyState icon={Star} title={t('favorites.emptyTitle')} description={t('favorites.emptyText')} />
      ) : (
        <>
          {teams.length > 0 && (
            <Section title={t('favorites.teams')}>
              <Card padded={false} className="divide-y divide-border overflow-hidden">
                {teams.map((f) => (
                  <TeamRow key={f.id} favorite={f} />
                ))}
              </Card>
            </Section>
          )}
          {competitions.length > 0 && (
            <Section title={t('favorites.competitions')}>
              <Card padded={false} className="divide-y divide-border overflow-hidden">
                {competitions.map((f) => (
                  <Link key={f.id} to={`/competition/${f.id}`} className="flex items-center gap-3 py-2 pr-2 pl-4 hover:bg-surface-2">
                    <CompetitionBadge competition={{ name: f.name, shortName: f.name, logoUrl: f.logoUrl, type: 'league' }} size={32} />
                    <span className="flex-1 truncate font-semibold">{f.name}</span>
                    <FavoriteButton entry={f} size="sm" />
                    <ChevronRight className="size-4 text-subtle" aria-hidden />
                  </Link>
                ))}
              </Card>
            </Section>
          )}
          {matches.length > 0 && (
            <Section title={t('favorites.matches')}>
              <Card padded={false} className="divide-y divide-border overflow-hidden">
                {matches.map((f) => (
                  <MatchFavorite key={f.id} favorite={f} />
                ))}
              </Card>
            </Section>
          )}
          <p className="px-1 text-xs text-muted">{t('favorites.storedLocally')}</p>
        </>
      )}
    </div>
  )
}
