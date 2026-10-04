import { describe, expect, it } from 'vitest'
import { detectCountry } from './country'
import { competitionCountry, needsTeamLeague, teamCountry } from './teamCountry'

const club = (id: string) => ({ id, slug: id, name: id, shortName: id })

describe('Land eines Teams', () => {
  it('Vereine über die Liga', () => {
    expect(teamCountry(club('127'), { competitionId: 'c-bundesliga' })).toBe('DE')
    expect(teamCountry(club('432'), { competitionId: 'c-champions-league' }, 'c-super-lig')).toBe('TR')
    expect(teamCountry(club('139'), { competitionId: 'c-europa-league' }, 'l-ned.1')).toBe('NL')
    expect(teamCountry(club('fmt-8622'), { competitionId: 'c-turkish-cup' })).toBe('TR')
    expect(needsTeamLeague(club('432'), { competitionId: 'c-champions-league' })).toBe(true)
    expect(needsTeamLeague(club('127'), { competitionId: 'c-bundesliga' })).toBe(false)
  })

  it('Nationalteams über das Länderkürzel', () => {
    expect(teamCountry({ ...club('465'), code: 'TUR', isNational: true }, { competitionId: 'c-nations-league' })).toBe('TR')
    expect(teamCountry({ ...club('448'), code: 'ENG', isNational: true }, { competitionId: 'c-nations-league' })).toBe('GB')
  })

  it('kennt die Länder der Ligen', () => {
    expect(competitionCountry('c-la-liga')).toBe('ES')
    expect(competitionCountry('l-por.1')).toBe('PT')
    expect(competitionCountry('c-champions-league')).toBeUndefined()
  })
})

describe('Land des Geräts', () => {
  it('liest die Region aus den Spracheinstellungen', () => {
    expect(detectCountry(['de-AT', 'de'])).toBe('AT')
    expect(detectCountry(['tr-TR'])).toBe('TR')
    expect(detectCountry(['en-CA'])).toBe('CA')
    expect(detectCountry(['de'])).toBe('DE')
  })
})
