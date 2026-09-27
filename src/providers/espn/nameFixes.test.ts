import { describe, expect, it } from 'vitest'
import { correctedNationality, fixPlayerName, fixTeamName } from './nameFixes'

const galatasaray = { teamId: '432' }

describe('fixPlayerName', () => {
  it('ergänzt türkische Buchstaben bei Spielern türkischer Teams', () => {
    expect(fixPlayerName('1', 'Ugurcan Çakir', galatasaray)).toBe('Uğurcan Çakır')
    expect(fixPlayerName('2', 'Baris Alper Yilmaz', galatasaray)).toBe('Barış Alper Yılmaz')
    expect(fixPlayerName('3', 'Abdülkerim Bardakçi', galatasaray)).toBe('Abdülkerim Bardakcı')
    expect(fixPlayerName('4', 'Ilkay Gündogan', galatasaray)).toBe('İlkay Gündoğan')
    expect(fixPlayerName('5', 'Kazimcan Karatas', galatasaray)).toBe('Kazımcan Karataş')
    expect(fixPlayerName('6', 'G. Güvenc', galatasaray)).toBe('G. Güvenç')
  })

  it('erkennt den türkischen Kontext auch über Liga und Nationalität', () => {
    expect(fixPlayerName('7', 'Hakan Calhanoglu', { teamId: '110', nationality: 'Türkiye' })).toBe('Hakan Çalhanoğlu')
    expect(fixPlayerName('8', 'Emre Yilmaz', { leagueSlug: 'tur.1' })).toBe('Emre Yılmaz')
    expect(fixPlayerName('9', 'Kerem Aktürkoglu', { teamId: '465' })).toBe('Kerem Aktürkoğlu')
  })

  it('verändert keine Namen außerhalb des türkischen Kontexts', () => {
    expect(fixPlayerName('10', 'Emre Yilmaz', { teamId: '132' })).toBe('Emre Yilmaz')
  })

  it('lässt international gebräuchliche Namen unverändert', () => {
    expect(fixPlayerName('11', 'Ismail Jakobs', galatasaray)).toBe('Ismail Jakobs')
    expect(fixPlayerName('12', 'Victor Osimhen', galatasaray)).toBe('Victor Osimhen')
    expect(fixPlayerName('13', 'Leroy Sané', galatasaray)).toBe('Leroy Sané')
  })
})

describe('Korrekturliste', () => {
  it('korrigiert die falsche Nationalität von Can Güner', () => {
    expect(correctedNationality('403895', 'Argentina')).toBe('Türkiye')
    expect(correctedNationality('999', 'Argentina')).toBe('Argentina')
  })
})

describe('fixTeamName', () => {
  it('schreibt türkische Vereine korrekt – in jeder Sprache', () => {
    expect(fixTeamName('1895', { name: 'Besiktas', short: 'Besiktas' }, 'de').name).toBe('Beşiktaş')
    expect(fixTeamName('1895', { name: 'Besiktas', short: 'Besiktas' }, 'en').name).toBe('Beşiktaş')
    expect(fixTeamName('7914', { name: 'Istanbul Basaksehir', short: 'Istanbul BB' }, 'de')).toEqual({
      name: 'İstanbul Başakşehir',
      short: 'Başakşehir',
    })
  })

  it('nutzt deutsche Vereinsnamen nur auf Deutsch', () => {
    expect(fixTeamName('132', { name: 'Bayern Munich', short: 'Bayern' }, 'de').name).toBe('Bayern München')
    expect(fixTeamName('132', { name: 'Bayern Munich', short: 'Bayern' }, 'en').name).toBe('Bayern Munich')
  })

  it('lässt unbekannte Teams unverändert', () => {
    expect(fixTeamName('359', { name: 'Arsenal', short: 'Arsenal' }, 'de')).toEqual({ name: 'Arsenal', short: 'Arsenal' })
  })
})
