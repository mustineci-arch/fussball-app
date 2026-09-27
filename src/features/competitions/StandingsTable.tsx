import clsx from 'clsx'
import { Link } from 'react-router'
import { TeamLogo } from '../../components/media'
import { Card } from '../../components/ui/Card'
import { ZONE_STYLES } from '../../domain/labels'
import type { FormResult, Id, StandingTable as Table, StandingZone } from '../../domain/types'
import { useT } from '../../i18n'

const zoneFor = (rank: number, zones: StandingZone[]) => zones.find((z) => rank >= z.fromRank && rank <= z.toRank)

const FORM_STYLES: Record<FormResult, string> = {
  W: 'bg-brand text-white',
  D: 'bg-subtle text-white',
  L: 'bg-live text-white',
}

export function FormStrip({ form, size = 'sm' }: { form: FormResult[]; size?: 'sm' | 'md' }) {
  const t = useT()
  return (
    <span className="inline-flex gap-1">
      {form.map((r, i) => (
        <span
          key={i}
          title={t(`form.${r}.title`)}
          className={clsx('grid place-items-center rounded font-bold', size === 'sm' ? 'size-5 text-[10px]' : 'size-7 text-xs', FORM_STYLES[r])}
        >
          {t(`form.${r}`)}
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
  const t = useT()
  const cell = 'px-1.5 py-2.5 text-center tabular-nums'
  const wide = compact ? 'hidden' : 'hidden md:table-cell'
  const goals = compact ? 'hidden' : 'hidden sm:table-cell'
  const usedZones = table.zones.filter((z) => table.rows.some((r) => r.rank >= z.fromRank && r.rank <= z.toRank))

  return (
    <Card padded={false} className="overflow-hidden">
      {table.groupName && <p className="border-b border-border px-4 py-2.5 text-sm font-semibold">{table.groupName}</p>}
      <table className="w-full text-sm">
        <thead className="text-[11px] font-semibold tracking-wide text-subtle uppercase">
          <tr className="border-b border-border">
            <th className="w-10 py-2 pl-3 text-left">#</th>
            <th className="w-full py-2 text-left">{t('table.club')}</th>
            <th className={cell} title={t('table.playedTitle')}>{t('table.played')}</th>
            <th className={clsx(cell, wide)} title={t('table.wonTitle')}>{t('table.won')}</th>
            <th className={clsx(cell, wide)} title={t('table.drawnTitle')}>{t('table.drawn')}</th>
            <th className={clsx(cell, wide)} title={t('table.lostTitle')}>{t('table.lost')}</th>
            <th className={clsx(cell, goals)} title={t('table.goalsTitle')}>{t('table.goals')}</th>
            <th className={cell} title={t('table.diffTitle')}>{t('table.diff')}</th>
            <th className={clsx(cell, 'pr-3')} title={t('table.pointsTitle')}>{t('table.points')}</th>
            {!compact && <th className="hidden py-2 pr-3 text-left lg:table-cell">{t('table.form')}</th>}
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
                <td className={clsx(cell, goals)}>
                  {row.goalsFor}:{row.goalsAgainst}
                </td>
                <td className={clsx(cell, 'text-muted')}>{diff > 0 ? `+${diff}` : diff}</td>
                <td className={clsx(cell, 'pr-3 font-bold')}>{row.points}</td>
                {!compact && <td className="hidden py-2.5 pr-3 lg:table-cell">{row.form && <FormStrip form={row.form} />}</td>}
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
              {t(`zone.${z.label}`)}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
