import { EspnProvider } from './espn/EspnProvider'
import type { FootballProvider } from './FootballProvider'
import { withFussballDe } from './fussballde/withFussballDe'
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
      return new EspnProvider()
    default:
      console.warn(`Unbekannter Datenanbieter "${name}" – verwende ESPN.`)
      return new EspnProvider()
  }
}

// Amateur- und Jugendligen von fussball.de kommen immer dazu
export const provider: FootballProvider = withFussballDe(createProvider())
export type { FootballProvider }
