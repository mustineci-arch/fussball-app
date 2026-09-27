import { Section } from '../components/ui/Card'
import { useT } from '../i18n'
import type { PlayerPhoto } from './wikimedia'

const linkClass = 'underline decoration-dotted underline-offset-2 hover:text-text'

function LicenseLink({ photo }: { photo: PlayerPhoto }) {
  return photo.licenseUrl ? (
    <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer license" className={linkClass}>
      {photo.license}
    </a>
  ) : (
    <>{photo.license}</>
  )
}

function CommonsLink({ photo }: { photo: PlayerPhoto }) {
  return (
    <a href={photo.filePageUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
      Wikimedia Commons
    </a>
  )
}

/** Pflichtangabe für ein frei lizenziertes Foto: Urheber, Lizenz, Quelle – jeweils verlinkt. */
export function PhotoCredit({ photo }: { photo: PlayerPhoto }) {
  const t = useT()
  return (
    <p className="text-[11px] leading-snug text-subtle">
      {t('photo.credit')}: {photo.author} · <LicenseLink photo={photo} /> · <CommonsLink photo={photo} />
    </p>
  )
}

/** Gesammelte Bildnachweise unter Listen mit mehreren Fotos (z. B. Kader) */
export function PhotoCredits({ credits }: { credits: { subject: string; photo: PlayerPhoto }[] }) {
  const t = useT()
  if (credits.length === 0) return null
  return (
    <Section title={t('photo.credits')}>
      <ul className="space-y-1 px-1 text-[11px] leading-snug text-subtle">
        {credits.map(({ subject, photo }) => (
          <li key={subject}>
            <span className="font-medium text-muted">{subject}</span>: {photo.author} · <LicenseLink photo={photo} /> ·{' '}
            <CommonsLink photo={photo} />
          </li>
        ))}
      </ul>
    </Section>
  )
}
