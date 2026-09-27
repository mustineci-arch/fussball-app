import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { router } from './app/router'
import { NotFoundError } from './providers/errors'
import './styles/index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // "Nicht gefunden" ist endgültig – nur Netzwerk-/Anbieterfehler erneut versuchen.
      retry: (failureCount, error) => !(error instanceof NotFoundError) && failureCount < 2,
      refetchOnWindowFocus: true,
      // Im Hintergrund (App minimiert) wird nicht gepollt.
      refetchIntervalInBackground: false,
    },
  },
})

const root = document.getElementById('root')
if (!root) throw new Error('#root fehlt in index.html')

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
