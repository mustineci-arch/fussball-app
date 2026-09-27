import { useT } from '../i18n'
import type { PlayerPhoto } from './wikimedia'

/** Pflichtangabe für frei lizenzierte Fotos: Urheber, Lizenz, Quelle – jeweils verlinkt. */
export function PhotoCredit({ photo }: { photo: PlayerPhoto }) {
  const t = useT()
  const link = 'underline decoration-dotted underline-offset-2 hover:text-text'
  return (
    <p className="text-[11px] leading-snug text-subtle">
      {t('photo.credit')}: {photo.author} ·{' '}
      {photo.licenseUrl ? (
        <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer license" className={link}>
          {photo.license}
        </a>
      ) : (
        photo.license
      )}{' '}
      ·{' '}
      <a href={photo.filePageUrl} target="_blank" rel="noopener noreferrer" className={link}>
        Wikimedia Commons
      </a>
    </p>
  )
}
