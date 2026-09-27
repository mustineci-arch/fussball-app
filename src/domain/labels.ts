/** Sprachneutrale Reihenfolgen und Stile. Texte liegen in src/i18n. */
import type { MatchStatKey, PlayerPosition, StandingZoneKind, TopPlayerCategory } from './types'

export const POSITION_ORDER: readonly PlayerPosition[] = ['GK', 'DF', 'MF', 'FW']

/** Reihenfolge der Spielstatistiken */
export const STAT_ORDER: readonly { key: MatchStatKey; unit?: '%' }[] = [
  { key: 'possession', unit: '%' },
  { key: 'xg' },
  { key: 'shots_total' },
  { key: 'shots_on_target' },
  { key: 'shots_off_target' },
  { key: 'shots_blocked' },
  { key: 'big_chances' },
  { key: 'corners' },
  { key: 'fouls' },
  { key: 'offsides' },
  { key: 'yellow_cards' },
  { key: 'red_cards' },
  { key: 'passes_total' },
  { key: 'pass_accuracy', unit: '%' },
  { key: 'saves' },
]

export const TOP_CATEGORIES: readonly TopPlayerCategory[] = ['goals', 'assists', 'yellow_cards', 'red_cards', 'clean_sheets']

export const ZONE_STYLES: Record<StandingZoneKind, string> = {
  champions_league: 'bg-zone-cl',
  europa_league: 'bg-zone-el',
  conference_league: 'bg-zone-ecl',
  promotion: 'bg-zone-cl',
  relegation_playoff: 'bg-zone-el',
  relegation: 'bg-zone-rel',
  qualification: 'bg-zone-cl',
  playoff: 'bg-zone-el',
  eliminated: 'bg-zone-rel',
}
