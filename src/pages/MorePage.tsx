import { Database, Download, Info, Languages, Moon, Share } from 'lucide-react'
import type { ReactNode } from 'react'
import { LanguageSwitch } from '../components/layout/LanguageSwitch'
import { Card, Section } from '../components/ui/Card'
import { PageTitle } from '../components/ui/PageHeader'
import { useT } from '../i18n'
import { provider } from '../providers'
import { promptInstall, useInstallState } from '../pwa/install'

function Row({ icon, title, value }: { icon: ReactNode; title: string; value: ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-muted">{icon}</span>
      <span className="flex-1 text-sm font-medium">{title}</span>
      <span className="text-sm text-muted">{value}</span>
    </div>
  )
}

function InstallRow() {
  const t = useT()
  const state = useInstallState()
  if (state === 'unavailable') return null
  if (state === 'ios') {
    return (
      <div className="flex gap-3 px-4 py-3">
        <Share className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
        <div>
          <p className="text-sm font-medium">{t('pwa.iosHintTitle')}</p>
          <p className="text-sm text-muted">{t('pwa.iosHintText')}</p>
        </div>
      </div>
    )
  }
  return (
    <Row
      icon={<Download className="size-5" />}
      title={t('more.install')}
      value={
        state === 'installed' ? (
          t('more.installed')
        ) : (
          <button type="button" onClick={() => void promptInstall()} className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
            {t('more.installAction')}
          </button>
        )
      }
    />
  )
}

export default function MorePage() {
  const t = useT()
  return (
    <div className="space-y-5">
      <PageTitle>{t('more.title')}</PageTitle>
      <Section title={t('more.settings')}>
        <Card padded={false} className="divide-y divide-border">
          <Row icon={<Languages className="size-5" />} title={t('more.language')} value={<LanguageSwitch />} />
          <InstallRow />
          <Row icon={<Moon className="size-5" />} title={t('more.darkMode')} value={t('more.comingSoon')} />
        </Card>
      </Section>
      <Section title={t('more.about')}>
        <Card padded={false} className="divide-y divide-border">
          <Row icon={<Database className="size-5" />} title={t('more.dataSource')} value={provider.isDemo ? t('more.demoData') : 'ESPN'} />
          <Row icon={<Info className="size-5" />} title={t('more.version')} value={__APP_VERSION__} />
        </Card>
        <p className="px-1 text-xs text-muted">{t('more.disclaimer')}</p>
      </Section>
    </div>
  )
}
