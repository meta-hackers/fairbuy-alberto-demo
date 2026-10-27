import type { Offer, Product } from '../data/fixtures'

export interface OfferTotal {
  offer: Offer
  total: number | null
  confirmed: boolean
  available: boolean
}

export interface OfferGroups {
  confirmedInStock: OfferTotal[]
  confirmedUnknownStock: OfferTotal[]
  unconfirmed: OfferTotal[]
}

export function formatCHF(value: number): string {
  return `CHF ${new Intl.NumberFormat('de-CH', { maximumFractionDigits: 0 }).format(value)}`
}

export function totalOf(offer: Offer): number | null {
  if (offer.shipping === null || offer.fees === null) return null
  return offer.item + offer.shipping + offer.fees
}

export function withTotal(offer: Offer): OfferTotal {
  const total = totalOf(offer)
  return { offer, total, confirmed: total !== null, available: offer.stock === 'Disponibile' }
}

export function groupOffers(offers: Offer[]): OfferGroups {
  const rows = offers.map(withTotal)
  const byTotal = (a: OfferTotal, b: OfferTotal) => (a.total ?? Infinity) - (b.total ?? Infinity)
  return {
    confirmedInStock: rows.filter((r) => r.confirmed && r.available).sort(byTotal),
    confirmedUnknownStock: rows.filter((r) => r.confirmed && !r.available).sort(byTotal),
    unconfirmed: rows.filter((r) => !r.confirmed).sort((a, b) => a.offer.item - b.offer.item),
  }
}

export function bestConfirmedOffer(offers: Offer[]): OfferTotal | null {
  return groupOffers(offers).confirmedInStock[0] ?? null
}

export interface PriceRange {
  min: number
  max: number
  count: number
  basis: string
  unknownCount: number
}

export function priceRange(offers: Offer[]): PriceRange | null {
  const groups = groupOffers(offers)
  const usable = [...groups.confirmedInStock, ...groups.confirmedUnknownStock]
  if (usable.length === 0) return null
  const totals = usable.map((r) => r.total as number)
  return {
    min: Math.min(...totals),
    max: Math.max(...totals),
    count: usable.length,
    unknownCount: groups.unconfirmed.length,
    basis: 'Totali consegnati confermati · IVA inclusa · fixture sintetiche',
  }
}

export function groupProductsByExactConfig(products: Product[], offers: Offer[]) {
  const groups = new Map<string, { key: string; productIds: string[]; offers: Offer[] }>()
  for (const product of products) {
    const c = product.config
    const key = [c.cpu, c.gpu, c.ramGB, c.storageGB, c.condition].join('|')
    const entry = groups.get(key) ?? { key, productIds: [], offers: [] }
    entry.productIds.push(product.id)
    entry.offers.push(...offers.filter((offer) => offer.productId === product.id))
    groups.set(key, entry)
  }
  return [...groups.values()]
}

export function offersForProduct(offers: Offer[], productId: string): Offer[] {
  return offers.filter((offer) => offer.productId === productId)
}
