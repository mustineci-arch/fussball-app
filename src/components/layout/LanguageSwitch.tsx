import { LANGUAGES, setLanguage, useLanguage, useT } from '../../i18n'
import { Segmented } from '../ui/Segmented'

/** Umschalter Deutsch/Englisch */
export function LanguageSwitch({ compact }: { compact?: boolean }) {
  const t = useT()
  const language = useLanguage()
  return (
    <Segmented
      label={t('more.language')}
      options={LANGUAGES.map((l) => ({ id: l.id, label: compact ? l.id.toUpperCase() : l.label }))}
      value={language}
      onChange={setLanguage}
    />
  )
}
