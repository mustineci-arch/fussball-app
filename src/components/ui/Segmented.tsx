import clsx from 'clsx'

interface SegmentedProps<T extends string> {
  label: string
  options: readonly { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
}

/** Kompakter Umschalter mit wenigen Optionen (Sprache, Design, TV-Land) */
export function Segmented<T extends string>({ label, options, value, onChange }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border border-border bg-surface-2 p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={clsx(
            'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
            value === o.id ? 'bg-text text-surface' : 'text-muted hover:text-text',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
