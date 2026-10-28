import { useEffect, useMemo, useState } from 'react'
import type { Brief, DismissReason, Product } from '../data/fixtures'
import { clarificationsFor, type Clarification } from '../lib/matching'

interface Props {
  product: Product
  brief: Brief
  onClose: () => void
  onApply: (reasons: DismissReason[], clarification: Clarification, note: string) => void
}

const baseReasons: Array<{ id: DismissReason; label: string }> = [
  { id: 'expensive', label: 'Troppo caro' },
  { id: 'other', label: 'Un altro motivo' },
]

export default function DismissModal({ product, brief, onClose, onApply }: Props) {
  const [selected, setSelected] = useState<DismissReason[]>([])
  const [note, setNote] = useState('')
  const [clarification, setClarification] = useState<Clarification>({ ram: 'keep', gpu: 'keep' })
  const prompts = useMemo(() => clarificationsFor(selected, brief), [selected, brief])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const toggle = (reason: DismissReason) => setSelected((current) => current.includes(reason) ? current.filter((item) => item !== reason) : [...current, reason])
  const reasons = [
    ...baseReasons.slice(0, 1),
    { id: 'ram' as const, label: `RAM insufficiente (${product.config.ramGB} GB)` },
    { id: 'gpu' as const, label: 'GPU non abbastanza potente' },
    { id: 'avoidGpu' as const, label: `Voglio evitare ${product.config.gpu}` },
    ...baseReasons.slice(1),
  ]
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal dismiss-modal" role="dialog" aria-modal="true" aria-labelledby="dismiss-title" data-testid="dismiss-modal">
        <div className="modal__header">
          <div><p className="eyebrow">Feedback sul prodotto</p><h2 id="dismiss-title">Perché non è adatto?</h2></div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Chiudi" autoFocus>×</button>
        </div>
        <p className="muted">{product.name} verrà escluso. Solo una scelta esplicita RAM/GPU cambia le caratteristiche; gli altri motivi e le note non impongono filtri.</p>
        <div className="reason-grid" role="group" aria-label="Motivi del rifiuto">
          {reasons.map((reason) => (
            <button type="button" key={reason.id} className={`chip chip--reason ${selected.includes(reason.id) ? 'is-active' : ''}`} aria-pressed={selected.includes(reason.id)} onClick={() => toggle(reason.id)}>
              {selected.includes(reason.id) ? '✓ ' : ''}{reason.label}
            </button>
          ))}
        </div>
        {prompts.map((prompt) => (
          <fieldset className="clarify-box" key={prompt.key}>
            <legend>{prompt.question}</legend>
            <p className="hint">Un rifiuto non crea una regola obbligatoria: scegli tu.</p>
            {prompt.options.map((option) => (
              <label className="radio-line" key={option.value}>
                <input
                  type="radio"
                  name={`clarify-${prompt.key}`}
                  checked={clarification[prompt.key] === option.value}
                  onChange={() => setClarification((current) => ({ ...current, [prompt.key]: option.value }))}
                />
                {option.label}
              </label>
            ))}
          </fieldset>
        ))}
        <label className="textarea-label">Oppure scrivi il motivo
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Es. preferisco una GPU più silenziosa…" rows={3} maxLength={280} />
        </label>
        <p className="hint">La nota resta nel registro feedback. Nessun vincolo automatico.</p>
        <div className="modal__actions">
          <button type="button" className="button button--ghost" onClick={onClose}>Annulla</button>
          <button type="button" className="button button--ghost" onClick={() => onApply(['skip'], clarification, '')} data-testid="dismiss-skip">Salta senza motivo</button>
          <button type="button" className="button button--primary" disabled={selected.length === 0 && !note.trim()} onClick={() => onApply(selected.length ? selected : ['other'], clarification, note.trim())} data-testid="dismiss-apply">Applica feedback</button>
        </div>
      </div>
    </div>
  )
}
