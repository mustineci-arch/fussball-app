import clsx from 'clsx'
import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  /** Innenabstand – bei Listen meist false, damit Zeilen bis zum Rand gehen */
  padded?: boolean
}

export function Card({ children, className, padded = true }: CardProps) {
  return (
    <div className={clsx('rounded-2xl border border-border bg-surface shadow-card', padded && 'p-4', className)}>
      {children}
    </div>
  )
}

interface SectionProps {
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

export function Section({ title, action, children, className }: SectionProps) {
  return (
    <section className={clsx('space-y-2.5', className)}>
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[13px] font-semibold tracking-wide text-muted uppercase">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
