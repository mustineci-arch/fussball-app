import { describe, expect, it } from 'vitest'
import { returnText } from '../../features/injuries/returnText'
import { findPlayer, mapFmInjury, mapLineupTeam, sameTeamName } from './fotmob'

describe('FotMob-Zuordnung', () => {
  it('erkennt gleiche Teams trotz unterschiedlicher Schreibweise', () => {
    expect(sameTeamName('Hamburger SV', 'Hamburg SV')).toBe(true)
    expect(sameTeamName('Bayern München', 'Bayern Munich')).toBe(true)
    expect(sameTeamName('Inter', 'Internazionale')).toBe(true)
    expect(sameTeamName('FC København', 'F.C. København')).toBe(true)
    expect(sameTeamName('Hertha BSC', 'Hamburg SV')).toBe(false)
    expect(sameTeamName('FC Augsburg', 'FC Cologne')).toBe(false)
  })

  it('ordnet Spieler über Name, Nachname und Rückennummer zu', () => {
    const list = [
      { name: 'Daniel Heuer Fernandes', shirtNumber: 1 },
      { name: 'Jordan Torunarigha', shirtNumber: 23 },
      { name: 'Ali Kaya', shirtNumber: 8 },
      { name: 'Can Kaya', shirtNumber: 9 },
    ]
    expect(findPlayer({ name: 'Daniel Heuer Fernandes' }, list)?.shirtNumber).toBe(1)
    expect(findPlayer({ name: 'J. Torunarigha' }, list)?.shirtNumber).toBe(23)
    expect(findPlayer({ name: 'Mert Kaya', shirtNumber: 9 }, list)?.name).toBe('Can Kaya')
    expect(findPlayer({ name: 'Mert Kaya' }, list)).toBeUndefined()
    expect(findPlayer({ name: 'Unbekannt Spieler' }, list)).toBeUndefined()
    const withDouble = [{ name: 'Alexander Røssing', shirtNumber: 38 }, { name: 'Alexander Meier', shirtNumber: 9 }]
    expect(findPlayer({ name: 'Alexander Røssing-Lelesiit', shirtNumber: 38 }, withDouble)?.name).toBe('Alexander Røssing')
    expect(findPlayer({ name: 'Alexander Unbekannt', shirtNumber: 38 }, withDouble)?.name).toBe('Alexander Røssing')
    expect(findPlayer({ name: 'Peter Unbekannt', shirtNumber: 38 }, withDouble)).toBeUndefined()
  })

  it('liest Verletzungen und Sperren', () => {
    expect(mapFmInjury('Doubtful')).toEqual({ status: 'doubtful' })
    expect(mapFmInjury('A few weeks')).toEqual({ status: 'out', expectedReturnText: 'A few weeks' })
    expect(mapFmInjury('Early November 2026', { type: 'suspension' }).status).toBe('suspended')
  })

  it('liest Noten aus der Aufstellung', () => {
    const side = mapLineupTeam({
      starters: [{ name: 'Nicolás Capaldo', shirtNumber: '24', performance: { rating: 8.5, playerOfTheMatch: true } }],
      subs: [
        { name: 'Yussuf Poulsen', shirtNumber: '15', performance: { rating: 7.9, substitutionEvents: [{ type: 'subIn', time: 46 }] } },
        { name: 'Bankspieler', shirtNumber: '30' },
      ],
      unavailable: [{ name: 'Patson Daka', unavailability: { type: 'injury', expectedReturn: 'A few weeks' } }],
    })
    expect(side.players[0]).toMatchObject({ name: 'Nicolás Capaldo', shirtNumber: 24, rating: 8.5, playerOfTheMatch: true, starter: true })
    expect(side.players[1]).toMatchObject({ rating: 7.9, subbedIn: true, starter: false })
    expect(side.players[2]?.rating).toBeUndefined()
    expect(side.unavailable).toEqual([{ name: 'Patson Daka', shirtNumber: undefined, injury: { status: 'out', expectedReturnText: 'A few weeks' } }])
  })
})

describe('Rückkehrtexte', () => {
  it('übersetzt typische Angaben ins Deutsche', () => {
    expect(returnText('A few weeks', 'de')).toBe('in einigen Wochen')
    expect(returnText('About 1-2 weeks', 'de')).toBe('in ca. 1–2 Wochen')
    expect(returnText('About 1 week', 'de')).toBe('in ca. 1 Woche')
    expect(returnText('Mid October 2026', 'de')).toBe('Mitte Oktober 2026')
    expect(returnText('Late March', 'de')).toBe('Ende März')
    expect(returnText('November 2026', 'de')).toBe('November 2026')
    expect(returnText('Unknown', 'de')).toBeUndefined()
    expect(returnText('A few weeks', 'en')).toBe('A few weeks')
  })
})

describe('Verletzungsarten', () => {
  it('nennt die Art der Verletzung über die FotMob-ID oder das Spielerprofil', async () => {
    const { injuryName } = await import('../../features/injuries/injuryNames')
    expect(mapFmInjury('A few weeks', { injuryId: '69' })).toMatchObject({ status: 'out', detail: 'Thigh injury' })
    expect(mapFmInjury('Doubtful', { injuryId: 87 }).detail).toBe('Muscle injury')
    expect(mapFmInjury('Mid October 2026', { name: 'Ankle injury', since: '2026-09-29T00:00:00.000Z' })).toMatchObject({ detail: 'Ankle injury', since: '2026-09-29' })
    expect(mapFmInjury('A few weeks', { injuryId: '6' }).detail).toBeUndefined() // nur "Injured"
    expect(mapFmInjury('Back in training').status).toBe('doubtful')
    const de = (s: string) => injuryName(s, 'de')
    expect(de('Thigh injury')).toBe('Oberschenkelverletzung')
    expect(de('Muscle injury')).toBe('Muskelverletzung')
    expect(de('Cruciate ligament injury')).toBe('Kreuzbandverletzung')
    expect(de('Achilles tendon injury')).toBe('Achillessehnenverletzung')
    expect(de('Hamstring injury')).toBe('Verletzung der Oberschenkelrückseite')
    expect(de('Broken ankle')).toBe('Sprunggelenkbruch')
    expect(de('Knock')).toBe('Prellung')
    expect(de('Something new')).toBe('Something new')
    expect(injuryName('Thigh injury', 'en')).toBe('Thigh injury')
  })

  it('übersetzt alle bekannten FotMob-Verletzungsarten', async () => {
    const { injuryName } = await import('../../features/injuries/injuryNames')
    const { INJURY_NAMES } = await import('./fotmob')
    const untranslated = Object.values(INJURY_NAMES).filter((n) => injuryName(n, 'de') === n)
    expect(untranslated).toEqual([])
  })
})
