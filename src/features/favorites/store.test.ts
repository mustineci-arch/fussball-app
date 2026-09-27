import { beforeEach, describe, expect, it, vi } from 'vitest'

// Minimaler localStorage-Ersatz für die Node-Testumgebung
const memory = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => void memory.set(k, v),
  removeItem: (k: string) => void memory.delete(k),
})
vi.stubGlobal('window', { addEventListener() {}, removeEventListener() {} })

const store = await import('./store')

describe('Favoriten', () => {
  beforeEach(() => {
    memory.clear()
    store.__resetFavorites()
  })

  it('fügt hinzu, entfernt wieder und speichert dauerhaft', () => {
    store.toggleFavorite({ type: 'team', id: '432', name: 'Galatasaray' })
    expect(JSON.parse(memory.get('anstoss.favorites.v1')!)).toHaveLength(1)
    store.toggleFavorite({ type: 'team', id: '432', name: 'Galatasaray' })
    expect(JSON.parse(memory.get('anstoss.favorites.v1')!)).toHaveLength(0)
  })

  it('unterscheidet Typen mit gleicher ID', () => {
    store.toggleFavorite({ type: 'team', id: '1', name: 'A' })
    store.toggleFavorite({ type: 'match', id: '1', name: 'B' })
    const saved = JSON.parse(memory.get('anstoss.favorites.v1')!) as { type: string }[]
    expect(store.favoriteIds(saved as never, 'team')).toEqual(new Set(['1']))
    expect(saved.map((f) => f.type).sort()).toEqual(['match', 'team'])
  })
})
