/**
 * HTTP-Zugriff auf die ESPN-API mit
 * - Single-Flight: gleichzeitige Anfragen an dieselbe URL erzeugen nur einen Netzwerkaufruf
 * - Cache mit datenabhängiger Lebensdauer (Live kurz, Beendetes lang)
 * - Timeout und einheitlichen Fehlern (NotFoundError / ProviderError)
 */
import { NotFoundError, ProviderError } from '../errors'

export const SITE_API = 'https://site.api.espn.com/apis/site/v2/sports/soccer'
export const STANDINGS_API = 'https://site.api.espn.com/apis/v2/sports/soccer'
export const WEB_API = 'https://site.web.api.espn.com/apis'

const SECOND = 1000
const MINUTE = 60 * SECOND

export const ttl = {
  live: 15 * SECOND,
  short: 1 * MINUTE,
  medium: 10 * MINUTE,
  long: 6 * 60 * MINUTE,
} as const

type TtlSpec<T> = number | ((data: T) => number)

interface CacheEntry {
  expires: number
  promise: Promise<unknown>
}

const REQUEST_TIMEOUT_MS = 12 * SECOND
const MAX_ENTRIES = 400

export class EspnClient {
  private readonly cache = new Map<string, CacheEntry>()

  constructor(private readonly fetchImpl: typeof fetch = (...args) => fetch(...args)) {}

  get<T>(url: string, cacheFor: TtlSpec<T>): Promise<T> {
    const now = Date.now()
    const cached = this.cache.get(url)
    if (cached && cached.expires > now) return cached.promise as Promise<T>

    const promise = this.request<T>(url)
    // Solange die Anfrage läuft, teilen sich alle Aufrufer dasselbe Promise.
    const entry: CacheEntry = { expires: Number.POSITIVE_INFINITY, promise }
    this.cache.set(url, entry)

    promise.then(
      (data) => {
        entry.expires = Date.now() + (typeof cacheFor === 'function' ? cacheFor(data) : cacheFor)
        this.prune()
      },
      () => this.cache.delete(url), // Fehler werden nie gecacht
    )
    return promise
  }

  private async request<T>(url: string): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    let response: Response
    try {
      response = await this.fetchImpl(url, { signal: controller.signal })
    } catch (cause) {
      throw new ProviderError('Datenquelle nicht erreichbar', { cause })
    } finally {
      clearTimeout(timer)
    }
    if (response.status === 400 || response.status === 404) throw new NotFoundError('Eintrag', url)
    if (!response.ok) throw new ProviderError(`Datenquelle antwortet mit HTTP ${response.status}`)
    try {
      return (await response.json()) as T
    } catch (cause) {
      throw new ProviderError('Ungültige Antwort der Datenquelle', { cause })
    }
  }

  private prune() {
    if (this.cache.size <= MAX_ENTRIES) return
    const now = Date.now()
    for (const [key, entry] of this.cache) {
      if (entry.expires < now || this.cache.size > MAX_ENTRIES) this.cache.delete(key)
    }
  }
}
