import { describe, expect, it } from 'vitest'
import { offers, products } from '../data/fixtures'
import {
  DEFAULT_CHARACTERISTICS,
  DEFAULT_PRICE_RANGE,
  TOP_K,
  createCustomCharacteristic,
  deriveBrief,
  filterSignature,
  findDiscoveryMatches,
  matchLabelFor,
  productPrice,
  rankProducts,
  setCharacteristicMode,
} from './flow'

const product = (id: string) => products.find((item) => item.id === id)!
const without = (ids: string[]) => DEFAULT_CHARACTERISTICS.filter((characteristic) => !ids.includes(characteristic.id))

describe('flow characteristics', () => {
  it('starts from supported mocked characteristics and no custom text', () => {
    expect(DEFAULT_CHARACTERISTICS).toHaveLength(5)
    expect(DEFAULT_CHARACTERISTICS.every((characteristic) => characteristic.supported)).toBe(true)
    expect(DEFAULT_CHARACTERISTICS.map((characteristic) => characteristic.kind)).toContain('resolution')
    expect(DEFAULT_CHARACTERISTICS.map((characteristic) => characteristic.kind)).toContain('gpu')
    expect(DEFAULT_CHARACTERISTICS.map((characteristic) => characteristic.kind)).toContain('ram')
  })

  it('ranks the whole fixture catalog and keeps a TopK list', () => {
    const result = findDiscoveryMatches(products, offers, DEFAULT_CHARACTERISTICS, DEFAULT_PRICE_RANGE)
    expect(result.matches).toHaveLength(10)
    expect(result.unsupported).toHaveLength(0)
    const ranked = rankProducts(products, offers, DEFAULT_CHARACTERISTICS, DEFAULT_PRICE_RANGE)
    expect(ranked).toHaveLength(10)
    expect(ranked.slice(0, TOP_K)).toHaveLength(5)
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score)
    expect(ranked[0].label).toBe('Strong match')
  })

  it('labels every percentage consistently with its score', () => {
    const ranked = rankProducts(products, offers, DEFAULT_CHARACTERISTICS, DEFAULT_PRICE_RANGE)
    for (const result of ranked) {
      expect(result.label).toBe(matchLabelFor(result.score))
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    }
  })

  it('keeps over-budget products and explains the trade-off instead of returning nothing', () => {
    const ranked = rankProducts(products, offers, DEFAULT_CHARACTERISTICS, { min: 1000, max: 1000 })
    expect(ranked).toHaveLength(products.length)
    expect(ranked.slice(0, TOP_K)).toHaveLength(5)
    const over = ranked.find((result) => result.product.id === 'orbit')!
    expect(over.tradeoffs.join(' ')).toMatch(/above your.*soft ceiling/i)
    expect(over.score).toBeLessThan(85)
  })

  it('exposes the delivered-offer range and its retailers for each ranked product', () => {
    const ranked = rankProducts(products, offers, DEFAULT_CHARACTERISTICS, DEFAULT_PRICE_RANGE)
    for (const result of ranked) {
      expect(result.offerRange).not.toBeNull()
      expect(result.retailers.length).toBeGreaterThan(0)
    }
    expect(productPrice(product('orbit'), offers)).toBe(1450)
    const orbit = ranked.find((result) => result.product.id === 'orbit')!
    expect(orbit.offerRange).toEqual([1450, 1640])
    expect(orbit.retailers).toEqual(['Amazon', 'Galaxus', 'MediaWorld'])
  })

  it('never claims a custom characteristic is verified or affects the score', () => {
    const custom = createCustomCharacteristic('Wi-Fi 7', 'custom-wifi')
    const characteristics = [...DEFAULT_CHARACTERISTICS, custom]
    const result = findDiscoveryMatches(products, offers, characteristics, DEFAULT_PRICE_RANGE)
    expect(result.matches).toHaveLength(10)
    expect(result.unsupported.map((characteristic) => characteristic.label)).toEqual(['Wi-Fi 7'])
    const baseline = rankProducts(products, offers, DEFAULT_CHARACTERISTICS, DEFAULT_PRICE_RANGE)
    const withCustom = rankProducts(products, offers, characteristics, DEFAULT_PRICE_RANGE)
    expect(withCustom.map((item) => item.score)).toEqual(baseline.map((item) => item.score))
    expect(withCustom[0].unknown.join(' ')).toContain('cannot be verified')
  })

  it('keeps high-priority GPU/RAM preferences soft while changing ranking weight', () => {
    const normal = DEFAULT_CHARACTERISTICS.map((feature) => ['gpu', 'ram'].includes(feature.kind) ? setCharacteristicMode(feature, 'preferred') : feature)
    const high = normal.map((feature) => ['gpu', 'ram'].includes(feature.kind) ? setCharacteristicMode(feature, 'required') : feature)
    const normalRanked = rankProducts(products, offers, normal, DEFAULT_PRICE_RANGE)
    const highRanked = rankProducts(products, offers, high, DEFAULT_PRICE_RANGE)
    expect(highRanked).toHaveLength(products.length)
    expect(highRanked.find((result) => result.product.id === 'orbit')!.score)
      .toBeLessThan(normalRanked.find((result) => result.product.id === 'orbit')!.score)
    expect(high.find((feature) => feature.id === 'ram')!.label).not.toMatch(/required/i)
    expect(high.find((feature) => feature.id === 'ram')!.origin).toBe('user-edit')
  })

  it('keeps lower matching products visible when preferences are removed', () => {
    const result = findDiscoveryMatches(products, offers, without(['gpu', 'ram']), DEFAULT_PRICE_RANGE)
    expect(result.matches).toHaveLength(10)
  })

  it('changes the search signature when preferences or budget change', () => {
    const base = filterSignature(DEFAULT_CHARACTERISTICS, DEFAULT_PRICE_RANGE)
    expect(filterSignature(DEFAULT_CHARACTERISTICS, { min: 1200, max: 2400 })).not.toBe(base)
    expect(filterSignature(without(['gpu']), DEFAULT_PRICE_RANGE)).not.toBe(base)
    expect(filterSignature([...DEFAULT_CHARACTERISTICS, createCustomCharacteristic('Wi-Fi 7', 'custom-wifi')], DEFAULT_PRICE_RANGE)).not.toBe(base)
  })

  it('derives a coherent legacy brief and drops removed requirements', () => {
    const brief = deriveBrief(DEFAULT_CHARACTERISTICS, { min: 1500, max: 2200 })
    expect(brief.budgetMin).toBe(1500)
    expect(brief.budgetMax).toBe(2200)
    expect(brief.resolution).toBe('1440p')
    expect(brief.targetFps).toBe(120)
    expect(brief.gpu.value).toBe(4070)
    expect(brief.ram.value).toBe(32)

    const relaxed = deriveBrief(without(['gpu', 'ram']), DEFAULT_PRICE_RANGE)
    expect(relaxed.gpu.value).toBe(4060)
    expect(relaxed.ram.value).toBe(16)
  })
})
