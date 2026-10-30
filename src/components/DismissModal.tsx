import { useEffect, useMemo, useState } from 'react'
import type { DemoCategory } from '../lib/requirements'
import { deriveFeedbackClarification } from '../lib/requirements'

export interface FeedbackDraft {
  reasons: string[]
  note: string
  clarification: string
}

interface Props {
  productName: string
  category: DemoCategory
  onClose: () => void
  onApply: (draft: FeedbackDraft) => void
}

const REASONS: Record<DemoCategory, Array<{ id: string; label: string }>> = {
  pc: [
    { id: 'expensive', label: 'Too expensive' },
    { id: 'ram', label: 'Not enough RAM' },
    { id: 'gpu', label: 'GPU not powerful enough' },
    { id: 'compact', label: 'Too large' },
    { id: 'quiet', label: 'Too noisy' },
    { id: 'other', label: 'Another reason' },
  ],
  relay: [
    { id: 'expensive', label: 'Too expensive' },
    { id: 'capacity', label: 'Load capacity too low' },
    { id: 'compact', label: 'Too large' },
    { id: 'compatibility', label: 'Compatibility to verify' },
    { id: 'wiring', label: 'Wiring or voltage to verify' },
    { id: 'other', label: 'Another reason' },
  ],
}

export default function DismissModal({ productName, category, onClose, onApply }: Props) {
  const [selected, setSelected] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [clarified, setClarified] = useState('')
  const [edited, setEdited] = useState(false)
  const derived = useMemo(() => deriveFeedbackClarification(category, selected, note), [category, selected, note])
  const clarifiedInterpretation = useMemo(() => deriveFeedbackClarification(category, [], clarified), [category, clarified])
  const interpreted = derived.interpretable || clarifiedInterpretation.interpretable
  const hasInput = selected.length > 0 || note.trim().length > 0
  const hasReason = selected.some((reason) => reason !== 'other') || note.trim().length > 0

  useEffect(() => {
    if (!edited) setClarified(derived.interpretable ? derived.text : note.trim())
  }, [derived, edited, note])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose() }
      if (event.key === 'Tab') {
        const controls = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="dismiss-modal"] button:not(:disabled), [data-testid="dismiss-modal"] input, [data-testid="dismiss-modal"] textarea'))
        if (!controls.length) return
        const edge = event.shiftKey ? controls[0] : controls.at(-1)
        if (document.activeElement === edge) { event.preventDefault(); (event.shiftKey ? controls.at(-1) : controls[0])?.focus() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const toggle = (reason: string) => {
    setSelected((current) => current.includes(reason) ? current.filter((item) => item !== reason) : [...current, reason])
    setEdited(false)
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="modal dismiss-modal" role="dialog" aria-modal="true" aria-labelledby="dismiss-title" data-testid="dismiss-modal">
        <div className="modal__header">
          <div><p className="eyebrow">Learn · product feedback</p><h2 id="dismiss-title">Why is this not a good fit?</h2></div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close" autoFocus>×</button>
        </div>
        <p className="muted">Why is {productName} not a good fit? Choose at least one reason or enter a free-text reason. It will be kept out of this request's results; this does not exclude a whole brand.</p>
        <div className="reason-grid" role="group" aria-label="Reasons for dismissal">
          {REASONS[category].map((reason) => (
            <button type="button" key={reason.id} className={`chip chip--reason ${selected.includes(reason.id) ? 'is-active' : ''}`} aria-pressed={selected.includes(reason.id)} onClick={() => toggle(reason.id)} data-testid={`dismiss-reason-${reason.id}`}>
              {selected.includes(reason.id) ? '✓ ' : ''}{reason.label}
            </button>
          ))}
        </div>
        <label className="textarea-label">Or add a note
          <textarea value={note} onChange={(event) => { setNote(event.target.value); setEdited(false) }} placeholder="e.g. I prefer something quieter and smaller…" rows={3} maxLength={280} />
        </label>
        {hasInput ? <label className="textarea-label learned-field">Clarification / learned preference (editable)
          <textarea data-testid="learned-clarification" value={clarified} onChange={(event) => { setClarified(event.target.value); setEdited(true) }} rows={2} placeholder="Describe the preference this demo should learn…" />
        </label> : null}
        <p className="hint" data-testid="learn-interpretation">
            {!hasReason
              ? selected.includes('other') ? 'Please describe the other reason in the text field before applying.' : 'Choose at least one reason or enter a nonempty free-text reason. Nothing is dismissed silently.'
            : interpreted
              ? 'This clarification is editable and will be applied as a soft preference; ranking and match scores update immediately.'
              : 'I cannot confidently map that note to a product attribute. Edit the clarification into a supported preference (for example quieter, compact, more RAM, stronger GPU, lower price, capacity or wiring), or cancel.'}
        </p>
        <div className="modal__actions">
          <button type="button" className="button button--ghost" onClick={onClose} data-testid="dismiss-cancel">Cancel</button>
          <button type="button" className="button button--primary" disabled={!hasReason} onClick={() => onApply({ reasons: selected, note: note.trim(), clarification: clarified.trim() })} data-testid="dismiss-apply">Apply feedback</button>
        </div>
      </div>
    </div>
  )
}
