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

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql'
const chunk = <T,>(items: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, i * size + size))

/** Eine Abfrage für viele Spieler: ESPN-ID → Dateiname des Wikidata-Bildes */
async function imagesByEspnId(espnIds: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  for (const ids of chunk(espnIds.filter((id) => /^\d+$/.test(id)), 80)) {
    const query = `SELECT ?espn ?img WHERE { VALUES ?espn { ${ids.map((id) => `"${id}"`).join(' ')} } ?item wdt:${ESPN_PLAYER_ID} ?espn ; wdt:P18 ?img . }`
    const data = await getJson<{ results?: { bindings?: { espn?: { value: string }; img?: { value: string } }[] } }>(SPARQL_ENDPOINT, { query })
    for (const b of data.results?.bindings ?? []) {
      const file = b.img?.value.split('/Special:FilePath/')[1]
      if (b.espn && file && !result.has(b.espn.value)) result.set(b.espn.value, decodeURIComponent(file))
    }
  }
  return result
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

async function getEntities(ids: string[]): Promise<Map<string, Entity>> {
  const result = new Map<string, Entity>()
  for (const part of chunk([...new Set(ids)], 50)) {
    const data = await getJson<{ entities?: Record<string, Entity> }>(WIKIDATA_API, {
      action: 'wbgetentities',
      ids: part.join('|'),
      props: 'claims',
    })
    for (const e of Object.values(data.entities ?? {})) result.set(e.id, e)
  }
  return result
}

/** Führt Aufgaben mit begrenzter Parallelität aus (Wikimedia nicht überlasten) */
async function mapLimited<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = []
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await fn(items[index] as T)
    }
  })
  await Promise.all(workers)
  return results
}

interface ImageInfo {
  thumburl?: string
  descriptionurl?: string
  extmetadata?: Record<string, { value?: string }>
}

function toPhoto(info: ImageInfo | undefined): PlayerPhoto | undefined {
  const meta = info?.extmetadata ?? {}
  const license = plainText(meta.LicenseShortName?.value)
  if (!info?.thumburl || !info.descriptionurl || !isFreeLicense(license)) return undefined
  const author = plainText(meta.Artist?.value) || plainText(meta.Credit?.value)
  // Ohne Urheber keine korrekte Namensnennung möglich (außer gemeinfrei/CC0)
  if (!author && !/^(cc0|public domain|pd\b)/i.test(license)) return undefined
  return { url: info.thumburl, filePageUrl: info.descriptionurl, author: author || '–', license, licenseUrl: meta.LicenseUrl?.value }
}

/** Bild- und Lizenzinfos für viele Dateien auf einmal (bis 50 je Anfrage) */
async function getPhotos(fileNames: string[]): Promise<Map<string, PlayerPhoto>> {
  const result = new Map<string, PlayerPhoto>()
  for (const part of chunk([...new Set(fileNames)], 50)) {
    const data = await getJson<{
      query?: { normalized?: { from: string; to: string }[]; pages?: Record<string, { title?: string; imageinfo?: ImageInfo[] }> }
    }>(COMMONS_API, {
      action: 'query',
      titles: part.map((f) => `File:${f}`).join('|'),
      prop: 'imageinfo',
      iiprop: 'url|extmetadata',
      iiurlwidth: '320',
      iiextmetadatafilter: 'Artist|Credit|LicenseShortName|LicenseUrl',
    })
    // Commons normalisiert Titel (z. B. "_" → " ") – zurück auf den angefragten Namen abbilden
    const normalized = new Map((data.query?.normalized ?? []).map((n) => [n.to, n.from]))
    for (const page of Object.values(data.query?.pages ?? {})) {
      const requested = page.title ? (normalized.get(page.title) ?? page.title) : undefined
      const photo = toPhoto(page.imageinfo?.[0])
      if (requested && photo) result.set(requested.replace(/^File:/, ''), photo)
    }
  }
  return result
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

function writeCache(updates: Record<string, PlayerPhoto | null>) {
  try {
    const cache = readCache()
    const now = Date.now()
    for (const [key, photo] of Object.entries(updates)) cache[key] = { at: now, photo }
    // Speicher klein halten: nur die neuesten 800 Einträge
    const entries = Object.entries(cache).sort((a, b) => b[1].at - a[1].at).slice(0, 800)
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)))
  } catch {
    // Cache ist optional
  }
}

const cacheKeyOf = (q: PhotoQuery) => (q.espnId ? `espn:${q.espnId}` : `name:${q.name}|${q.birthDate ?? ''}`)

/**
 * Sucht frei lizenzierte Fotos für mehrere Spieler gebündelt.
 * Ergebnis je Cache-Schlüssel; `null` = es gibt keins (wird ebenfalls gecacht).
 */
export async function findPlayerPhotos(queries: PhotoQuery[]): Promise<Map<string, PlayerPhoto | null>> {
  const result = new Map<string, PlayerPhoto | null>()
  const cache = readCache()
  const fresh = (key: string) => {
    const entry = cache[key]
    return entry && Date.now() - entry.at < CACHE_DAYS * 86_400_000 ? entry : undefined
  }
  const open = queries.filter((q) => {
    const hit = fresh(cacheKeyOf(q))
    if (hit) result.set(cacheKeyOf(q), hit.photo)
    return !hit
  })
  if (open.length === 0) return result

  // 1) Eindeutig über ESPN-ID – eine Abfrage für alle
  const fileByQuery = new Map<PhotoQuery, string>()
  const byEspn = await imagesByEspnId(open.flatMap((q) => (q.espnId ? [q.espnId] : [])))
  for (const q of open) {
    const file = q.espnId ? byEspn.get(q.espnId) : undefined
    if (file) fileByQuery.set(q, file)
  }

  // 2) Übrige über Name + Beruf + exaktes Geburtsdatum
  const rest = open.filter((q) => !fileByQuery.has(q) && q.birthDate)
  const candidates = await mapLimited(rest, 4, (q) => searchIds(`${q.name} haswbstatement:P106=${FOOTBALLER}`, 5))
  const entities = await getEntities(candidates.flat())
  rest.forEach((q, i) => {
    const list = (candidates[i] ?? []).flatMap((id) => entities.get(id) ?? [])
    const file = pickImage(list, false, q.birthDate)
    if (file) fileByQuery.set(q, file)
  })

  // 3) Lizenzen und Urheber prüfen – eine Abfrage je 50 Bilder
  const photos = await getPhotos([...fileByQuery.values()])
  const updates: Record<string, PlayerPhoto | null> = {}
  for (const q of open) {
    const file = fileByQuery.get(q)
    const photo = (file && photos.get(file)) || null
    // "Kein Foto" nur merken, wenn vollständig gesucht wurde (mit Geburtsdatum) –
    // sonst könnte eine spätere Suche mit Geburtsdatum noch fündig werden.
    if (photo || q.birthDate) updates[cacheKeyOf(q)] = photo
    result.set(cacheKeyOf(q), photo)
  }
  writeCache(updates)
  return result
}

/** Einzelnes Foto (Spielerseite) */
export async function findPlayerPhoto(query: PhotoQuery): Promise<PlayerPhoto | null> {
  return (await findPlayerPhotos([query])).get(cacheKeyOf(query)) ?? null
}

export { cacheKeyOf as photoKey }
