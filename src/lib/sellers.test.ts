import { describe, expect, it } from 'vitest'
import { offers, products } from '../data/fixtures'
import { bestConfirmedOffer, formatCHF, groupOffers, groupProductsByExactConfig, priceRange } from './sellers'

const novaOffers = offers.filter((offer) => offer.productId === 'nova')

describe('seller offer grouping and totals', () => {
  it('sorts confirmed in-stock offers by total delivered price', () => {
    const groups = groupOffers(novaOffers)
    expect(groups.confirmedInStock.map((row) => row.total)).toEqual([1899, 1939, 1979, 2029])
    expect(groups.confirmedInStock[0].offer.retailer).toBe('Galaxus')
  })

  it('keeps unknown totals in a separate group, never as the cheapest', () => {
    const groups = groupOffers(novaOffers)
    expect(groups.unconfirmed).toHaveLength(1)
    expect(groups.unconfirmed[0].offer.retailer).toBe('PC Dock')
    expect(groups.unconfirmed[0].confirmed).toBe(false)
    expect(bestConfirmedOffer(novaOffers)?.offer.retailer).toBe('Galaxus')
  })

  it('states the price range basis and unknown count', () => {
    const range = priceRange(novaOffers)!
    expect(range.min).toBe(1899)
    expect(range.max).toBe(2029)
    expect(range.count).toBe(4)
    expect(range.unknownCount).toBe(1)
    expect(range.basis).toContain('Confirmed delivered totals')
  })

  it('does not merge different exact configurations', () => {
    const groups = groupProductsByExactConfig(products, offers)
    const nova = groups.find((group) => group.productIds.includes('nova'))!
    expect(nova.productIds).toEqual(['nova'])
    expect(groups).toHaveLength(products.length)
  })

  it('keeps an in-budget unknown-stock offer visible but not as best price', () => {
    const vortexOffers = offers.filter((offer) => offer.productId === 'vortex')
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
  })
})
