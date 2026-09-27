import { describe, expect, it } from 'vitest'
import { toGermanCountry } from './countryNames'

describe('toGermanCountry', () => {
  it('übersetzt ISO-Länder über Intl', () => {
    expect(toGermanCountry('Germany')).toBe('Deutschland')
    expect(toGermanCountry('Lithuania')).toBe('Litauen')
    expect(toGermanCountry('Netherlands')).toBe('Niederlande')
    expect(toGermanCountry('Greece')).toBe('Griechenland')
  })

  it('kennt Sonderfälle', () => {
    expect(toGermanCountry('Türkiye')).toBe('Türkei')
    expect(toGermanCountry('Rep Ireland')).toBe('Irland')
    expect(toGermanCountry('Scotland')).toBe('Schottland')
  })

  it('lässt Unbekanntes unverändert', () => {
    expect(toGermanCountry('Galatasaray')).toBe('Galatasaray')
    expect(toGermanCountry(undefined)).toBeUndefined()
  })
})
