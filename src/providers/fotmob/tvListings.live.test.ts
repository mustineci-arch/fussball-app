// Prüft die Senderzuordnung FotMob ↔ ESPN mit echten Daten. Nur mit LIVE=1.
import { describe, expect, it } from 'vitest'
import { addDays, todayKey } from '../../domain/date'
import { channelUrl } from '../../tv/broadcasts'
import { CombinedProvider } from '../CombinedProvider'
import { broadcastsForFixture, getTvListings } from './tvListings'

describe.skipIf(!process.env.LIVE)('FotMob-Sender live', () => {
  it('ordnet kommenden Spielen Sender zu', async () => {
    const p = new CombinedProvider()
    const days = [0, 1, 2, 3, 4, 5, 6].map((n) => addDays(todayKey(), n))
    const fixtures = (await Promise.all(days.map((d) => p.getFixturesByDate(d)))).flat().filter((f) => f.status === 'scheduled')
    for (const country of ['DE', 'TR', 'GB', 'US']) {
      const listings = await getTvListings(country)
      const matched = fixtures.filter((f) => broadcastsForFixture(f, listings).length > 0)
      console.log(country, 'Listen-Spiele', listings.length, '| App-Spiele', fixtures.length, '| zugeordnet', matched.length)
      for (const f of matched.slice(0, 6)) {
        const b = broadcastsForFixture(f, listings)
        console.log('  ', f.competitionId, f.homeTeam.name, '-', f.awayTeam.name, '→', b.map((x) => `${x.name}${channelUrl(x.name, country) ? '' : ' (ohne Link)'}`).join(', '))
      }
      const unmatchedBuli = fixtures.filter((f) => f.competitionId === 'c-bundesliga' && !broadcastsForFixture(f, listings).length)
      console.log('   Bundesliga ohne Sender:', unmatchedBuli.map((f) => `${f.homeTeam.name}-${f.awayTeam.name}`).join('; '))
    }
    expect(fixtures.length).toBeGreaterThan(0)
  }, 180_000)
})
