import type { Offer, Product } from '../data/fixtures'
import { demoOfferUrl, formatCHF, priceRange, totalOf } from '../lib/sellers'

export default function SellerOffers({ product, offers, onBack }: { product: Product; offers: Offer[]; onBack: () => void }) {
  const c = product.config
  const sorted = [...offers].sort((a, b) => (totalOf(a) ?? Infinity) - (totalOf(b) ?? Infinity))
  const basis = priceRange(offers)?.basis
  return <section data-testid="buy-page">
    <button type="button" className="text-button back-link" onClick={onBack}>← Back to Discover</button>
    <div className="selected-product"><h2>{product.name}</h2>
      <p>{c.cpu} · {c.gpu} · {c.ramGB} GB RAM · {c.storageGB / 1000} TB · {c.condition}</p></div>
    <h3>Seller options</h3>
    <p className="hint">{basis ? <span data-testid="offer-basis">{basis}</span> : null}</p>
    <div className="offer-list">{sorted.map((offer) => {
      const total = totalOf(offer)
      return <article className="offer-row" key={offer.id} data-testid={`seller-${offer.id}`}>
        <div className="offer-heading"><h3>{offer.retailer}</h3><strong>{total === null ? 'Total unknown' : formatCHF(total)}</strong></div>
        <dl className="offer-facts">
          <dt>Seller</dt><dd data-testid="offer-seller">{offer.seller}</dd>
          <dt>Item</dt><dd>{formatCHF(offer.item)}</dd>
          <dt>Shipping</dt><dd>{offer.shipping === null ? 'Unknown' : formatCHF(offer.shipping)}</dd>
          <dt>Fees</dt><dd>{offer.fees === null ? 'Unknown' : formatCHF(offer.fees)}</dd>
          <dt>Availability</dt><dd>{offer.stock}</dd>
          <dt>Delivery</dt><dd>{offer.deliveryDays}</dd>
          <dt>Terms</dt><dd>{offer.warrantyMonths}-month warranty · {offer.returnDays}-day returns</dd>
          <dt>Recorded</dt><dd>{offer.sourceTs}</dd>
        </dl>
        <a className="offer-link" data-testid={`seller-link-${offer.id}`} href={demoOfferUrl(offer.retailer, product.id)} target="_blank" rel="noopener noreferrer">View at {offer.retailer} (synthetic demo link) →</a>
        {offer.note ? <p className="evidence-note">{offer.note}</p> : null}
      </article>
    })}</div>
    <p className="hint">Purchase options are read-only. Checkout is not available here.</p>
  </section>
}
