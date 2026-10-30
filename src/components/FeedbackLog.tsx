import { reasonLabels, type Feedback } from '../lib/feedback'

export default function FeedbackLog({ entries, onUndo }: { entries: Feedback[]; onUndo: (id: string) => void }) {
  return <section className="panel feedback-log" data-testid="feedback-log" aria-label="Product feedback">
    <h2>Feedback & dismissed products</h2>
    <p className="hint">Dismissed products stay at the bottom of Discover. Undo restores the product and removes only the preferences learned from that feedback. Later configuration edits are preserved.</p>
    {entries.length === 0 ? <p>No dismissed products. Expand a result to leave feedback.</p> : <ul>
      {entries.map((entry) => <li key={entry.id} data-testid={`feedback-${entry.id}`} data-product-id={entry.productId}>
        <strong>{entry.productName}</strong> — {entry.active ? 'Dismissed — kept at the bottom' : 'Restored'}
        <p>{entry.reasons.length ? entry.reasons.map((reason) => reasonLabels[reason] ?? reason).join(', ') : 'Free-text feedback'}{entry.note ? ` · ${entry.note}` : ''}</p>
        <p className="hint" data-testid={`learned-${entry.id}`}>Learned preference: {entry.clarification}</p>
        {entry.active ? <button type="button" className="button button--small" onClick={() => onUndo(entry.id)} data-testid={`undo-${entry.productId}`}>Undo / Restore</button> : null}
      </li>)}
    </ul>}
  </section>
}
