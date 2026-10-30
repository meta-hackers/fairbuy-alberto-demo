import type { RankedProduct } from '../lib/flow'
import { formatCHFRange } from '../lib/sellers'

interface Props {
  ranked: RankedProduct
  onOpen: () => void
  onDismiss: () => void
  expanded: boolean
  onToggle: () => void
  dismissedNote?: string | null
  onRestore?: (() => void) | null
  highlighted?: boolean
}

export function formatScore(score: number): string {
  return `${Number.isInteger(score) ? score : score.toFixed(1)}%`
}

export function personalizedLine(ranked: RankedProduct): string {
  const first = ranked.reasons[0] ?? ranked.tradeoffs[0] ?? ranked.unknown[0]
  if (first) return `I thought you would like this because ${first.charAt(0).toLowerCase()}${first.slice(1)}`
  return 'I thought you would like this because it is the closest available option in this synthetic demo catalog.'
}

export default function ProductCard({ ranked, onOpen, onDismiss, expanded, onToggle, dismissedNote, onRestore, highlighted }: Props) {
  const { product, score, label, offerRange, retailers, reasons, tradeoffs, unknown } = ranked
  const c = product.config
  const dismissed = Boolean(dismissedNote)
  return <article className={`product-card${dismissed ? ' product-card--dismissed' : ''}${highlighted ? ' product-card--updated' : ''}`} data-testid={`product-card-${product.id}`} data-score={score} data-dismissed={dismissed ? 'true' : 'false'}>
    <button type="button" className="product-summary" data-testid={`expand-${product.id}`} aria-expanded={expanded} aria-controls={`details-${product.id}`} onClick={onToggle}>
      <span className="product-summary__heading">
        <span className="product-summary__name">{product.name}</span>
        <span className="match-score" data-testid={`match-${product.id}`} data-label={label}>{label} · {formatScore(score)}</span>
      </span>
      <span className="product-summary__offer">
        <strong data-testid={`price-${product.id}`}>{offerRange ? formatCHFRange(offerRange[0], offerRange[1]) : 'Price unknown'}</strong>
        <span className="retailer-tags" data-testid={`retailers-${product.id}`} aria-label={`Retailers in this price range: ${retailers.join(', ')}`}>
          {retailers.map((retailer) => <span className="retailer-tag" key={retailer}>{retailer}</span>)}
        </span>
      </span>
      <span aria-hidden="true">{expanded ? '−' : '+'}</span>
    </button>
    <p className="personalized-reason" data-testid={`personalized-${product.id}`}>{personalizedLine(ranked)}</p>
    {dismissed ? <p className="dismissed-note" data-testid={`dismissed-note-${product.id}`}>{dismissedNote}</p> : null}
    <div id={`details-${product.id}`} className="product-details" hidden={!expanded}>
      <p>{c.cpu} · {c.gpu} · {c.ramGB} GB RAM · {c.storageGB / 1000} TB · {c.condition}</p>
      <p className="hint">{product.tagline}</p>
      <div className="match-explanation">
        <h3>Why this is ranked here</h3>
        <ul className="reason-list" data-testid={`reasons-${product.id}`}>
          {reasons.length ? reasons.map((reason) => <li key={reason}>{reason}</li>) : <li>No specific preference is matched yet; the score reflects the price range only.</li>}
        </ul>
        {tradeoffs.length ? <>
          <h3>Trade-offs</h3>
          <ul className="reason-list reason-list--tradeoff" data-testid={`tradeoffs-${product.id}`}>
            {tradeoffs.map((tradeoff) => <li key={tradeoff}>{tradeoff}</li>)}
          </ul>
        </> : null}
        {unknown.length ? <p className="evidence-note" data-testid={`unknown-${product.id}`}>{unknown.join(' ')}</p> : null}
      </div>
      <p className="hint">Scores express preference adherence, not a guarantee. Price ranges use delivered totals (item, shipping and fees, VAT included) across the listed retailer offers.</p>
      <div className="product-actions">
        {dismissed && onRestore
          ? <button type="button" className="button" data-testid={`restore-${product.id}`} onClick={onRestore}>Restore</button>
          : <>
            <button type="button" className="button button--primary" data-testid={`buy-${product.id}`} onClick={onOpen}>Purchase options →</button>
            <button type="button" className="text-button" onClick={onDismiss} data-testid={`dismiss-${product.id}`}>Not for me</button>
          </>}
      </div>
    </div>
  </article>
}
