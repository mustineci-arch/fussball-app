import { describe, expect, it, vi } from 'vitest'
import { NotFoundError, ProviderError } from '../errors'
import { EspnClient } from './client'

const ok = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))

describe('EspnClient', () => {
  it('fasst gleichzeitige Anfragen zusammen und cacht das Ergebnis', async () => {
    const fetchMock = vi.fn(() => ok({ n: 1 }))
    const client = new EspnClient(fetchMock)
    const results = await Promise.all(Array.from({ length: 50 }, () => client.get('https://x/a', 60_000)))
    await client.get('https://x/a', 60_000)
    expect(results.every((r) => (r as { n: number }).n === 1)).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('lädt nach Ablauf der Cache-Dauer neu', async () => {
    const fetchMock = vi.fn(() => ok({}))
    const client = new EspnClient(fetchMock)
    await client.get('https://x/b', 0)
    await new Promise((r) => setTimeout(r, 5))
    await client.get('https://x/b', 0)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('cacht keine Fehler', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementationOnce(() => Promise.resolve(new Response('', { status: 503 })))
      .mockImplementationOnce(() => ok({ ok: true }))
    const client = new EspnClient(fetchMock)
    await expect(client.get('https://x/c', 60_000)).rejects.toBeInstanceOf(ProviderError)
    await expect(client.get('https://x/c', 60_000)).resolves.toEqual({ ok: true })
  })

  it('meldet 400/404 als NotFoundError und Netzwerkfehler als ProviderError', async () => {
    const client404 = new EspnClient(() => Promise.resolve(new Response('', { status: 404 })))
    await expect(client404.get('https://x/d', 0)).rejects.toBeInstanceOf(NotFoundError)
    const offline = new EspnClient(() => Promise.reject(new TypeError('Failed to fetch')))
    await expect(offline.get('https://x/e', 0)).rejects.toBeInstanceOf(ProviderError)
  })
})
