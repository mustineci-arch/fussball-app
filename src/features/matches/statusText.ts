import { relativeDay, formatLongDate } from '../../domain/date'
import { formatMinute } from '../../domain/status'
import type { Fixture } from '../../domain/types'
import type { TFunction } from '../../i18n'

/** Anzeige für laufende Spiele: Minute ("67'") oder übersetzter Pausenstatus ("HZ"/"HT") */
export function liveLabel(fixture: Fixture, t: TFunction): string {
  const minute = formatMinute(fixture)
  if (minute) return minute
  if (fixture.status === 'halftime') return t('status.halftimeShort')
  if (fixture.status === 'penalties') return t('status.penaltiesShort')
  return t(`status.${fixture.status}`)
}

/** "Heute, Sonntag, 27. September" bzw. nur das Datum */
export function dayHeading(dateKey: string, t: TFunction): string {
  const relative = relativeDay(dateKey)
  const long = formatLongDate(dateKey)
  return relative ? `${t(`day.${relative}`)}, ${long}` : long
}
