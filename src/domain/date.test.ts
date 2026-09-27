import { describe, expect, it } from 'vitest'
import { addDays, ageFrom, parseDateKey, relativeDay } from './date'

describe('date', () => {
  it('addiert Tage über Monatsgrenzen', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('lehnt ungültige Datumsschlüssel ab', () => {
    expect(parseDateKey('2026-02-30')).toBeUndefined()
    expect(parseDateKey('abc')).toBeUndefined()
  })

  it('liefert relative Tagesbezeichnungen', () => {
    expect(relativeDay('2026-09-27', '2026-09-27')).toBe('today')
    expect(relativeDay('2026-09-26', '2026-09-27')).toBe('yesterday')
    expect(relativeDay('2026-09-28', '2026-09-27')).toBe('tomorrow')
    expect(relativeDay('2026-09-30', '2026-09-27')).toBeUndefined()
  })

  it('berechnet das Alter', () => {
    expect(ageFrom('2000-09-28', new Date(2026, 8, 27))).toBe(25)
    expect(ageFrom('2000-09-27', new Date(2026, 8, 27))).toBe(26)
  })
})
