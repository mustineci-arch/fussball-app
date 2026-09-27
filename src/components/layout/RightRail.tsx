import { useMatch } from 'react-router'
import { useFixturesByDate } from '../../data/queries'
import { todayKey } from '../../domain/date'
import { isLive, isUpcoming } from '../../domain/status'
import { MatchRow } from '../../features/matches/MatchRow'
import { Card, Section } from '../ui/Card'
import { Skeleton } from '../ui/Skeleton'
import { useT } from '../../i18n'

/** Desktop-Zusatzspalte: "Live jetzt" bzw. nächste Spiele von heute */
export function RightRail() {
  const t = useT()
  const onMatchesPage = useMatch('/')
  const { data, isPending } = useFixturesByDate(todayKey())

  // Auf der Spiele-Seite wäre die Liste doppelt – dort nicht anzeigen.
  if (onMatchesPage) return null

  const live = data?.filter((f) => isLive(f.status)) ?? []
  const upcoming = data?.filter((f) => isUpcoming(f.status)).slice(0, 5) ?? []
  const list = live.length > 0 ? live : upcoming

  return (
    <aside className="hidden w-80 shrink-0 pt-6 xl:block">
      <div className="sticky top-20 space-y-3">
        <Section title={t(live.length > 0 ? 'matches.liveNow' : 'matches.laterToday')}>
          <Card padded={false} className="divide-y divide-border overflow-hidden">
            {isPending &&
              Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="p-3">
                  <Skeleton className="h-5 w-full" />
                </div>
              ))}
            {!isPending && list.length === 0 && <p className="p-4 text-sm text-muted">{t('matches.noMoreToday')}</p>}
            {list.map((f) => (
              <MatchRow key={f.id} fixture={f} />
            ))}
          </Card>
        </Section>
      </div>
    </aside>
  )
}
