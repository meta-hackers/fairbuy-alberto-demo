import { useState, type FormEvent } from 'react'
import type { Characteristic } from '../lib/flow'

interface Props {
  characteristics: Characteristic[]
  onRemove: (id: string) => void
  onAdd: (label: string) => void
  title?: string
  hint?: string
}

export default function CharacteristicsPanel({ characteristics, onRemove, onAdd, title = 'Selected characteristics', hint }: Props) {
  const [draft, setDraft] = useState('')
  const empty = draft.trim().length === 0
  const unsupported = characteristics.filter((characteristic) => !characteristic.supported)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const label = draft.trim()
    if (!label) return
    onAdd(label)
    setDraft('')
  }

  return (
    <section className="characteristics-panel" data-testid="characteristics-panel" aria-label={title}>
      <div className="panel-heading">
        <span className="panel-kicker">{title}</span>
        <span className="soft-tag">{characteristics.length} active</span>
      </div>
      {hint ? <p className="hint">{hint}</p> : null}
      {characteristics.length === 0 ? (
        <p className="empty-inline" data-testid="characteristics-empty">No active characteristics. Add one below.</p>
      ) : (
        <ul className="characteristic-list">
          {characteristics.map((characteristic) => (
            <li className="characteristic-item" key={characteristic.id} data-testid="characteristic-item" data-supported={characteristic.supported ? 'true' : 'false'}>
              <span className="characteristic-item__label">{characteristic.label}</span>
              {!characteristic.supported ? <span className="characteristic-item__warning">unverified</span> : null}
              <button
                type="button"
                onClick={() => onRemove(characteristic.id)}
                aria-label={`Remove characteristic: ${characteristic.label}`}
                data-testid={`remove-characteristic-${characteristic.id}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <form className="characteristic-add" onSubmit={submit}>
        <label htmlFor="custom-characteristic">Add a characteristic</label>
        <div className="characteristic-add__row">
          <input
            id="custom-characteristic"
            type="text"
            value={draft}
            maxLength={80}
            placeholder="e.g. Wi-Fi 7, quiet, 2 TB SSD"
            onChange={(event) => setDraft(event.target.value)}
            data-testid="custom-characteristic-input"
          />
          <button type="submit" className="button button--small" disabled={empty} data-testid="add-characteristic">Add</button>
        </div>
      </form>
      {unsupported.length > 0 ? (
        <p className="info-banner" data-testid="unsupported-note">
          Custom characteristics cannot be verified against synthetic data. They are excluded from matching, and no product is claimed to satisfy them.
        </p>
      ) : null}
    </section>
  )
}
