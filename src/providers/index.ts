import { CombinedProvider } from './CombinedProvider'
import type { FootballProvider } from './FootballProvider'
import { MockProvider } from './mock/MockProvider'

/**
 * Einziger Ort, an dem ein konkreter Anbieter gewählt wird.
 * Standard: echte Daten (ESPN). Mit VITE_DATA_PROVIDER=mock laufen die Demo-Daten.
 */
function createProvider(): FootballProvider {
  const name = import.meta.env.VITE_DATA_PROVIDER ?? 'espn'
  switch (name) {
    case 'mock':
      return new MockProvider()
    case 'espn':
      // ESPN + FotMob für Wettbewerbe, die ESPN nicht führt (türkischer Pokal)
      return new CombinedProvider()
    default:
      console.warn(`Unbekannter Datenanbieter "${name}" – verwende ESPN.`)
      return new CombinedProvider()
  }
}

export const provider: FootballProvider = createProvider()
export type { FootballProvider }
