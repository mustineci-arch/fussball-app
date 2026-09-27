import { describe, expect, it } from 'vitest'
import { initials, normalizeText, slugify } from './text'

describe('text', () => {
  it('normalisiert türkische und deutsche Sonderzeichen', () => {
    expect(normalizeText('Beşiktaş')).toBe('besiktas')
    expect(normalizeText('Çalhanoğlu')).toBe('calhanoglu')
    expect(normalizeText('Fenerbahçe')).toBe('fenerbahce')
    expect(normalizeText('Iğdır')).toBe('igdir')
    expect(normalizeText('Großaspach')).toBe('grossaspach')
  })

  it('erzeugt URL-Slugs', () => {
    expect(slugify('Süper Lig')).toBe('super-lig')
    expect(slugify('  UEFA Champions League! ')).toBe('uefa-champions-league')
  })

  it('bildet Initialen', () => {
    expect(initials('Hakan Çalhanoğlu')).toBe('HÇ')
    expect(initials('Pelé')).toBe('P')
    expect(initials('')).toBe('?')
  })
})
