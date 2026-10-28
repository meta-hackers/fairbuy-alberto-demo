import type { MatchResult, Offer, Product } from '../data/fixtures'
import { formatCHF, priceRange } from '../lib/sellers'
import { productPrice } from '../lib/flow'
import ProductIllustration from './ProductIllustration'

const tierLabels: Record<MatchResult['tier'], string> = {
  strong: 'Strong match',
  preference: 'Preference trade-off',
  conflict: 'Required constraint conflict',
  unknown: 'Insufficient data',
}

interface Props {
  product: Product
  match: MatchResult
  offers: Offer[]
  favorite: boolean
  compared: boolean
  onOpen: () => void
  onDismiss?: () => void
  onFavorite: () => void
  onCompare: () => void
  expanded: boolean
  onToggle: () => void
}

export default function ProductCard({ product, match, offers, favorite, compared, onOpen, onDismiss, onFavorite, onCompare, expanded, onToggle }: Props) {
  const range = priceRange(offers)
  const retailers = [...new Set(offers.map((offer) => offer.retailer))]
  const c = product.config
  return (
    <article className={`product-card product-card--${match.tier}`} data-testid={`product-card-${product.id}`} data-tier={match.tier}>
      <button type="button" className="product-summary" data-testid={`expand-${product.id}`} aria-expanded={expanded} aria-controls={`details-${product.id}`} onClick={onToggle}>
        <span>{product.name}</span>
        <strong title="Lowest confirmed delivered total · synthetic fixture">{productPrice(product, offers) === null ? 'Price unconfirmed' : formatCHF(productPrice(product, offers)!)}</strong>
        <span aria-hidden="true">{expanded ? '−' : '+'}</span>
      </button>
      <div id={`details-${product.id}`} className="product-details" hidden={!expanded}>
      <div className="product-card__top">
        <button className="icon-button" type="button" onClick={onFavorite} aria-pressed={favorite} aria-label={favorite ? `Remove ${product.name} from favorites` : `Save ${product.name} to favorites`} data-testid={`favorite-${product.id}`}>
          {favorite ? '♥' : '♡'}
        </button>
        <span className={`tier-badge tier-badge--${match.tier}`} data-testid={`tier-${product.id}`}>
          <span aria-hidden="true">●</span> {tierLabels[match.tier]}
        </span>
        {onDismiss ? <button className="button button--small icon-button--dismiss" type="button" onClick={onDismiss} aria-label={`Exclude ${product.name} with a reason`} data-testid={`dismiss-${product.id}`}>Exclude with a reason</button> : null}
      </div>
      <div className="product-card__main">
        <div className="product-card__art"><ProductIllustration variant={product.illustration} /></div>
        <div className="product-card__body">
          <p className="eyebrow">{c.condition === 'New' ? 'New' : 'Refurbished'} · exact configuration</p>
          <h3><button type="button" className="link-button" onClick={onOpen}>{product.name}</button></h3>
          <p className="product-card__specs">{c.cpu} · {c.gpu} · {c.ramGB} GB · {c.storageGB / 1000} TB</p>
          <p className="product-card__tagline">{product.tagline}</p>
          <div className="price-block">
            <span className="price-block__label">Confirmed delivered total</span>
            {range ? (
              <strong data-testid={`price-${product.id}`}>{formatCHF(range.min)}–{formatCHF(range.max).replace('CHF ', '')}</strong>
            ) : (
              <strong className="muted">Price unconfirmed</strong>
            )}
            <span className="price-block__basis">{range?.basis ?? 'No confirmed total: insufficient data'}</span>
            {range?.unknownCount ? <span className="price-block__unknown">{range.unknownCount} offer(s) with unconfirmed totals</span> : null}
          </div>
          <div className="retailer-row">
            <span className="retailer-row__label">Illustrative retailers</span>
            {retailers.map((retailer) => <span className="retailer-badge" key={retailer} title="Illustrative retailer, no integration">{retailer}</span>)}
            <span className="synthetic-badge">synthetic data</span>
          </div>
        </div>
      </div>
      <div className="product-card__reasons">
        <ul>
          {match.reasons.slice(0, 4).map((reason) => <li key={reason}>{reason}</li>)}
        </ul>
        {match.score !== null ? <div className="score" aria-label={`Illustrative match score: ${match.score} out of 100`}><strong>{Math.round(match.score)}%</strong><span>illustrative match</span></div> : null}
      </div>
      <div className="product-card__actions">
        <label className="checkline">
          <input type="checkbox" checked={compared} onChange={onCompare} /> Compare
        </label>
        <button type="button" className="button button--small" onClick={onOpen}>View exact offers →</button>
      </div>
      </div>
    </article>
  )
}
