import { useState, type FormEvent } from 'react'
import type { Characteristic, CharacteristicMode } from '../lib/flow'

interface Props {
  characteristics: Characteristic[]
  onRemove: (id: string) => void
  onAdd: (label: string) => void
  onMode?: (id: string, mode: CharacteristicMode) => void
  title?: string
  hint?: string
}

export default function CharacteristicsPanel({ characteristics, onRemove, onAdd, onMode, title = 'Requirements', hint }: Props) {
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
              <span className="characteristic-item__label">{onMode ? characteristic.label.replace(/ · (required|preference only|high priority|normal priority)$/, '') : characteristic.label}</span>
              {!characteristic.supported ? <span className="characteristic-item__warning">unverified</span> : null}
              {onMode && (characteristic.kind === 'gpu' || characteristic.kind === 'ram') ? <select aria-label={`${characteristic.kind.toUpperCase()} priority`}
                value={characteristic.mode ?? 'preferred'} onChange={(event) => onMode(characteristic.id, event.target.value as CharacteristicMode)}>
                <option value="required">High priority</option><option value="preferred">Normal priority</option>
              </select> : null}
              <button
                type="button"
                onClick={() => onRemove(characteristic.id)}
                aria-label={`Remove requirement: ${characteristic.label}`}
                data-testid={`remove-characteristic-${characteristic.id}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <form className="characteristic-add" onSubmit={submit}>
        <label htmlFor="custom-characteristic">Add a requirement</label>
        <div className="characteristic-add__row">
          <input
            id="custom-characteristic"
            type="text"
            value={draft}
            maxLength={80}
            placeholder="e.g. compact, quiet, Wi-Fi 7"
            onChange={(event) => setDraft(event.target.value)}
            data-testid="custom-characteristic-input"
          />
          <button type="submit" className="button button--small" disabled={empty} data-testid="add-characteristic">Add</button>
        </div>
      </form>
      {unsupported.length > 0 ? (
        <p className="info-banner" data-testid="unsupported-note">
          Unverified requirements are saved for review, but do not affect ranking or establish compatibility.
        </p>
      ) : null}
    </section>
  )
}
