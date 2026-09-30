import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { TeamLogo } from '../../components/media'
import { Card } from '../../components/ui/Card'
import type { Fixture, Id, StandingTable as Table, Team } from '../../domain/types'
import { useT } from '../../i18n'
import { crossResults, positionHistory } from './tableStats'

const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)'] as const
const MAX_SELECTED = SERIES.length

// ------------------------------------------------------------ Fieberkurve

interface FeverCurveProps {
  table: Table
  fixtures: Fixture[]
  /** Vorauswahl, z. B. eigenes Team oder Favoriten */
  preselect?: Id[]
}

export function FeverCurve({ table, fixtures, preselect = [] }: FeverCurveProps) {
  const t = useT()
  const teams = table.rows.map((r) => r.team)
  const history = useMemo(() => positionHistory(fixtures, teams), [fixtures, teams])
  const initial = [...new Set([...preselect.filter((id) => history.has(id)), ...teams.map((tm) => tm.id)])].slice(0, 2)
  const [selected, setSelected] = useState<Id[]>(initial)
  const [hover, setHover] = useState<number | null>(null)

  const games = Math.max(0, ...[...history.values()].map((h) => h.length))
  const count = teams.length
  if (games < 2) return <p className="px-1 text-sm text-muted">{t('tableViews.tooFewGames')}</p>

  // Farbe folgt dem Team (Reihenfolge der Auswahl), nie dem Rang
  const colorOf = (id: Id) => {
    const i = selected.indexOf(id)
    return i >= 0 ? SERIES[i] : undefined
  }
  const toggle = (id: Id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < MAX_SELECTED ? [...prev, id] : prev))

  const W = 640
  const H = Math.max(180, count * 22 + 40)
  const pad = { l: 28, r: 12, t: 12, b: 28 }
  const x = (k: number) => pad.l + ((W - pad.l - pad.r) * k) / Math.max(1, games - 1)
  const y = (rank: number) => pad.t + ((H - pad.t - pad.b) * (rank - 1)) / Math.max(1, count - 1)
  const path = (ranks: number[]) => ranks.map((r, k) => `${k ? 'L' : 'M'}${x(k).toFixed(1)},${y(r).toFixed(1)}`).join(' ')

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - box.left) / box.width) * W
    const k = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (games - 1))
    setHover(Math.min(games - 1, Math.max(0, k)))
  }

  const selectedTeams = selected.map((id) => teams.find((tm) => tm.id === id)).filter((tm): tm is Team => !!tm)
  const rankTicks = [...new Set([1, Math.ceil(count / 2), count])]

  return (
    <Card className="space-y-3">
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-none select-none"
          role="img"
          aria-label={t('tableViews.feverAria')}
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {rankTicks.map((r) => (
            <g key={r}>
              <line x1={pad.l} x2={W - pad.r} y1={y(r)} y2={y(r)} stroke="var(--border)" strokeWidth={1} />
              <text x={pad.l - 8} y={y(r)} dy="0.35em" textAnchor="end" fontSize={11} fill="var(--muted)">
                {r}.
              </text>
            </g>
          ))}
          {Array.from({ length: games }, (_, k) => k)
            .filter((k) => games <= 12 || k % Math.ceil(games / 12) === 0 || k === games - 1)
            .map((k) => (
              <text key={k} x={x(k)} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--muted)">
                {k + 1}
              </text>
            ))}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="var(--subtle)" strokeWidth={1} />}
          {/* Übrige Teams als ruhiger Hintergrund */}
          {teams
            .filter((tm) => !selected.includes(tm.id))
            .map((tm) => (
              <path key={tm.id} d={path(history.get(tm.id) ?? [])} fill="none" stroke="var(--border)" strokeWidth={1.5} />
            ))}
          {selectedTeams.map((tm) => {
            const ranks = history.get(tm.id) ?? []
            const color = colorOf(tm.id)
            return (
              <g key={tm.id}>
                <path d={path(ranks)} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
                {ranks.map((r, k) => (
                  <circle key={k} cx={x(k)} cy={y(r)} r={hover === k ? 5 : 3.5} fill={color} stroke="var(--surface)" strokeWidth={2} />
                ))}
              </g>
            )
          })}
        </svg>
        {hover !== null && selectedTeams.length > 0 && (
          <div
            className="pointer-events-none absolute top-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs shadow-card"
            style={hover > games / 2 ? { right: `${100 - (x(hover) / W) * 100 + 2}%` } : { left: `${(x(hover) / W) * 100 + 2}%` }}
          >
            <p className="mb-1 font-semibold">{t('tableViews.afterGame', { n: hover + 1 })}</p>
            {selectedTeams.map((tm) => (
              <p key={tm.id} className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="size-2 rounded-full" style={{ background: colorOf(tm.id) }} aria-hidden />
                <span className="text-muted">{tm.shortName}</span>
                <span className="ml-auto pl-2 font-semibold tabular-nums">{history.get(tm.id)?.[hover] ?? '–'}.</span>
              </p>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-muted">{t('tableViews.feverHint', { max: MAX_SELECTED })}</p>
      <div className="flex flex-wrap gap-1.5">
        {teams.map((tm) => {
          const color = colorOf(tm.id)
          return (
            <button
              key={tm.id}
              type="button"
              aria-pressed={!!color}
              onClick={() => toggle(tm.id)}
              className={clsx(
                'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                color ? 'border-text text-text' : 'border-border text-muted hover:text-text',
              )}
            >
              <span className="size-2.5 rounded-full" style={{ background: color ?? 'var(--border)' }} aria-hidden />
              {tm.shortName}
            </button>
          )
        })}
      </div>
    </Card>
  )
}

// ------------------------------------------------------------ Kreuztabelle

export function CrossTable({ table, fixtures, highlightTeamIds = [] }: { table: Table; fixtures: Fixture[]; highlightTeamIds?: Id[] }) {
  const t = useT()
  const grid = useMemo(() => crossResults(fixtures), [fixtures])
  const teams = table.rows.map((r) => r.team)

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="sticky left-0 z-10 bg-surface px-3 py-2 text-left text-[11px] font-semibold text-subtle uppercase">
                {t('tableViews.homeAway')}
              </th>
              {teams.map((tm) => (
                <th key={tm.id} className="px-1 py-2" title={tm.name}>
                  <TeamLogo team={tm} size={22} className="mx-auto" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {teams.map((home) => (
              <tr key={home.id} className={clsx(highlightTeamIds.includes(home.id) && 'bg-brand-soft')}>
                <th className="sticky left-0 z-10 max-w-40 bg-surface px-3 py-2 text-left font-medium">
                  <Link to={`/team/${home.id}`} className="flex items-center gap-2 hover:text-brand">
                    <TeamLogo team={home} size={18} />
                    <span className="truncate">{home.shortName}</span>
                  </Link>
                </th>
                {teams.map((away) => {
                  if (home.id === away.id) return <td key={away.id} className="bg-surface-3" aria-hidden />
                  const games = grid.get(home.id)?.get(away.id) ?? []
                  const last = games.at(-1)?.score
                  const tone = !last ? undefined : last.home > last.away ? 'bg-brand-soft' : last.home < last.away ? 'bg-live-soft' : 'bg-surface-2'
                  return (
                    <td key={away.id} className={clsx('min-w-12 px-1.5 py-2 text-center tabular-nums', tone)}>
                      {games.length === 0 ? (
                        <span className="text-subtle">–</span>
                      ) : (
                        games.map((g) => (
                          <Link key={g.id} to={`/match/${g.id}`} className="block font-semibold hover:text-brand">
                            {g.score!.home}:{g.score!.away}
                          </Link>
                        ))
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border px-4 py-2.5 text-xs text-muted">{t('tableViews.crossHint')}</p>
    </Card>
  )
}
