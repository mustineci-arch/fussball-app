import clsx from 'clsx'
import { ExternalLink, MonitorPlay, Tv } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card, Section } from '../components/ui/Card'
import { formatDate } from '../domain/date'
import type { Fixture } from '../domain/types'
import { useFixtureWithTv, useTeamCountries } from '../data/queries'
import { useLanguage, useT } from '../i18n'
import { ALL_COUNTRIES, countryLabel, flagOf, hasRightsList, RIGHTS_AS_OF, TV_COUNTRIES, tvWorldwide, type Channel } from './broadcasts'
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
    <li>
      <a
        href={channel.url}
        onClick={(e) => !channel.url && e.preventDefault()}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2"
        aria-label={t('tv.openChannel', { name: channel.name })}
      >
        <Icon className="size-4 shrink-0 text-muted" aria-hidden />
        <span className="flex-1 text-sm font-medium">
          {channel.name}
          <span className="ml-1.5 text-xs font-normal text-subtle">{t(channel.kind === 'tv' ? 'tv.kind.tv' : 'tv.kind.stream')}</span>
        </span>
        <PriceBadge free={channel.free} />
        <ExternalLink className="size-4 shrink-0 text-subtle" aria-hidden />
      </a>
    </li>
  )
}

/** Kompakte, anklickbare Sender – z. B. unter einem Spiel in der Liste */
export function ChannelLinks({ channels }: { channels: Channel[] }) {
  const t = useT()
  return (
    <div className="flex flex-wrap gap-1.5">
      {channels.map((c) => {
        const Icon = c.kind === 'tv' ? Tv : MonitorPlay
        return (
          <a
            key={c.name}
            href={c.url}
            onClick={(e) => !c.url && e.preventDefault()}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('tv.openChannel', { name: c.name })}
            className={clsx(
              'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors',
              c.free
                ? 'border-brand/40 bg-brand-soft text-brand hover:border-brand'
                : 'border-border bg-surface text-text hover:border-subtle',
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {c.name}
            {c.free && <span className="font-normal opacity-80">· {t('tv.free')}</span>}
            <ExternalLink className="size-3 opacity-60" aria-hidden />
          </a>
        )
      })}
    </div>
  )
}

/** Auswahl "Mein Land": alle Länder der Welt, Länder mit Senderliste zuerst */
export function TvCountrySelect({ className }: { className?: string }) {
  const t = useT()
  const language = useLanguage()
  const country = useTvCountry()
  const label = (c: string) => `${flagOf(c)} ${countryLabel(c, language)}`
  const byName = (list: readonly string[]) => [...list].sort((a, b) => countryLabel(a, language).localeCompare(countryLabel(b, language), language))
  return (
    <label className={clsx('flex items-center gap-2 text-sm', className)}>
      <span className="shrink-0 text-muted">{t('tv.myCountry')}</span>
      <select
        value={country}
        onChange={(e) => setTvCountry(e.target.value)}
        className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-text"
      >
        <optgroup label={t('tv.withList')}>
          {byName(TV_COUNTRIES).map((c) => (
            <option key={c} value={c}>
              {label(c)}
            </option>
          ))}
        </optgroup>
        <optgroup label={t('tv.allCountries')}>
          {byName(ALL_COUNTRIES.filter((c) => !hasRightsList(c))).map((c) => (
            <option key={c} value={c}>
              {label(c)}
            </option>
          ))}
        </optgroup>
      </select>
    </label>
  )
}

function CountryHeader({ country, homeOf }: { country: string; homeOf?: string[] }) {
  const t = useT()
  const language = useLanguage()
  return (
    <p className="flex flex-wrap items-center gap-x-2 bg-surface-2 px-4 py-2 text-xs font-bold tracking-wide uppercase">
      <span aria-hidden className="text-base leading-none">{flagOf(country)}</span>
      {countryLabel(country, language)}
      {homeOf && <span className="font-medium tracking-normal text-muted normal-case">· {t('tv.homeOf', { teams: homeOf.join(' & ') })}</span>}
    </p>
  )
}

function Sources({ sources }: { sources: string[] }) {
  const t = useT()
  if (!sources.length) return null
  return (
    <>
      {sources
        .map((url, i) => (
          <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-2 hover:text-text">
            {t('tv.source')} {i + 1}
          </a>
        ))
        .reduce<ReactNode[]>((acc, el, i) => (i === 0 ? [el] : [...acc, ', ', el]), [])}
    </>
  )
}

/** "Wo läuft das Spiel?" – alle bekannten Sender weltweit, gewähltes Land zuerst */
export function TvSection({ fixture }: { fixture: Fixture }) {
  const t = useT()
  const country = useTvCountry()
  const teamCountries = useTeamCountries(fixture)
  const withTv = useFixtureWithTv(fixture, [country, ...Object.values(teamCountries)])
  const all = tvWorldwide(withTv, country, teamCountries)
  const asOf = formatDate(RIGHTS_AS_OF) ?? RIGHTS_AS_OF

  return (
    <Section title={t('tv.title')}>
      <TvCountrySelect />
      <Card padded={false} className="overflow-hidden">
        {all.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted">{t('tv.unknown')}</p>
        ) : (
          <div className="divide-y divide-border">
            {all.map(({ country: c, info, homeOf }) => (
              <div key={c}>
                <CountryHeader country={c} homeOf={homeOf} />
                <ul className="divide-y divide-border">
                  {info.channels.map((ch) => (
                    <ChannelRow key={ch.name} channel={ch} />
                  ))}
                </ul>
                {(info.notes.length > 0 || info.sources.length > 0 || info.reported) && (
                  <div className="space-y-0.5 px-4 pb-2.5 text-xs text-muted">
                    {info.notes.map((note) => (
                      <p key={note}>{t(`tv.note.${note}`)}</p>
                    ))}
                    <p className="text-subtle">
                      {info.reported ? t('tv.reported') : t('tv.disclaimer', { date: asOf })} <Sources sources={info.sources} />
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
      {all.length > 0 && all.every((x) => x.country !== country) && (
        <p className="text-xs text-muted">{t('tv.noneInCountry')}</p>
      )}
    </Section>
  )
}

/** Kompakte Senderliste für alle Länder – unter einem Spiel in der Live-Liste */
export function WorldChannelLinks({ fixture }: { fixture: Fixture }) {
  const t = useT()
  const country = useTvCountry()
  const teamCountries = useTeamCountries(fixture)
  const withTv = useFixtureWithTv(fixture, [country, ...Object.values(teamCountries)])
  const all = tvWorldwide(withTv, country, teamCountries)
  if (all.length === 0) return <p className="text-xs text-subtle">{t('tv.noChannel')}</p>
  return (
    <div className="space-y-1.5">
      {all.map(({ country: c, info }) => (
        <div key={c} className="flex items-start gap-2">
          <span aria-hidden className="pt-1 text-base leading-none" title={c}>{flagOf(c)}</span>
          <ChannelLinks channels={info.channels} />
        </div>
      ))}
    </div>
  )
}
