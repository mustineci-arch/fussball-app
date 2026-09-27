import clsx from 'clsx'
import { useSearchParams } from 'react-router'

export interface TabDef<T extends string> {
  id: T
  label: string
}

/** Liest den aktiven Tab aus ?tab=… – damit sind Tabs teilbar und der Zurück-Button funktioniert. */
export function useTabParam<T extends string>(tabs: readonly TabDef<T>[]): [T, (id: T) => void] {
  const [params, setParams] = useSearchParams()
  const fallback = tabs[0]?.id as T
  const current = tabs.find((t) => t.id === params.get('tab'))?.id ?? fallback
  const setTab = (id: T) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (id === fallback) next.delete('tab')
        else next.set('tab', id)
        return next
      },
      { replace: true, preventScrollReset: true },
    )
  return [current, setTab]
}

interface TabBarProps<T extends string> {
  tabs: readonly TabDef<T>[]
  active: T
  onChange: (id: T) => void
  className?: string
}

export function TabBar<T extends string>({ tabs, active, onChange, className }: TabBarProps<T>) {
  return (
    <div
      role="tablist"
      className={clsx('scrollbar-none -mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 md:mx-0 md:px-0', className)}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.id === active}
          onClick={() => onChange(tab.id)}
          className={clsx(
            'relative shrink-0 px-3 py-3 text-[13px] font-semibold tracking-wide uppercase transition-colors',
            tab.id === active ? 'text-brand' : 'text-muted hover:text-text',
          )}
        >
          {tab.label}
          {tab.id === active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" />}
        </button>
      ))}
    </div>
  )
}

interface ChipsProps<T extends string> {
  options: readonly { id: T; label: string; count?: number }[]
  active: T
  onChange: (id: T) => void
  className?: string
}

export function Chips<T extends string>({ options, active, onChange, className }: ChipsProps<T>) {
  return (
    <div className={clsx('scrollbar-none flex gap-2 overflow-x-auto', className)}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={o.id === active}
          onClick={() => onChange(o.id)}
          className={clsx(
            'shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
            o.id === active
              ? 'border-text bg-text text-surface'
              : 'border-border bg-surface text-muted hover:border-subtle hover:text-text',
          )}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1.5 opacity-60">{o.count}</span>}
        </button>
      ))}
    </div>
  )
}
