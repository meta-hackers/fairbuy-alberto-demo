import { reasonLabels, type Feedback } from '../lib/feedback'

export default function FeedbackLog({ entries, onUndo }: { entries: Feedback[]; onUndo: (id: string) => void }) {
  return <section className="panel feedback-log" data-testid="feedback-log" aria-label="Registro feedback">
    <h2>LEARN · Feedback and exclusions</h2>
    <p className="hint">Reasons and notes persist across stages and searches. Resetting the demo clears them.</p>
    {entries.length === 0 ? <p>No products excluded. Expand a result to leave feedback.</p> : <ul>
      {entries.map((entry) => <li key={entry.id} data-testid={`feedback-${entry.id}`} data-product-id={entry.productId}>
        <strong>{entry.productName}</strong> — {entry.active ? 'Excluded' : 'Restored'}
        <p>{entry.reasons.map((reason) => reasonLabels[reason] ?? reason).join(', ')}{entry.note ? ` · ${entry.note}` : ''}</p>
        <p className="hint">{entry.clarification}</p>
        {entry.active ? <button type="button" className="button button--small" onClick={() => onUndo(entry.id)} data-testid={`undo-${entry.productId}`}>Undo exclusion / Restore</button> : null}
      </li>)}
    </ul>}
  </section>
}
