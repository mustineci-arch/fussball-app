import { Database, Info, Moon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card, Section } from '../components/ui/Card'
import { PageTitle } from '../components/ui/PageHeader'
import { provider } from '../providers'

function Row({ icon, title, value }: { icon: ReactNode; title: string; value: ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-muted">{icon}</span>
      <span className="flex-1 text-sm font-medium">{title}</span>
      <span className="text-sm text-muted">{value}</span>
    </div>
  )
}

export default function MorePage() {
  return (
    <div className="space-y-5">
      <PageTitle>Mehr</PageTitle>
      <Section title="Einstellungen">
        <Card padded={false} className="divide-y divide-border">
          <Row icon={<Moon className="size-5" />} title="Dunkles Design" value="kommt bald" />
        </Card>
      </Section>
      <Section title="Über die App">
        <Card padded={false} className="divide-y divide-border">
          <Row icon={<Database className="size-5" />} title="Datenquelle" value={provider.displayName} />
          <Row icon={<Info className="size-5" />} title="Version" value={__APP_VERSION__} />
        </Card>
        <p className="px-1 text-xs text-muted">
          Private Nutzung. Spielstände, Tabellen und Statistiken stammen von der Datenquelle und werden
          ohne Gewähr angezeigt. Live-Daten können einige Sekunden verzögert sein.
        </p>
      </Section>
    </div>
  )
}
