import { useState } from 'react'
import { resolveTheme, useThemeSetting } from '../../theme'

/** ESPN bietet Logos für dunkle Hintergründe unter ".../500-dark/..." an */
const toDarkVariant = (url: string) => url.replace(/\/(teamlogos|leaguelogos)\/soccer\/500\//, '/$1/soccer/500-dark/')

/**
 * Liefert die passende Logo-URL zum Design.
 * Reihenfolge bei Ladefehlern: dunkle Variante → normales Logo → Platzhalter (url = undefined).
 */
export function useLogoUrl(url: string | undefined): { src: string | undefined; onError: () => void } {
  const dark = resolveTheme(useThemeSetting()) === 'dark'
  const [failed, setFailed] = useState<Set<string>>(() => new Set())
  const candidates = url ? [...new Set(dark ? [toDarkVariant(url), url] : [url])] : []
  const src = candidates.find((c) => !failed.has(c))
  return { src, onError: () => src && setFailed((prev) => new Set(prev).add(src)) }
}
