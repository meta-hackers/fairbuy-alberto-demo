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
  { id: 'expensive', label: 'Too expensive' },
  { id: 'other', label: 'Another reason' },
]

export default function DismissModal({ product, brief, onClose, onApply }: Props) {
  const [selected, setSelected] = useState<DismissReason[]>([])
  const [note, setNote] = useState('')
  const [clarification, setClarification] = useState<Clarification>({ ram: 'keep', gpu: 'keep' })
  const prompts = useMemo(() => clarificationsFor(selected, brief), [selected, brief])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'Tab') {
        const controls = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="dismiss-modal"] button:not(:disabled), [data-testid="dismiss-modal"] input, [data-testid="dismiss-modal"] textarea'))
        const edge = event.shiftKey ? controls[0] : controls.at(-1)
        if (document.activeElement === edge) { event.preventDefault(); (event.shiftKey ? controls.at(-1) : controls[0])?.focus() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const toggle = (reason: DismissReason) => setSelected((current) => current.includes(reason) ? current.filter((item) => item !== reason) : [...current, reason])
  const reasons = [
    ...baseReasons.slice(0, 1),
    { id: 'ram' as const, label: `Insufficient RAM (${product.config.ramGB} GB)` },
    { id: 'gpu' as const, label: 'GPU is not powerful enough' },
    { id: 'avoidGpu' as const, label: `I want to avoid ${product.config.gpu}` },
    ...baseReasons.slice(1),
  ]
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal dismiss-modal" role="dialog" aria-modal="true" aria-labelledby="dismiss-title" data-testid="dismiss-modal">
        <div className="modal__header">
          <div><p className="eyebrow">Product feedback</p><h2 id="dismiss-title">Why is this not a good fit?</h2></div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close" autoFocus>×</button>
        </div>
        <p className="muted">{product.name} will be excluded. You can restore it in Learn. Requirements change only when you explicitly select a new priority.</p>
        <div className="reason-grid" role="group" aria-label="Reasons for exclusion">
          {reasons.map((reason) => (
            <button type="button" key={reason.id} className={`chip chip--reason ${selected.includes(reason.id) ? 'is-active' : ''}`} aria-pressed={selected.includes(reason.id)} onClick={() => toggle(reason.id)}>
              {selected.includes(reason.id) ? '✓ ' : ''}{reason.label}
            </button>
          ))}
        </div>
        {prompts.map((prompt) => (
          <fieldset className="clarify-box" key={prompt.key}>
            <legend>{prompt.question}</legend>
            <p className="hint">Declining one product does not create a mandatory rule. You decide.</p>
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
        <label className="textarea-label">Or add a note
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. I prefer a quieter GPU…" rows={3} maxLength={280} />
        </label>
        <p className="hint">The note is saved in the feedback log. No automatic constraints are added.</p>
        <div className="modal__actions">
          <button type="button" className="button button--ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="button button--ghost" onClick={() => onApply(['skip'], clarification, '')} data-testid="dismiss-skip">Skip without a reason</button>
          <button type="button" className="button button--primary" disabled={selected.length === 0 && !note.trim()} onClick={() => onApply(selected.length ? selected : ['other'], clarification, note.trim())} data-testid="dismiss-apply">Apply feedback</button>
        </div>
      </div>
    </div>
  )
}
