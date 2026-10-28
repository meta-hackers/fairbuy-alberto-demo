import { useEffect, useState } from 'react'
import type { MatchResult, Offer, Product } from '../data/fixtures'
import { formatCHF, groupOffers } from '../lib/sellers'
import ProductIllustration from './ProductIllustration'

interface Props {
  product: Product
  offers: Offer[]
  match: MatchResult
  sourceOffline: boolean
  onBack: () => void
}

function OfferRow({ row, best, onOutbound }: { row: ReturnType<typeof groupOffers>['confirmedInStock'][number]; best: boolean; onOutbound: (offer: Offer) => void }) {
  const { offer, total } = row
  return (
    <article className={`seller-row ${best ? 'seller-row--best' : ''}`} data-testid={`seller-${offer.id}`}>
      <div className="seller-row__identity">
        <span className="retailer-badge">{offer.retailer}</span>
        <strong>{offer.seller}</strong>
        <span className="synthetic-badge">synthetic data</span>
        {best ? <span className="best-tag">Lowest confirmed total</span> : null}
      </div>
      <div className="seller-row__breakdown">
        <span>Item {formatCHF(offer.item)}</span>
        <span>Shipping {offer.shipping === null ? 'to be confirmed' : formatCHF(offer.shipping)}</span>
        <span>Fees {offer.fees === null ? 'to be confirmed' : formatCHF(offer.fees)}</span>
      </div>
      <div className="seller-row__meta">
        <span>{offer.stock}</span>
        <span>{offer.deliveryDays}</span>
        <span>{offer.warrantyMonths}-month warranty</span>
        <span>{offer.returnDays}-day returns</span>
        <span>checked {offer.sourceTs}</span>
      </div>
      <div className="seller-row__total">
        <strong>{total === null ? 'Total unconfirmed' : formatCHF(total)}</strong>
        <button type="button" className="button button--small" onClick={() => onOutbound(offer)}>Retailer details (demo) ↗</button>
      </div>
    </article>
  )
}

export default function SellerOffers({ product, offers, match, sourceOffline, onBack }: Props) {
  const [outbound, setOutbound] = useState<Offer | null>(null)
  useEffect(() => {
    if (!outbound) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOutbound(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [outbound])
  const groups = groupOffers(offers)
  const c = product.config
  return (
    <section className="seller-view" data-testid="seller-view">
      <button type="button" className="button button--ghost" onClick={onBack}>← Back to products</button>
      <div className="seller-hero">
        <div className="seller-hero__art"><ProductIllustration variant={product.illustration} size="large" /></div>
        <div>
          <p className="eyebrow">Exact selection · same configuration and condition</p>
          <h2>{product.name}</h2>
          <p className="seller-hero__specs">{c.cpu} · {c.gpu} · {c.ramGB} GB · {c.storageGB / 1000} TB · {c.condition === 'New' ? 'New' : 'Refurbished'}</p>
          <p className="muted">{product.tagline}</p>
          <div className="seller-hero__badges">
            <span className={`tier-badge tier-badge--${match.tier}`}>{match.tier === 'strong' ? 'Strong match' : match.tier === 'preference' ? 'Preference trade-off' : match.tier === 'conflict' ? 'Required constraint conflict' : 'Insufficient data'}</span>
            <span className="synthetic-badge">exact offer · synthetic fixture</span>
          </div>
        </div>
      </div>
      {sourceOffline ? <p className="source-banner" role="status">A retailer source is simulated as offline: some offers are hidden. Totals are partial.</p> : null}
      <div className="seller-list">
        <div className="seller-list__heading"><h3>Confirmed offers · sorted by delivered total</h3><span className="hint">VAT included · fictional prices and availability</span></div>
        {groups.confirmedInStock.length === 0 ? <p className="empty-inline">No confirmed, available offers.</p> : groups.confirmedInStock.map((row, index) => <OfferRow key={row.offer.id} row={row} best={index === 0} onOutbound={setOutbound} />)}
      </div>
      {groups.confirmedUnknownStock.length > 0 ? (
        <div className="seller-list">
          <div className="seller-list__heading"><h3>Total confirmed · availability unconfirmed</h3><span className="hint">Not considered for “lowest price”</span></div>
          {groups.confirmedUnknownStock.map((row) => <OfferRow key={row.offer.id} row={row} best={false} onOutbound={setOutbound} />)}
        </div>
      ) : null}
      {groups.unconfirmed.length > 0 ? (
        <div className="seller-list seller-list--unknown">
          <div className="seller-list__heading"><h3>Total unconfirmed</h3><span className="hint">A decisive cost is missing; not ranked as the cheapest</span></div>
          {groups.unconfirmed.map((row) => (
            <article className="seller-row" key={row.offer.id} data-testid={`seller-unknown-${row.offer.id}`}>
              <div className="seller-row__identity"><span className="retailer-badge">{row.offer.retailer}</span><strong>{row.offer.seller}</strong><span className="synthetic-badge">synthetic data</span><span className="unknown-tag">total unconfirmed</span></div>
              <div className="seller-row__breakdown"><span>Item {formatCHF(row.offer.item)}</span><span>Shipping not listed</span><span>Fees not listed</span></div>
              <div className="seller-row__meta"><span>{row.offer.stock}</span><span>{row.offer.deliveryDays}</span><span>{row.offer.warrantyMonths}-month warranty</span><span>checked {row.offer.sourceTs}</span></div>
              <div className="seller-row__total"><strong>Total unconfirmed</strong><span className="hint">{row.offer.note}</span></div>
            </article>
          ))}
        </div>
      ) : null}
      <div className="seller-footer">
        <p><strong>No purchase has been made.</strong> FairBuy displays synthetic fixtures only; the decision is yours.</p>
        <p className="hint">The match score is illustrative and separate from evidence confidence. Sources were not queried.</p>
      </div>
      {outbound ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setOutbound(null) }}>
          <div className="modal outbound-modal" role="dialog" aria-modal="true" aria-labelledby="outbound-title">
            <p className="eyebrow">Simulated link-out</p>
            <h2 id="outbound-title">Demo retailer details</h2>
            <p>{outbound.retailer} · {outbound.seller} · {formatCHF(outbound.item + (outbound.shipping ?? 0) + (outbound.fees ?? 0))}</p>
            <p className="notice">No purchase has been made. No real link, checkout, or seller contact is available. This screen is a fixture only.</p>
            <button type="button" className="button button--primary" onClick={() => setOutbound(null)} autoFocus>Close</button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
