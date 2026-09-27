import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { router } from './app/router'
import { subscribeLanguage, useLanguage } from './i18n'
import { NotFoundError } from './providers/errors'
import './styles/index.css'
import './theme'

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

// Namen (Länder, Vereine, Wettbewerbe) hängen von der Sprache ab → bei einem Wechsel neu laden.
subscribeLanguage(() => queryClient.clear())

function App() {
  // Neuaufbau bei Sprachwechsel – so übernehmen auch Datums- und Zahlenformate die neue Sprache.
  const language = useLanguage()
  return <RouterProvider key={language} router={router} />
}

const root = document.getElementById('root')
if (!root) throw new Error('#root fehlt in index.html')

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
