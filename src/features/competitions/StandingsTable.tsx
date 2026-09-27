import clsx from 'clsx'
import { Link } from 'react-router'
import { TeamLogo } from '../../components/media'
import { Card } from '../../components/ui/Card'
import { FORM_LABELS, ZONE_STYLES } from '../../domain/labels'
import type { FormResult, Id, StandingTable as Table, StandingZone } from '../../domain/types'

const zoneFor = (rank: number, zones: StandingZone[]) => zones.find((z) => rank >= z.fromRank && rank <= z.toRank)

const FORM_STYLES: Record<FormResult, string> = {
  W: 'bg-brand text-white',
  D: 'bg-subtle text-white',
  L: 'bg-live text-white',
}

export function FormStrip({ form, size = 'sm' }: { form: FormResult[]; size?: 'sm' | 'md' }) {
  return (
    <span className="inline-flex gap-1">
      {form.map((r, i) => (
        <span
          key={i}
          title={r === 'W' ? 'Sieg' : r === 'D' ? 'Unentschieden' : 'Niederlage'}
          className={clsx(
            'grid place-items-center rounded font-bold',
            size === 'sm' ? 'size-5 text-[10px]' : 'size-7 text-xs',
            FORM_STYLES[r],
          )}
        >
          {FORM_LABELS[r]}
        </span>
      ))}
    </span>
  )
}

interface StandingsTableProps {
  table: Table
  highlightTeamIds?: Id[]
  /** Kompakte Variante: nur Platz, Team, Spiele, Tordifferenz, Punkte */
  compact?: boolean
}

export function StandingsTable({ table, highlightTeamIds = [], compact }: StandingsTableProps) {
  const cell = 'px-1.5 py-2.5 text-center tabular-nums'
  const wide = compact ? 'hidden' : 'hidden md:table-cell'
  const usedZones = table.zones.filter((z) => table.rows.some((r) => r.rank >= z.fromRank && r.rank <= z.toRank))

  return (
    <Card padded={false} className="overflow-hidden">
      {table.groupName && <p className="border-b border-border px-4 py-2.5 text-sm font-semibold">{table.groupName}</p>}
      <table className="w-full text-sm">
        <thead className="text-[11px] font-semibold tracking-wide text-subtle uppercase">
          <tr className="border-b border-border">
            <th className="w-10 py-2 pl-3 text-left">#</th>
            <th className="w-full py-2 text-left">Verein</th>
            <th className={cell} title="Spiele">Sp</th>
            <th className={clsx(cell, wide)} title="Siege">S</th>
            <th className={clsx(cell, wide)} title="Unentschieden">U</th>
            <th className={clsx(cell, wide)} title="Niederlagen">N</th>
            <th className={clsx(cell, compact ? 'hidden' : 'hidden sm:table-cell')} title="Tore : Gegentore">Tore</th>
            <th className={cell} title="Tordifferenz">TD</th>
            <th className={clsx(cell, 'pr-3')} title="Punkte">Pkt</th>
            {!compact && <th className="hidden py-2 pr-3 text-left lg:table-cell">Form</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {table.rows.map((row) => {
            const zone = zoneFor(row.rank, table.zones)
            const diff = row.goalsFor - row.goalsAgainst
            const highlighted = highlightTeamIds.includes(row.team.id)
            return (
              <tr key={row.team.id} className={clsx(highlighted && 'bg-brand-soft')}>
                <td className="relative py-2.5 pl-3 font-semibold tabular-nums">
                  {zone && <span className={clsx('absolute inset-y-1.5 left-0 w-1 rounded-r', ZONE_STYLES[zone.kind])} aria-hidden />}
                  {row.rank}
                </td>
                <td className="max-w-0 py-2.5">
                  <Link to={`/team/${row.team.id}`} className="flex min-w-0 items-center gap-2 hover:text-brand">
                    <TeamLogo team={row.team} size={20} />
                    <span className={clsx('truncate', highlighted ? 'font-bold' : 'font-medium')}>{row.team.shortName}</span>
                  </Link>
                </td>
                <td className={cell}>{row.played}</td>
                <td className={clsx(cell, wide)}>{row.won}</td>
                <td className={clsx(cell, wide)}>{row.drawn}</td>
                <td className={clsx(cell, wide)}>{row.lost}</td>
                <td className={clsx(cell, compact ? 'hidden' : 'hidden sm:table-cell')}>
                  {row.goalsFor}:{row.goalsAgainst}
                </td>
                <td className={clsx(cell, 'text-muted')}>{diff > 0 ? `+${diff}` : diff}</td>
                <td className={clsx(cell, 'pr-3 font-bold')}>{row.points}</td>
                {!compact && (
                  <td className="hidden py-2.5 pr-3 lg:table-cell">{row.form && <FormStrip form={row.form} />}</td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
      {usedZones.length > 0 && !compact && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border px-4 py-3 text-xs text-muted">
          {usedZones.map((z) => (
            <li key={z.label} className="flex items-center gap-1.5">
              <span className={clsx('size-2.5 rounded-sm', ZONE_STYLES[z.kind])} aria-hidden />
              {z.label}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
