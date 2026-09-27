/**
 * Spielerfotos aus Wikimedia Commons – nur frei lizenzierte Bilder, immer mit Urheberangabe.
 *
 * Zuordnung Spieler → Wikidata-Eintrag:
 *  1. eindeutig über die hinterlegte ESPN-ID (Wikidata-Eigenschaft P3681), oder
 *  2. über den Namen, aber nur wenn Beruf "Fußballspieler" UND Geburtsdatum exakt übereinstimmen
 *     und genau ein Eintrag passt.
 * Passt nichts eindeutig, gibt es kein Foto – lieber Platzhalter als ein falsches Bild.
 */

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php'
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php'
const FOOTBALLER = 'Q937857' // Beruf: Fußballspieler
const ESPN_PLAYER_ID = 'P3681'
const TIMEOUT_MS = 8000

export interface PlayerPhoto {
  url: string
  /** Seite der Datei auf Commons (Lizenz- und Urheberdetails) */
  filePageUrl: string
  author: string
  license: string
  licenseUrl?: string
}

export interface PhotoQuery {
  name: string
  /** ISO-Datum YYYY-MM-DD – Pflicht für die Namenssuche */
  birthDate?: string
  espnId?: string
}

// ------------------------------------------------------------ reine Hilfsfunktionen (getestet)

/** Nur Lizenzen, deren Bedingungen wir mit einer Urheberangabe erfüllen können */
export function isFreeLicense(shortName: string | undefined): boolean {
  if (!shortName) return false
  return /^(cc0|public domain|pd\b|cc[- ]by(-sa)?[- ]\d(\.\d)?)/i.test(shortName.trim())
}

/** HTML aus den Commons-Metadaten in reinen Text umwandeln (nie HTML übernehmen) */
export function plainText(html: string | undefined): string {
  return (html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Wikidata-Zeitwert "+1992-06-15T00:00:00Z" mit Tagesgenauigkeit → "1992-06-15" */
export function wikidataDate(time: string | undefined, precision: number | undefined): string | undefined {
  if (!time || precision !== 11) return undefined
  return /^\+?(\d{4}-\d{2}-\d{2})/.exec(time)?.[1]
}

interface Snak<T> {
  mainsnak?: { datavalue?: { value?: T } }
}
export interface Entity {
  id: string
  claims?: {
    P18?: Snak<string>[]
    P569?: Snak<{ time?: string; precision?: number }>[]
    P106?: Snak<{ id?: string }>[]
  }
}

const imageOf = (e: Entity) => e.claims?.P18?.[0]?.mainsnak?.datavalue?.value
const birthOf = (e: Entity) => {
  const v = e.claims?.P569?.[0]?.mainsnak?.datavalue?.value
  return wikidataDate(v?.time, v?.precision)
}
const isFootballer = (e: Entity) => (e.claims?.P106 ?? []).some((c) => c.mainsnak?.datavalue?.value?.id === FOOTBALLER)

/**
 * Wählt das Bild des passenden Eintrags.
 * trusted = Einträge kamen über die ESPN-ID → keine weitere Prüfung nötig.
 */
export function pickImage(entities: Entity[], trusted: boolean, birthDate?: string): string | undefined {
  if (trusted) return entities.map(imageOf).find(Boolean)
  if (!birthDate) return undefined
  const matches = entities.filter((e) => isFootballer(e) && birthOf(e) === birthDate)
  return matches.length === 1 ? imageOf(matches[0] as Entity) : undefined
}

// ------------------------------------------------------------ Netzwerk

async function getJson<T>(base: string, params: Record<string, string>): Promise<T> {
  const url = `${base}?${new URLSearchParams({ ...params, format: 'json', origin: '*' })}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`Wikimedia HTTP ${response.status}`)
    return (await response.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

async function searchIds(query: string, limit: number): Promise<string[]> {
  const data = await getJson<{ query?: { search?: { title: string }[] } }>(WIKIDATA_API, {
    action: 'query',
    list: 'search',
    srsearch: query,
    srlimit: String(limit),
  })
  return (data.query?.search ?? []).map((r) => r.title).filter((t) => /^Q\d+$/.test(t))
}

async function getEntities(ids: string[]): Promise<Entity[]> {
  if (ids.length === 0) return []
  const data = await getJson<{ entities?: Record<string, Entity> }>(WIKIDATA_API, {
    action: 'wbgetentities',
    ids: ids.join('|'),
    props: 'claims',
  })
  return Object.values(data.entities ?? {})
}

interface ImageInfo {
  thumburl?: string
  descriptionurl?: string
  extmetadata?: Record<string, { value?: string }>
}

async function getPhoto(fileName: string): Promise<PlayerPhoto | undefined> {
  const data = await getJson<{ query?: { pages?: Record<string, { imageinfo?: ImageInfo[] }> } }>(COMMONS_API, {
    action: 'query',
    titles: `File:${fileName}`,
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: '320',
    iiextmetadatafilter: 'Artist|Credit|LicenseShortName|LicenseUrl',
  })
  const info = Object.values(data.query?.pages ?? {})[0]?.imageinfo?.[0]
  const meta = info?.extmetadata ?? {}
  const license = plainText(meta.LicenseShortName?.value)
  if (!info?.thumburl || !info.descriptionurl || !isFreeLicense(license)) return undefined
  const author = plainText(meta.Artist?.value) || plainText(meta.Credit?.value)
  // Ohne Urheber keine korrekte Namensnennung möglich (außer gemeinfrei/CC0)
  if (!author && !/^(cc0|public domain|pd\b)/i.test(license)) return undefined
  return {
    url: info.thumburl,
    filePageUrl: info.descriptionurl,
    author: author || '–',
    license,
    licenseUrl: meta.LicenseUrl?.value,
  }
}

// ------------------------------------------------------------ Cache (pro Gerät, 30 Tage)

const CACHE_KEY = 'anstoss.photos.v1'
const CACHE_DAYS = 30
type CacheEntry = { at: number; photo: PlayerPhoto | null }

function readCache(): Record<string, CacheEntry> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as Record<string, CacheEntry>
  } catch {
    return {}
  }
}

function writeCache(key: string, photo: PlayerPhoto | null) {
  try {
    const cache = readCache()
    cache[key] = { at: Date.now(), photo }
    // Speicher klein halten: nur die neuesten 500 Einträge
    const entries = Object.entries(cache).sort((a, b) => b[1].at - a[1].at).slice(0, 500)
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)))
  } catch {
    // Cache ist optional
  }
}

/** Sucht ein frei lizenziertes Foto. `null` = es gibt keins (wird ebenfalls gecacht). */
export async function findPlayerPhoto(query: PhotoQuery): Promise<PlayerPhoto | null> {
  const cacheKey = query.espnId ? `espn:${query.espnId}` : `name:${query.name}|${query.birthDate ?? ''}`
  const cached = readCache()[cacheKey]
  if (cached && Date.now() - cached.at < CACHE_DAYS * 86_400_000) return cached.photo

  let fileName: string | undefined
  if (query.espnId && /^\d+$/.test(query.espnId)) {
    const ids = await searchIds(`haswbstatement:${ESPN_PLAYER_ID}=${query.espnId}`, 2)
    fileName = pickImage(await getEntities(ids), true)
  }
  if (!fileName && query.birthDate) {
    const ids = await searchIds(`${query.name} haswbstatement:P106=${FOOTBALLER}`, 5)
    fileName = pickImage(await getEntities(ids), false, query.birthDate)
  }

  const photo = fileName ? ((await getPhoto(fileName)) ?? null) : null
  writeCache(cacheKey, photo)
  return photo
}
