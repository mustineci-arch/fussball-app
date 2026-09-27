import { describe, expect, it } from 'vitest'
import { isFreeLicense, pickImage, plainText, wikidataDate, type Entity } from './wikimedia'

const footballer = (id: string, image: string | undefined, birth: string): Entity => ({
  id,
  claims: {
    P18: image ? [{ mainsnak: { datavalue: { value: image } } }] : [],
    P569: [{ mainsnak: { datavalue: { value: { time: `+${birth}T00:00:00Z`, precision: 11 } } } }],
    P106: [{ mainsnak: { datavalue: { value: { id: 'Q937857' } } } }],
  },
})

describe('Lizenzen', () => {
  it('akzeptiert nur freie Lizenzen', () => {
    expect(isFreeLicense('CC BY-SA 4.0')).toBe(true)
    expect(isFreeLicense('CC BY 2.0')).toBe(true)
    expect(isFreeLicense('CC0')).toBe(true)
    expect(isFreeLicense('Public domain')).toBe(true)
    expect(isFreeLicense('CC BY-NC 4.0')).toBe(false) // nicht-kommerziell → ausgeschlossen
    expect(isFreeLicense('GFDL')).toBe(false)
    expect(isFreeLicense('Fair use')).toBe(false)
    expect(isFreeLicense(undefined)).toBe(false)
  })

  it('übernimmt Urheber nur als Text, nie als HTML', () => {
    expect(plainText('<a href="//commons.wikimedia.org/wiki/User:X">Bryan Berlin</a>')).toBe('Bryan Berlin')
    expect(plainText('A &amp; B <script>alert(1)</script>')).toBe('A & B alert(1)')
  })
})

describe('Zuordnung', () => {
  it('liest nur tagesgenaue Geburtsdaten', () => {
    expect(wikidataDate('+1992-06-15T00:00:00Z', 11)).toBe('1992-06-15')
    expect(wikidataDate('+1992-00-00T00:00:00Z', 9)).toBeUndefined()
  })

  it('vertraut Treffern über die ESPN-ID', () => {
    expect(pickImage([footballer('Q1', 'salah.jpg', '1992-06-15')], true)).toBe('salah.jpg')
  })

  it('verlangt bei der Namenssuche ein exakt passendes Geburtsdatum', () => {
    const list = [footballer('Q1', 'a.jpg', '1996-04-05'), footballer('Q2', 'b.jpg', '1990-01-01')]
    expect(pickImage(list, false, '1996-04-05')).toBe('a.jpg')
    expect(pickImage(list, false, '2000-01-01')).toBeUndefined()
    expect(pickImage(list, false, undefined)).toBeUndefined()
  })

  it('zeigt kein Foto, wenn mehrere Einträge gleich gut passen', () => {
    const twins = [footballer('Q1', 'a.jpg', '1996-04-05'), footballer('Q2', 'b.jpg', '1996-04-05')]
    expect(pickImage(twins, false, '1996-04-05')).toBeUndefined()
  })

  it('ignoriert Einträge, die keine Fußballspieler sind', () => {
    const notFootballer: Entity = { id: 'Q3', claims: { ...footballer('Q3', 'c.jpg', '1996-04-05').claims, P106: [] } }
    expect(pickImage([notFootballer], false, '1996-04-05')).toBeUndefined()
  })
})
