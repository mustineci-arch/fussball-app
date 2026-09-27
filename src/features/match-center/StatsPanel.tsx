import { Card } from '../../components/ui/Card'
import { STAT_ORDER } from '../../domain/labels'
import type { MatchStatistic } from '../../domain/types'
import { useT } from '../../i18n'

function formatValue(value: number, unit?: string) {
  const text = Number.isInteger(value) ? String(value) : value.toFixed(2)
  return unit ? `${text}${unit}` : text
}

function StatRow({ label, stat, unit }: { label: string; stat: MatchStatistic; unit?: string }) {
  const total = stat.home + stat.away
  const homeShare = total > 0 ? (stat.home / total) * 100 : 50
  const leader = stat.home === stat.away ? undefined : stat.home > stat.away ? 'home' : 'away'
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm tabular-nums">
        <span className={leader === 'home' ? 'font-bold' : 'text-muted'}>{formatValue(stat.home, unit)}</span>
        <span className="text-xs font-medium text-muted">{label}</span>
        <span className={leader === 'away' ? 'font-bold' : 'text-muted'}>{formatValue(stat.away, unit)}</span>
      </div>
      <div className="flex h-1.5 gap-1" aria-hidden>
        <div className="flex flex-1 justify-end overflow-hidden rounded-full bg-surface-3">
          <div className={leader === 'home' ? 'bg-brand' : 'bg-subtle'} style={{ width: `${total > 0 ? homeShare : 0}%` }} />
        </div>
        <div className="flex flex-1 overflow-hidden rounded-full bg-surface-3">
          <div className={leader === 'away' ? 'bg-text' : 'bg-subtle'} style={{ width: `${total > 0 ? 100 - homeShare : 0}%` }} />
        </div>
      </div>
    </div>
  )
}

/** Zeigt nur Statistiken, die die Datenquelle tatsächlich liefert. */
export function StatsPanel({ statistics }: { statistics: MatchStatistic[] }) {
  const t = useT()
  const byKey = new Map(statistics.map((s) => [s.key, s]))
  const rows = STAT_ORDER.flatMap(({ key, unit }) => {
    const stat = byKey.get(key)
    return stat ? [{ key, unit, stat }] : []
  })

  return (
    <Card className="space-y-4">
      {rows.map((r) => (
        <StatRow key={r.key} label={t(`stat.${r.key}`)} stat={r.stat} unit={r.unit} />
      ))}
    </Card>
  )
}
