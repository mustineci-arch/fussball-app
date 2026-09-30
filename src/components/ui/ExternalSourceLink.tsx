import { ExternalLink } from 'lucide-react'
import { useT } from '../../i18n'

const siteName = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** Link zur Originalseite der Datenquelle – öffnet in neuem Tab */
export function ExternalSourceLink({ url }: { url: string }) {
  const t = useT()
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={t('common.openExternalHint')}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5 text-[13px] font-semibold text-brand transition-colors hover:border-brand"
    >
      {t('common.openExternal', { site: siteName(url) })}
      <ExternalLink className="size-3.5" aria-hidden />
    </a>
  )
}
