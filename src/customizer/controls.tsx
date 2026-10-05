// Small form controls built on native inputs.

import { useId, type ReactNode } from 'react'

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="field">
      <div className="field-label">
        <span>{label}</span>
        {hint && <span className="field-hint">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  format = (v) => v.toFixed(1),
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format?: (v: number) => string
  onChange: (v: number) => void
}) {
  return (
    <Field label={label} hint={format(value)}>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  )
}

/** A row of toggle chips; good for ≤ 8 options on a phone. */
export function Chips<T extends string>({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string
  value: T
  options: readonly T[]
  labels?: Partial<Record<T, string>>
  onChange: (v: T) => void
}) {
  return (
    <Field label={label}>
      <div className="chips" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={o === value}
            className={o === value ? 'chip on' : 'chip'}
            onClick={() => onChange(o)}
          >
            {labels?.[o] ?? o}
          </button>
        ))}
      </div>
    </Field>
  )
}

export function Select<T extends string>({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string
  value: T
  options: readonly T[]
  labels?: Partial<Record<T, string>>
  onChange: (v: T) => void
}) {
  const id = useId()
  return (
    <Field label={label}>
      <select id={id} aria-label={label} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {labels?.[o] ?? o}
          </option>
        ))}
      </select>
    </Field>
  )
}

export function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

export function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label} hint={value}>
      <input type="color" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  )
}
