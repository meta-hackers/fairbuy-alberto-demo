import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { offers, products } from './fixtures'
import { RELAY_FEATURES, RELAY_SCENARIO, relayFitsScenario, relayPrice, relayProducts, relayTotal } from './relay'
import { totalOf } from '../lib/sellers'
import SellerOffers from '../components/SellerOffers'

describe('complete fictional catalog', () => {
  it('supplies complete PC offers without suppressing missing-data fallbacks', () => {
    for (const product of products) {
      const rows = offers.filter((offer) => offer.productId === product.id)
      expect(rows.length).toBeGreaterThan(0)
      for (const offer of rows) {
        expect(offer.item).toBeGreaterThan(0)
        expect(offer.shipping).toBeGreaterThanOrEqual(0)
        expect(offer.fees).toBeGreaterThanOrEqual(0)
        expect(totalOf(offer)).toBe(offer.item + offer.shipping! + offer.fees!)
        expect(offer.stock).toBe('Available')
        expect(offer.deliveryDays).toMatch(/^\d+–\d+ days$/)
        expect(offer.warrantyMonths).toBeGreaterThan(0)
        expect(offer.returnDays).toBeGreaterThan(0)
        expect(offer.sourceTs).toBeTruthy()
      }
    }
    const missingShipping = { ...offers[0], shipping: null }
    const missingFees = { ...offers[0], fees: null }
    expect(totalOf(missingShipping)).toBeNull()
    expect(totalOf(missingFees)).toBeNull()
    const html = renderToStaticMarkup(SellerOffers({ product: products[0], offers: [missingShipping, missingFees], onBack: () => {} }))
    expect(html).toContain('Total unknown')
    expect(html).toContain('Unknown')
  })

  it('provides coherent 18 W relay devices, complete offers, and no real links', () => {
    expect(RELAY_SCENARIO.loadW).toBe(18)
    expect(RELAY_FEATURES.every((feature) => feature.supported)).toBe(true)
    for (const product of relayProducts) {
      expect(relayFitsScenario(product)).toBe(true)
      expect(product.capacityW).toBeGreaterThanOrEqual(18)
      expect(product.hueCompatible).toBe(true)
      expect(product.onOffOnly).toBe(true)
      expect(product.voltageV).toBe(230)
      expect(product.dimensions).toMatch(/mm$/)
      expect(product.protection).toBe('IP20')
      expect(product.offers.length).toBe(2)
      expect(JSON.stringify(product)).not.toMatch(/https?:|B08Q3HF3HJ|LED Trading|Iluminize|Gledopto/)
      for (const offer of product.offers) {
        expect(offer.item).toBeGreaterThan(0)
        expect(offer.shipping).toBeGreaterThanOrEqual(0)
        expect(offer.fees).toBeGreaterThanOrEqual(0)
        expect(relayTotal(offer)).toBe(Math.round((offer.item! + offer.shipping! + offer.fees!) * 100) / 100)
        expect(offer.stock).toBe('Available')
        expect(offer.deliveryDays).toMatch(/^\d+–\d+ days$/)
        expect(offer.warrantyMonths).toBeGreaterThan(0)
        expect(offer.returnDays).toBeGreaterThan(0)
        expect(offer.recorded).toBeTruthy()
      }
      expect(relayPrice(product)).toBe(Math.min(...product.offers.map((offer) => relayTotal(offer)!)))
    }
  })

  it('retains missing relay costs and incompatible devices as unresolved or excluded', () => {
    const product = relayProducts[0]
    const offer = product.offers[0]
    expect(relayTotal({ ...offer, item: null })).toBeNull()
    expect(relayTotal({ ...offer, shipping: null })).toBeNull()
    expect(relayTotal({ ...offer, fees: null })).toBeNull()
    expect(relayPrice({ ...product, offers: [{ ...offer, shipping: null }] })).toBeNull()
    expect(relayPrice({ ...product, offers: [] })).toBeNull()
    expect(relayFitsScenario({ ...product, capacityW: 10 })).toBe(false)
    expect(relayFitsScenario({ ...product, hueCompatible: false })).toBe(false)
    expect(relayFitsScenario({ ...product, onOffOnly: false })).toBe(false)
    expect(relayFitsScenario({ ...product, voltageV: 24 })).toBe(false)
  })
})
