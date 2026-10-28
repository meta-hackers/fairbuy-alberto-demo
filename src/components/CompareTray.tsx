import { useEffect } from 'react'
import type { MatchResult, Product } from '../data/fixtures'
import { formatCHF } from '../lib/sellers'

interface Props {
  products: Product[]
  onOpen: () => void
  onRemove: (id: string) => void
  onClear: () => void
}

export function CompareTray({ products, onOpen, onRemove, onClear }: Props) {
  if (products.length === 0) return null
  return (
    <div className="compare-tray" role="region" aria-label="Products selected for comparison">
      <div className="compare-tray__items">
        {products.map((product) => (
          <span className="compare-pill" key={product.id}>
            {product.name}
            <button type="button" onClick={() => onRemove(product.id)} aria-label={`Remove ${product.name} from comparison`}>×</button>
          </span>
        ))}
      </div>
      <div className="compare-tray__actions">
        <button type="button" className="button button--ghost button--small" onClick={onClear}>Clear</button>
        <button type="button" className="button button--primary button--small" onClick={onOpen} data-testid="open-compare">Compare {products.length} products</button>
      </div>
    </div>
  )
}

export function CompareModal({ products, matches, onClose }: { products: Product[]; matches: Record<string, MatchResult>; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal compare-modal" role="dialog" aria-modal="true" aria-labelledby="compare-title" data-testid="compare-modal">
        <div className="modal__header">
          <div><p className="eyebrow">Illustrative comparison</p><h2 id="compare-title">Products compared</h2></div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close comparison" autoFocus>×</button>
        </div>
        <div className="compare-grid">
          {products.map((product) => {
            const match = matches[product.id]
            return (
              <article className="compare-col" key={product.id}>
                <h3>{product.name}</h3>
                <p className="muted">{product.config.cpu}<br />{product.config.gpu} · {product.config.ramGB} GB · {product.config.storageGB / 1000} TB</p>
                <span className={`tier-badge tier-badge--${match?.tier ?? 'unknown'}`}>{match?.tier === 'strong' ? 'Strong match' : match?.tier === 'preference' ? 'Trade-off' : match?.tier === 'conflict' ? 'Excluded' : 'Needs verification'}</span>
                <dl>
                  <dt>Best total</dt><dd>{match?.bestOffer ? formatCHF(match.bestOffer) : 'unconfirmed'}</dd>
                  <dt>Match</dt><dd>{match?.score ? `${Math.round(match.score)}%` : 'n/d'}</dd>
                  <dt>Condition</dt><dd>{product.config.condition}</dd>
                   <dt>Reasons</dt><dd>{match?.reasons.slice(0, 2).join(' · ')}</dd>
                </dl>
              </article>
            )
          })}
        </div>
        <p className="hint">Illustrative scores. Configurations are not merged; each column is an exact product.</p>
      </div>
    </div>
  )
}
