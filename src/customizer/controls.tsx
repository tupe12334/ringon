// Small form controls built on native inputs.

import { type ReactNode } from 'react'

export function Field({ label, children, hint, icon }: { label: string; children: ReactNode; hint?: string; icon?: ReactNode }) {
  return (
    <div className="field">
      <div className="field-label">
        <span className="field-name">
          {icon}
          {label}
        </span>
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
  icon,
  format = (v) => v.toFixed(1),
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  icon?: ReactNode
  format?: (v: number) => string
  onChange: (v: number) => void
}) {
  return (
    <Field label={label} hint={format(value)} icon={icon}>
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

/** A row of toggle chips. With `icons` each option becomes a picture tile, so long lists
 * (metals, gems, shapes) read as a swatch grid instead of a dropdown. */
export function Chips<T extends string>({
  label,
  value,
  options,
  labels,
  icons,
  icon,
  onChange,
}: {
  label: string
  value: T
  options: readonly T[]
  labels?: Partial<Record<T, string>>
  icons?: Partial<Record<T, ReactNode>>
  icon?: ReactNode
  onChange: (v: T) => void
}) {
  return (
    <Field label={label} icon={icon}>
      <div className={icons ? 'chips tiles' : 'chips'} role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={o === value}
            className={o === value ? 'chip on' : 'chip'}
            onClick={() => onChange(o)}
          >
            {icons?.[o]}
            <span>{labels?.[o] ?? o}</span>
          </button>
        ))}
      </div>
    </Field>
  )
}

export function Toggle({ label, value, icon, onChange }: { label: string; value: boolean; icon?: ReactNode; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      {icon}
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
