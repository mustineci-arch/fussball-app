import clsx from 'clsx'
import { MonitorPlay, Tv } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card, Section } from '../components/ui/Card'
import { Chips } from '../components/ui/Tabs'
import { formatDate } from '../domain/date'
import type { Fixture } from '../domain/types'
import { useT } from '../i18n'
import { RIGHTS_AS_OF, TV_COUNTRIES, tvInfoFor, type Channel } from './broadcasts'
import { setTvCountry, useTvCountry } from './country'

function PriceBadge({ free }: { free: boolean }) {
  const t = useT()
  return (
    <span
      className={clsx(
        'rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap',
        free ? 'bg-brand-soft text-brand' : 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300',
      )}
    >
      {t(free ? 'tv.free' : 'tv.pay')}
    </span>
  )
}

function ChannelRow({ channel }: { channel: Channel }) {
  const t = useT()
  const Icon = channel.kind === 'tv' ? Tv : MonitorPlay
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <Icon className="size-4 shrink-0 text-muted" aria-hidden />
      <span className="flex-1 text-sm font-medium">
        {channel.name}
        <span className="ml-1.5 text-xs font-normal text-subtle">{t(channel.kind === 'tv' ? 'tv.kind.tv' : 'tv.kind.stream')}</span>
      </span>
      <PriceBadge free={channel.free} />
    </li>
  )
}

/** "Wo läuft das Spiel?" – belegte Rechteinhaber je Land, mit Kosten-Hinweis und Quellen */
export function TvSection({ fixture }: { fixture: Fixture }) {
  const t = useT()
  const country = useTvCountry()
  const info = tvInfoFor(fixture, country)
  const asOf = formatDate(RIGHTS_AS_OF) ?? RIGHTS_AS_OF

  return (
    <Section title={t('tv.title')}>
      <Chips options={TV_COUNTRIES.map((c) => ({ id: c, label: t(`tv.country.${c}`) }))} active={country} onChange={setTvCountry} />
      <Card padded={false} className="overflow-hidden">
        {info ? (
          <>
            <ul className="divide-y divide-border">
              {info.channels.map((c) => (
                <ChannelRow key={c.name} channel={c} />
              ))}
            </ul>
            <div className="space-y-1 border-t border-border bg-surface-2 px-4 py-2.5 text-xs text-muted">
              {info.notes.map((note) => (
                <p key={note}>{t(`tv.note.${note}`)}</p>
              ))}
              <p className="text-subtle">
                {t('tv.disclaimer', { date: asOf })}{' '}
                {info.sources.map((url, i) => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-2 hover:text-text">
                    {t('tv.source')} {i + 1}
                  </a>
                )).reduce<ReactNode[]>((acc, el, i) => (i === 0 ? [el] : [...acc, ', ', el]), [])}
              </p>
            </div>
          </>
        ) : (
          <p className="px-4 py-3 text-sm text-muted">{t('tv.unknown')}</p>
        )}
      </Card>
    </Section>
  )
}
