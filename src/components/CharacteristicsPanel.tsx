import { useState, type FormEvent } from 'react'
import type { Characteristic } from '../lib/flow'

interface Props {
  characteristics: Characteristic[]
  onRemove: (id: string) => void
  onAdd: (label: string) => void
  title?: string
  hint?: string
}

export default function CharacteristicsPanel({ characteristics, onRemove, onAdd, title = 'Caratteristiche scelte', hint }: Props) {
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
        <span className="soft-tag">{characteristics.length} attive</span>
      </div>
      {hint ? <p className="hint">{hint}</p> : null}
      {characteristics.length === 0 ? (
        <p className="empty-inline" data-testid="characteristics-empty">Nessuna caratteristica attiva. Aggiungine una qui sotto.</p>
      ) : (
        <ul className="characteristic-list">
          {characteristics.map((characteristic) => (
            <li className="characteristic-item" key={characteristic.id} data-testid="characteristic-item" data-supported={characteristic.supported ? 'true' : 'false'}>
              <span className="characteristic-item__label">{characteristic.label}</span>
              {!characteristic.supported ? <span className="characteristic-item__warning">non verificabile</span> : null}
              <button
                type="button"
                onClick={() => onRemove(characteristic.id)}
                aria-label={`Rimuovi caratteristica: ${characteristic.label}`}
                data-testid={`remove-characteristic-${characteristic.id}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <form className="characteristic-add" onSubmit={submit}>
        <label htmlFor="custom-characteristic">Aggiungi una caratteristica</label>
        <div className="characteristic-add__row">
          <input
            id="custom-characteristic"
            type="text"
            value={draft}
            maxLength={80}
            placeholder="Es. Wi-Fi 7, silenzioso, SSD 2 TB"
            onChange={(event) => setDraft(event.target.value)}
            data-testid="custom-characteristic-input"
          />
          <button type="submit" className="button button--small" disabled={empty} data-testid="add-characteristic">Aggiungi</button>
        </div>
      </form>
      {unsupported.length > 0 ? (
        <p className="info-banner" data-testid="unsupported-note">
          Le caratteristiche personalizzate non sono verificabili sui dati sintetici: non vengono usate per il match e nessun prodotto viene dichiarato compatibile con esse.
        </p>
      ) : null}
    </section>
  )
}
