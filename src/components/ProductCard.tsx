import type { MatchResult, Offer, Product } from '../data/fixtures'
import { formatCHF } from '../lib/sellers'
import { productPrice } from '../lib/flow'

interface Props {
  product: Product
  match: MatchResult
  offers: Offer[]
  favorite: boolean
  onOpen: () => void
  onDismiss: () => void
  onFavorite: () => void
  expanded: boolean
  onToggle: () => void
}

export default function ProductCard({ product, match, offers, favorite, onOpen, onDismiss, onFavorite, expanded, onToggle }: Props) {
  const price = productPrice(product, offers)
  const c = product.config
  return <article className="product-card" data-testid={`product-card-${product.id}`}>
    <button type="button" className="product-summary" data-testid={`expand-${product.id}`} aria-expanded={expanded} aria-controls={`details-${product.id}`} onClick={onToggle}>
      <span>{product.name}</span><strong>{price === null ? 'Price unknown' : formatCHF(price)}</strong><span aria-hidden="true">{expanded ? '−' : '+'}</span>
    </button>
    <div id={`details-${product.id}`} className="product-details" hidden={!expanded}>
      <p>{c.cpu} · {c.gpu} · {c.ramGB} GB RAM · {c.storageGB / 1000} TB · {c.condition}</p>
      <p className="hint">{product.tagline}</p>
      <p className="evidence-note">{match.softMisses.length ? match.softMisses.join(' ') : 'Meets the listed hardware targets.'}</p>
      {match.unknown.length > 0 ? <p className="evidence-note">{match.unknown.join(' ')}</p> : null}
      <div className="product-actions">
        <button type="button" className="button button--primary" data-testid={`buy-${product.id}`} onClick={onOpen}>Purchase options →</button>
        <button type="button" className="text-button" onClick={onFavorite} aria-pressed={favorite} data-testid={`favorite-${product.id}`}>{favorite ? '♥ Saved' : '♡ Save'}</button>
        <button type="button" className="text-button" onClick={onDismiss} data-testid={`dismiss-${product.id}`}>Not for me</button>
      </div>
    </div>
  </article>
}
