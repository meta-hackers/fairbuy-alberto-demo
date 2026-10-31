import type { PriceBounds } from '../lib/flow'
import { formatCHF } from '../lib/sellers'

interface Props {
  bounds: PriceBounds
  value: PriceBounds
  onChange: (value: PriceBounds) => void
  step?: number
  idPrefix?: string
  origin?: 'chat' | 'user-edit' | 'demo-default'
}

export default function PriceRangeSlider({ bounds, value, onChange, step = 100, idPrefix = 'price', origin = 'demo-default' }: Props) {
  const minId = `${idPrefix}-min`
  const maxId = `${idPrefix}-max`
  const span = Math.max(1, bounds.max - bounds.min)
  const minPercent = ((value.min - bounds.min) / span) * 100
  const maxPercent = ((value.max - bounds.min) / span) * 100

  return (
    <div className="price-slider" data-testid="price-slider" data-origin={origin}>
      <p className="hint" data-testid="budget-origin">Budget source: {origin === 'chat' ? 'your chat' : origin === 'user-edit' ? 'your Configure edit' : 'demo starting range'}.</p>
      <div className="price-slider__values" aria-live="polite">
        <span>Minimum price<output htmlFor={minId} data-testid={`${idPrefix}-min-value`}>{formatCHF(value.min)}</output></span>
        <span>Maximum price<output htmlFor={maxId} data-testid={`${idPrefix}-max-value`}>{formatCHF(value.max)}</output></span>
      </div>
      <div className="price-slider__controls">
        <div className="price-slider__track" aria-hidden="true">
          <span className="price-slider__fill" style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }} />
        </div>
        <input
          id={minId}
          data-testid={minId}
          type="range"
          min={bounds.min}
          max={bounds.max}
          step={step}
          value={value.min}
          aria-label="Minimum price"
          aria-valuetext={formatCHF(value.min)}
          onChange={(event) => onChange({ min: Math.min(Number(event.target.value), value.max), max: value.max })}
        />
        <input
          id={maxId}
          data-testid={maxId}
          type="range"
          min={bounds.min}
          max={bounds.max}
          step={step}
          value={value.max}
          aria-label="Maximum price"
          aria-valuetext={formatCHF(value.max)}
          onChange={(event) => onChange({ min: value.min, max: Math.max(Number(event.target.value), value.min) })}
        />
      </div>
      <p className="hint">Drag either thumb or use the arrow keys. The minimum cannot exceed the maximum.</p>
    </div>
  )
}
