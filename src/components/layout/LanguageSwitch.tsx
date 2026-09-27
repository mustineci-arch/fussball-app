import clsx from 'clsx'
import { LANGUAGES, setLanguage, useLanguage, useT } from '../../i18n'

/** Umschalter Deutsch/Englisch */
export function LanguageSwitch({ compact }: { compact?: boolean }) {
  const t = useT()
  const language = useLanguage()
  return (
    <div role="radiogroup" aria-label={t('more.language')} className="inline-flex rounded-full border border-border bg-surface-2 p-0.5">
      {LANGUAGES.map((l) => (
        <button
          key={l.id}
          type="button"
          role="radio"
          aria-checked={language === l.id}
          onClick={() => setLanguage(l.id)}
          className={clsx(
            'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
            language === l.id ? 'bg-text text-surface' : 'text-muted hover:text-text',
          )}
        >
          {compact ? l.id.toUpperCase() : l.label}
        </button>
      ))}
    </div>
  )
}
