import { MapPinOff } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '../components/ui/States'
import { useT } from '../i18n'

export default function NotFoundPage() {
  const t = useT()
  return (
    <EmptyState
      icon={MapPinOff}
      title={t('state.pageNotFoundTitle')}
      description={t('state.pageNotFoundText')}
      action={
        <Link to="/" className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong">
          {t('state.toMatches')}
        </Link>
      }
    />
  )
}
