import clsx from 'clsx'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { addDays, formatShortDate, formatWeekday, relativeDayLabel, todayKey } from '../../domain/date'

interface DateStripProps {
  value: string
  onChange: (dateKey: string) => void
}

const VISIBLE_OFFSETS = [-3, -2, -1, 0, 1, 2, 3]

export function DateStrip({ value, onChange }: DateStripProps) {
  const today = todayKey()
  const inputRef = useRef<HTMLInputElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)
  const days = VISIBLE_OFFSETS.map((o) => addDays(value, o))

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [value])

  const openPicker = () => {
    const input = inputRef.current
    if (!input) return
    try {
      input.showPicker()
    } catch {
      input.focus()
      input.click()
    }
  }

  const arrowClass =
    'grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface-3 hover:text-text'

  return (
    <div className="flex items-center gap-1">
      <button type="button" className={arrowClass} onClick={() => onChange(addDays(value, -1))} aria-label="Vorheriger Tag">
        <ChevronLeft className="size-5" />
      </button>

      <div className="scrollbar-none flex flex-1 snap-x gap-1 overflow-x-auto">
        {days.map((day) => {
          const active = day === value
          const relative = relativeDayLabel(day, today)
          return (
            <button
              key={day}
              ref={active ? activeRef : undefined}
              type="button"
              onClick={() => onChange(day)}
              aria-current={active ? 'date' : undefined}
              className={clsx(
                'flex min-w-[62px] flex-1 snap-center flex-col items-center rounded-xl px-2 py-1.5 transition-colors',
                active ? 'bg-text text-surface' : 'text-muted hover:bg-surface-3 hover:text-text',
              )}
            >
              <span className="text-[13px] font-semibold">{relative ?? formatWeekday(day)}</span>
              <span className={clsx('text-[11px]', active ? 'opacity-75' : 'text-subtle')}>{formatShortDate(day)}</span>
            </button>
          )
        })}
      </div>

      <button type="button" className={arrowClass} onClick={() => onChange(addDays(value, 1))} aria-label="Nächster Tag">
        <ChevronRight className="size-5" />
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={openPicker}
          className={clsx(arrowClass, value !== today && 'text-brand')}
          aria-label="Datum im Kalender wählen"
        >
          <CalendarDays className="size-5" />
        </button>
        <input
          ref={inputRef}
          type="date"
          value={value}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0"
        />
      </div>
    </div>
  )
}
