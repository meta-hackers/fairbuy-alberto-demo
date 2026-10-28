import { describe, expect, it } from 'vitest'
import { offers, products } from '../data/fixtures'
import { bestConfirmedOffer, formatCHF, groupOffers, groupProductsByExactConfig, priceRange } from './sellers'

const novaOffers = offers.filter((offer) => offer.productId === 'nova')

describe('seller offer grouping and totals', () => {
  it('sorts confirmed in-stock offers by total delivered price', () => {
    const groups = groupOffers(novaOffers)
    expect(groups.confirmedInStock.map((row) => row.total)).toEqual([1899, 1909, 1939, 1979, 2029])
    expect(groups.confirmedInStock[0].offer.retailer).toBe('Galaxus')
    for (const offer of offers) expect(offer.seller).toBe(offer.retailer)
  })

  it('keeps unknown totals in a separate group, never as the cheapest', () => {
    const incomplete = novaOffers.map((offer) => offer.id === 'nova-p' ? { ...offer, shipping: null, fees: null } : offer)
    const groups = groupOffers(incomplete)
    expect(groups.unconfirmed).toHaveLength(1)
    expect(groups.unconfirmed[0].offer.retailer).toBe('PC Dock')
    expect(groups.unconfirmed[0].confirmed).toBe(false)
    expect(bestConfirmedOffer(incomplete)?.offer.retailer).toBe('Galaxus')
  })

  it('states the price range basis and unknown count', () => {
    const incomplete = novaOffers.map((offer) => offer.id === 'nova-p' ? { ...offer, shipping: null } : offer)
    const range = priceRange(incomplete)!
    expect(range.min).toBe(1899)
    expect(range.max).toBe(2029)
    expect(range.count).toBe(4)
    expect(range.unknownCount).toBe(1)
    expect(range.basis).toBe('Delivered totals shown · VAT included')
    expect(range.basis).not.toMatch(/synthetic|demo|mock|scripted|confirmed|verified/i)
  })

  it('does not merge different exact configurations', () => {
    const groups = groupProductsByExactConfig(products, offers)
    const nova = groups.find((group) => group.productIds.includes('nova'))!
    expect(nova.productIds).toEqual(['nova'])
    expect(groups).toHaveLength(products.length)
  })

  it('keeps an in-budget unknown-stock offer visible but not as best price', () => {
    const vortexOffers = offers.filter((offer) => offer.productId === 'vortex').map((offer) => offer.id === 'vortex-g' ? { ...offer, stock: 'To be confirmed' as const } : offer)
    const groups = groupOffers(vortexOffers)
    expect(groups.confirmedUnknownStock[0].total).toBe(2350)
    expect(groups.confirmedInStock[0].total).toBe(2649)
    expect(bestConfirmedOffer(vortexOffers)?.total).toBe(2649)
    expect(priceRange(vortexOffers)?.min).toBe(2350)
    expect(priceRange(vortexOffers)?.max).toBe(2649)
  })

  it('formats CHF consistently', () => {
    expect(formatCHF(1899)).toContain('CHF')
    expect(formatCHF(1899)).toContain('1')
    expect(formatCHF(29.65)).toBe('CHF 29.65')
  })
})
