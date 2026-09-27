import type { MatchEventType, MatchStatKey, PlayerPosition, StandingZoneKind, TopPlayerCategory } from './types'

export const POSITION_LABELS: Record<PlayerPosition, { singular: string; group: string }> = {
  GK: { singular: 'Torwart', group: 'Torwart' },
  DF: { singular: 'Abwehr', group: 'Abwehr' },
  MF: { singular: 'Mittelfeld', group: 'Mittelfeld' },
  FW: { singular: 'Sturm', group: 'Sturm' },
}

export const POSITION_ORDER: readonly PlayerPosition[] = ['GK', 'DF', 'MF', 'FW']

export const EVENT_LABELS: Record<MatchEventType, string> = {
  goal: 'Tor',
  own_goal: 'Eigentor',
  penalty_goal: 'Tor (Elfmeter)',
  penalty_missed: 'Elfmeter verschossen',
  yellow: 'Gelbe Karte',
  second_yellow: 'Gelb-Rote Karte',
  red: 'Rote Karte',
  substitution: 'Wechsel',
  var: 'VAR',
}

/** Reihenfolge und Beschriftung der Spielstatistiken */
export const STAT_LABELS: readonly { key: MatchStatKey; label: string; unit?: '%' }[] = [
  { key: 'possession', label: 'Ballbesitz', unit: '%' },
  { key: 'xg', label: 'Expected Goals (xG)' },
  { key: 'shots_total', label: 'Schüsse' },
  { key: 'shots_on_target', label: 'Schüsse aufs Tor' },
  { key: 'shots_off_target', label: 'Schüsse daneben' },
  { key: 'shots_blocked', label: 'Geblockte Schüsse' },
  { key: 'big_chances', label: 'Großchancen' },
  { key: 'corners', label: 'Ecken' },
  { key: 'fouls', label: 'Fouls' },
  { key: 'offsides', label: 'Abseits' },
  { key: 'yellow_cards', label: 'Gelbe Karten' },
  { key: 'red_cards', label: 'Rote Karten' },
  { key: 'passes_total', label: 'Pässe' },
  { key: 'pass_accuracy', label: 'Passgenauigkeit', unit: '%' },
  { key: 'saves', label: 'Paraden' },
]

export const TOP_CATEGORY_LABELS: Record<TopPlayerCategory, string> = {
  goals: 'Torschützen',
  assists: 'Assists',
  yellow_cards: 'Gelbe Karten',
  red_cards: 'Rote Karten',
  clean_sheets: 'Zu-null-Spiele',
}

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

export const FORM_LABELS = { W: 'S', D: 'U', L: 'N' } as const
