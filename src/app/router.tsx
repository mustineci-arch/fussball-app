import { lazy } from 'react'
import { createBrowserRouter } from 'react-router'
import { AppShell } from '../components/layout/AppShell'
import { RouteError } from './RouteError'

// Code-Splitting: jede Seite wird erst beim ersten Aufruf geladen.
const MatchesPage = lazy(() => import('../pages/MatchesPage'))
const MatchCenterPage = lazy(() => import('../pages/MatchCenterPage'))
const CompetitionsPage = lazy(() => import('../pages/CompetitionsPage'))
const CompetitionPage = lazy(() => import('../pages/CompetitionPage'))
const TeamPage = lazy(() => import('../pages/TeamPage'))
const PlayerPage = lazy(() => import('../pages/PlayerPage'))
const FavoritesPage = lazy(() => import('../pages/FavoritesPage'))
const SearchPage = lazy(() => import('../pages/SearchPage'))
const MorePage = lazy(() => import('../pages/MorePage'))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'))

export const router = createBrowserRouter(
  [
    {
      element: <AppShell />,
      errorElement: <RouteError />,
      children: [
        {
          errorElement: <RouteError />,
          children: [
            { index: true, element: <MatchesPage /> },
            { path: 'match/:id', element: <MatchCenterPage /> },
            { path: 'competitions', element: <CompetitionsPage /> },
            { path: 'competition/:id', element: <CompetitionPage /> },
            { path: 'team/:id', element: <TeamPage /> },
            { path: 'player/:id', element: <PlayerPage /> },
            { path: 'favorites', element: <FavoritesPage /> },
            { path: 'search', element: <SearchPage /> },
            { path: 'more', element: <MorePage /> },
            { path: '*', element: <NotFoundPage /> },
          ],
        },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' },
)
