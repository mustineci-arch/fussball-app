import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useT } from '../../i18n'

/** Zurück-Button: geht in der Historie zurück, sonst zur Startseite. */
export function BackButton() {
  const t = useT()
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'))}
      className="-ml-2 inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-sm font-medium text-muted hover:bg-surface-3 hover:text-text"
    >
      <ChevronLeft className="size-4" aria-hidden /> {t('common.back')}
    </button>
  )
}

export function PageTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">{children}</h1>
      {action}
    </div>
  )
}
