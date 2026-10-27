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
        <span className="synthetic-badge">dati sintetici</span>
        {best ? <span className="best-tag">Miglior totale confermato</span> : null}
      </div>
      <div className="seller-row__breakdown">
        <span>Prodotto {formatCHF(offer.item)}</span>
        <span>Spedizione {offer.shipping === null ? 'da confermare' : formatCHF(offer.shipping)}</span>
        <span>Fees {offer.fees === null ? 'da confermare' : formatCHF(offer.fees)}</span>
      </div>
      <div className="seller-row__meta">
        <span>{offer.stock}</span>
        <span>{offer.deliveryDays}</span>
        <span>{offer.warrantyMonths} mesi garanzia</span>
        <span>{offer.returnDays} giorni reso</span>
        <span>letto {offer.sourceTs}</span>
      </div>
      <div className="seller-row__total">
        <strong>{total === null ? 'Totale non confermato' : formatCHF(total)}</strong>
        <button type="button" className="button button--small" onClick={() => onOutbound(offer)}>Dettaglio retailer (demo) ↗</button>
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
      <button type="button" className="button button--ghost" onClick={onBack}>← Torna ai prodotti</button>
      <div className="seller-hero">
        <div className="seller-hero__art"><ProductIllustration variant={product.illustration} size="large" /></div>
        <div>
          <p className="eyebrow">Scelta esatta · stessa configurazione e condizione</p>
          <h2>{product.name}</h2>
          <p className="seller-hero__specs">{c.cpu} · {c.gpu} · {c.ramGB} GB · {c.storageGB / 1000} TB · {c.condition}</p>
          <p className="muted">{product.tagline}</p>
          <div className="seller-hero__badges">
            <span className={`tier-badge tier-badge--${match.tier}`}>{match.tier === 'strong' ? 'Match forte' : match.tier === 'preference' ? 'Compromesso preferenze' : match.tier === 'conflict' ? 'Conflitto obbligatorio' : 'Dati insufficienti'}</span>
            <span className="synthetic-badge">offerta esatta · fixture sintetica</span>
          </div>
        </div>
      </div>
      {sourceOffline ? <p className="source-banner" role="status">Una fonte retailer è offline nella simulazione: alcune offerte non sono mostrate. I totali restano parziali.</p> : null}
      <div className="seller-list">
        <div className="seller-list__heading"><h3>Offerte confermate · ordinate per totale consegnato</h3><span className="hint">IVA inclusa · prezzi e disponibilità fittizi</span></div>
        {groups.confirmedInStock.length === 0 ? <p className="empty-inline">Nessuna offerta confermata e disponibile.</p> : groups.confirmedInStock.map((row, index) => <OfferRow key={row.offer.id} row={row} best={index === 0} onOutbound={setOutbound} />)}
      </div>
      {groups.confirmedUnknownStock.length > 0 ? (
        <div className="seller-list">
          <div className="seller-list__heading"><h3>Totale confermato · disponibilità da confermare</h3><span className="hint">Non candidata al “miglior prezzo”</span></div>
          {groups.confirmedUnknownStock.map((row) => <OfferRow key={row.offer.id} row={row} best={false} onOutbound={setOutbound} />)}
        </div>
      ) : null}
      {groups.unconfirmed.length > 0 ? (
        <div className="seller-list seller-list--unknown">
          <div className="seller-list__heading"><h3>Totale non confermato</h3><span className="hint">Costo decisivo mancante: non ordinata come la più economica</span></div>
          {groups.unconfirmed.map((row) => (
            <article className="seller-row" key={row.offer.id} data-testid={`seller-unknown-${row.offer.id}`}>
              <div className="seller-row__identity"><span className="retailer-badge">{row.offer.retailer}</span><strong>{row.offer.seller}</strong><span className="synthetic-badge">dati sintetici</span><span className="unknown-tag">totale da confermare</span></div>
              <div className="seller-row__breakdown"><span>Prodotto {formatCHF(row.offer.item)}</span><span>Spedizione non indicata</span><span>Fees non indicate</span></div>
              <div className="seller-row__meta"><span>{row.offer.stock}</span><span>{row.offer.deliveryDays}</span><span>{row.offer.warrantyMonths} mesi garanzia</span><span>letto {row.offer.sourceTs}</span></div>
              <div className="seller-row__total"><strong>Totale non confermato</strong><span className="hint">{row.offer.note}</span></div>
            </article>
          ))}
        </div>
      ) : null}
      <div className="seller-footer">
        <p><strong>Nessun acquisto effettuato.</strong> FairBuy mostra solo fixture sintetiche; la decisione resta tua.</p>
        <p className="hint">Il punteggio match è illustrativo e separato dalla confidenza delle evidenze. Le fonti non sono state interrogate realmente.</p>
      </div>
      {outbound ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setOutbound(null) }}>
          <div className="modal outbound-modal" role="dialog" aria-modal="true" aria-labelledby="outbound-title">
            <p className="eyebrow">Uscita simulata</p>
            <h2 id="outbound-title">Dettaglio retailer demo</h2>
            <p>{outbound.retailer} · {outbound.seller} · {formatCHF(outbound.item + (outbound.shipping ?? 0) + (outbound.fees ?? 0))}</p>
            <p className="notice">Nessun acquisto effettuato. Nessun link reale, nessun checkout, nessun contatto con il venditore. Questa schermata è solo una fixture.</p>
            <button type="button" className="button button--primary" onClick={() => setOutbound(null)} autoFocus>Chiudi</button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
