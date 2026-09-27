import { MapPinOff } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '../components/ui/States'

export default function NotFoundPage() {
  return (
    <EmptyState
      icon={MapPinOff}
      title="Seite nicht gefunden"
      description="Diese Adresse gibt es nicht."
      action={
        <Link to="/" className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong">
          Zu den Spielen
        </Link>
      }
    />
  )
}
