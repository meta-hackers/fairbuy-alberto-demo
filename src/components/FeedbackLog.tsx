import { reasonLabels, type Feedback } from '../lib/feedback'

export default function FeedbackLog({ entries, onUndo }: { entries: Feedback[]; onUndo: (id: string) => void }) {
  return <section className="panel feedback-log" data-testid="feedback-log" aria-label="Registro feedback">
    <h2>LEARN · Feedback ed esclusioni</h2>
    <p className="hint">Motivi e note restano salvati tra le fasi e le ricerche. Solo il ripristino della demo li azzera.</p>
    {entries.length === 0 ? <p>Nessun prodotto escluso. Espandi un risultato per lasciare feedback.</p> : <ul>
      {entries.map((entry) => <li key={entry.id} data-testid={`feedback-${entry.id}`} data-product-id={entry.productId}>
        <strong>{entry.productName}</strong> — {entry.active ? 'Escluso' : 'Ripristinato'}
        <p>{entry.reasons.map((reason) => reasonLabels[reason] ?? reason).join(', ')}{entry.note ? ` · ${entry.note}` : ''}</p>
        <p className="hint">{entry.clarification}</p>
        {entry.active ? <button type="button" className="button button--small" onClick={() => onUndo(entry.id)} data-testid={`undo-${entry.productId}`}>Annulla esclusione / Ripristina</button> : null}
      </li>)}
    </ul>}
  </section>
}
