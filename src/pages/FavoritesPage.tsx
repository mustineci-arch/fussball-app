import { Star } from 'lucide-react'
import { PageTitle } from '../components/ui/PageHeader'
import { EmptyState } from '../components/ui/States'

/** Favoriten folgen in Phase 6 (lokal im Browser gespeichert, ohne Konto). */
export default function FavoritesPage() {
  return (
    <div className="space-y-5">
      <PageTitle>Favoriten</PageTitle>
      <EmptyState
        icon={Star}
        title="Noch keine Favoriten"
        description="Bald kannst du hier Teams, Wettbewerbe und Spiele mit dem Stern markieren. Sie erscheinen dann auch oben auf der Startseite."
      />
    </div>
  )
}
