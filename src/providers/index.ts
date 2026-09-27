import type { FootballProvider } from './FootballProvider'
import { MockProvider } from './mock/MockProvider'

/**
 * Einziger Ort, an dem ein konkreter Anbieter gewählt wird.
 * Ab Phase 2 kommt hier z. B. der EspnProvider dazu.
 */
function createProvider(): FootballProvider {
  const name = import.meta.env.VITE_DATA_PROVIDER ?? 'mock'
  switch (name) {
    case 'mock':
      return new MockProvider()
    default:
      console.warn(`Unbekannter Datenanbieter "${name}" – verwende Demo-Daten.`)
      return new MockProvider()
  }
}

export const provider: FootballProvider = createProvider()
export type { FootballProvider }
