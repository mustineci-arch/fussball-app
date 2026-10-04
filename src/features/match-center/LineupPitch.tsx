import { Link } from 'react-router'
import { PlayerAvatar, TeamLogo } from '../../components/media'
import { Card, Section } from '../../components/ui/Card'
import type { Lineup, LineupPlayer, Team } from '../../domain/types'
import { useT } from '../../i18n'
import type { PlayerPhoto } from '../../media/wikimedia'
import { RatingBadge } from './RatingBadge'

/** Frei lizenzierte Fotos je Spieler-ID (Nachweise stehen unter der Aufstellung) */
type Photos = Record<string, PlayerPhoto | null> | undefined
/** Noten je Spieler-ID (leer vor Anpfiff) */
type Ratings = Map<string, number> | undefined

function PitchPlayer({ entry, photos, ratings }: { entry: LineupPlayer; photos: Photos; ratings: Ratings }) {
  const label = entry.player.shortName ?? entry.player.name
  const rating = ratings?.get(entry.player.id)
  return (
    <Link to={`/player/${entry.player.id}`} className="relative flex w-16 flex-col items-center gap-1 hover:opacity-85 md:w-20" title={entry.player.name}>
      {rating !== undefined && <RatingBadge rating={rating} className="absolute -top-1.5 right-0 z-10 min-w-0 px-0.5 text-[10px] md:right-2" />}
      <PlayerAvatar name={entry.player.name} photoUrl={photos?.[entry.player.id]?.url ?? entry.player.photoUrl} shirtNumber={entry.shirtNumber} size={34} className="ring-2 ring-white/70 rounded-full" />
      <span className="max-w-full truncate rounded bg-black/35 px-1 text-[10.5px] leading-tight font-medium text-white md:text-xs">{label}</span>
    </Link>
  )
}

/** Gruppiert Startspieler nach Reihe (1 = Torwart). */
function rowsOf(lineup: Lineup): LineupPlayer[][] {
  const rows = new Map<number, LineupPlayer[]>()
  for (const p of lineup.starters) {
    if (p.gridRow === undefined) continue
    rows.set(p.gridRow, [...(rows.get(p.gridRow) ?? []), p])
  }
  return [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([, players]) => players.sort((a, b) => (a.gridCol ?? 0) - (b.gridCol ?? 0)))
}

function HalfPitch({ lineup, side, photos, ratings }: { lineup: Lineup; side: 'home' | 'away'; photos: Photos; ratings: Ratings }) {
  const rows = rowsOf(lineup)
  const n = rows.length
  return (
    <>
      {rows.map((players, i) => {
        // Torwart bei 7 %, vorderste Reihe bei 44 % der Feldlänge
        const offset = n > 1 ? 7 + (i * 37) / (n - 1) : 25
        const top = side === 'home' ? 100 - offset : offset
        // Gastteam spielt "von oben nach unten" – links/rechts spiegeln.
        const ordered = side === 'home' ? players : [...players].reverse()
        return (
          <div key={i} className="absolute inset-x-0 flex -translate-y-1/2 justify-around px-1" style={{ top: `${top}%` }}>
            {ordered.map((p) => (
              <PitchPlayer key={p.player.id} entry={p} photos={photos} ratings={ratings} />
            ))}
          </div>
        )
      })}
    </>
  )
}

function PitchMarkings() {
  const line = 'absolute border-[var(--pitch-line)]'
  return (
    <div aria-hidden className="pointer-events-none absolute inset-3">
      <div className={`${line} inset-0 rounded-sm border-2`} />
      <div className={`${line} inset-x-0 top-1/2 border-t-2`} />
      <div className={`${line} top-1/2 left-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2`} />
      <div className={`${line} top-0 left-1/2 h-[16%] w-[55%] -translate-x-1/2 border-2 border-t-0`} />
      <div className={`${line} bottom-0 left-1/2 h-[16%] w-[55%] -translate-x-1/2 border-2 border-b-0`} />
    </div>
  )
}

function TeamLabel({ team, lineup }: { team: Team; lineup?: Lineup }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <TeamLogo team={team} size={20} />
      <span className="font-semibold">{team.shortName}</span>
      {lineup?.formation && <span className="ml-auto font-bold text-muted tabular-nums">{lineup.formation}</span>}
    </div>
  )
}

function Bench({ team, lineup, photos, ratings }: { team: Team; lineup: Lineup; photos: Photos; ratings: Ratings }) {
  const t = useT()
  return (
    <div className="min-w-0 space-y-2">
      <TeamLabel team={team} />
      {lineup.coach && <p className="text-xs text-muted">{t('match.coach')}: <span className="font-medium text-text">{lineup.coach}</span></p>}
      <ul className="space-y-1.5">
        {lineup.substitutes.map((p) => (
          <li key={p.player.id}>
            <Link to={`/player/${p.player.id}`} className="flex items-center gap-2 rounded-lg py-0.5 text-sm hover:text-brand">
              <span className="w-5 text-right text-xs font-semibold text-subtle tabular-nums">{p.shirtNumber ?? ''}</span>
              <PlayerAvatar name={p.player.name} photoUrl={photos?.[p.player.id]?.url} size={24} />
              <span className="flex-1 truncate">{p.player.name}</span>
              {ratings?.has(p.player.id) && <RatingBadge rating={ratings.get(p.player.id)!} />}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface LineupPitchProps {
  homeTeam: Team
  awayTeam: Team
  home?: Lineup
  away?: Lineup
  photos?: Photos
  ratings?: Ratings
}

export function LineupPitch({ homeTeam, awayTeam, home, away, photos, ratings }: LineupPitchProps) {
  const t = useT()
  const hasGrid = [home, away].every((l) => !l || l.starters.every((p) => p.gridRow !== undefined))

  return (
    <div className="space-y-4">
      <Card padded={false} className="overflow-hidden">
        <div className="border-b border-border px-4 py-2.5">
          <TeamLabel team={awayTeam} lineup={away} />
        </div>
        {hasGrid ? (
          <div className="relative mx-auto aspect-[68/100] max-h-[760px] w-full bg-pitch">
            <PitchMarkings />
            {away && <HalfPitch lineup={away} side="away" photos={photos} ratings={ratings} />}
            {home && <HalfPitch lineup={home} side="home" photos={photos} ratings={ratings} />}
          </div>
        ) : (
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            {[away, home].map((l, i) =>
              l ? (
                <ul key={i} className="space-y-1.5">
                  {l.starters.map((p) => (
                    <li key={p.player.id} className="text-sm">
                      <Link to={`/player/${p.player.id}`} className="hover:text-brand">
                        {p.shirtNumber} {p.player.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null,
            )}
          </div>
        )}
        <div className="border-t border-border px-4 py-2.5">
          <TeamLabel team={homeTeam} lineup={home} />
        </div>
      </Card>

      <Section title={t('match.bench')}>
        <Card className="grid gap-6 sm:grid-cols-2">
          {home ? <Bench team={homeTeam} lineup={home} photos={photos} ratings={ratings} /> : <p className="text-sm text-muted">{homeTeam.shortName}: {t('common.notAvailable')}</p>}
          {away ? <Bench team={awayTeam} lineup={away} photos={photos} ratings={ratings} /> : <p className="text-sm text-muted">{awayTeam.shortName}: {t('common.notAvailable')}</p>}
        </Card>
      </Section>
    </div>
  )
}
