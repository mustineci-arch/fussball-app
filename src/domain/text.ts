const SPECIAL_CHARS: Record<string, string> = { ı: 'i', İ: 'i', ß: 'ss', ø: 'o', æ: 'ae', œ: 'oe', đ: 'd', ł: 'l' }

/** Kleinschreibung ohne Akzente – für Suche und Slugs ("Beşiktaş" → "besiktas"). */
export function normalizeText(input: string): string {
  return input
    .replace(/[ıİßøæœđł]/g, (ch) => SPECIAL_CHARS[ch] ?? ch)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

export function slugify(input: string): string {
  return normalizeText(input)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase() || '?'
}
