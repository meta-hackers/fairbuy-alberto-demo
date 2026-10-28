import { describe, expect, it } from 'vitest'
import { offers, products } from '../data/fixtures'
import {
  DEFAULT_CHARACTERISTICS,
  DEFAULT_PRICE_RANGE,
  createCustomCharacteristic,
  deriveBrief,
  filterSignature,
  findDiscoveryMatches,
  matchesCharacteristic,
  productPrice,
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

  it('filters the fixture catalog by supported features and price', () => {
    const result = findDiscoveryMatches(products, offers, DEFAULT_CHARACTERISTICS, DEFAULT_PRICE_RANGE)
    expect(result.matches.map((item) => item.id)).toEqual(['nova', 'orbit', 'vortex', 'strix', 'vega', 'aero', 'orbit-pro', 'titan', 'aura'])
    expect(result.unsupported).toHaveLength(0)
  })

  it('applies the price range independently from the feature filters', () => {
    const result = findDiscoveryMatches(products, offers, DEFAULT_CHARACTERISTICS, { min: 1800, max: 2000 })
    expect(result.matches.map((item) => item.id)).toEqual(['nova', 'aero', 'orbit-pro'])
    expect(productPrice(product('orbit'), offers)).toBe(1450)
  })

  it('includes lower GPU/RAM products when those characteristics are removed', () => {
    const result = findDiscoveryMatches(products, offers, without(['gpu', 'ram']), DEFAULT_PRICE_RANGE)
    expect(result.matches.map((item) => item.id)).toEqual(['nova', 'orbit', 'vortex', 'strix', 'vega', 'aero', 'orbit-pro', 'titan', 'aura'])
    expect(result.matches.map((item) => item.id)).not.toContain('pulse-air')
  })

  it('never claims a custom characteristic is verified', () => {
    const custom = createCustomCharacteristic('Wi-Fi 7', 'custom-wifi')
    const characteristics = [...DEFAULT_CHARACTERISTICS, custom]
    const result = findDiscoveryMatches(products, offers, characteristics, DEFAULT_PRICE_RANGE)
    expect(result.matches).toHaveLength(9)
    expect(result.unsupported.map((characteristic) => characteristic.label)).toEqual(['Wi-Fi 7'])
    expect(matchesCharacteristic(product('nova'), custom)).toBe(true)
  })

  it('treats an explicitly preferred RAM feature as visible soft preference, not a match filter', () => {
    const ram = { ...DEFAULT_CHARACTERISTICS.find((item) => item.kind === 'ram')!, preferenceOnly: true }
    expect(matchesCharacteristic(product('orbit'), ram)).toBe(true)
  })

  it('excludes below-target products only when GPU and RAM are required', () => {
    const required = DEFAULT_CHARACTERISTICS.map((feature) => ['gpu', 'ram'].includes(feature.kind) ? setCharacteristicMode(feature, 'required') : feature)
    expect(findDiscoveryMatches(products, offers, required, DEFAULT_PRICE_RANGE).matches.map((item) => item.id)).toEqual(['nova', 'vortex', 'vega', 'aero', 'orbit-pro', 'titan'])
    const ram = required.find((feature) => feature.id === 'ram')!
    expect(matchesCharacteristic(product('orbit'), ram)).toBe(false)
    const preferred = setCharacteristicMode(ram, 'preferred')
    expect(matchesCharacteristic(product('orbit'), preferred)).toBe(true)
    expect(preferred.label.match(/preference only/g)).toHaveLength(1)
  })

  it('returns an empty match set for an impossible price window', () => {
    const result = findDiscoveryMatches(products, offers, DEFAULT_CHARACTERISTICS, { min: 2900, max: 3000 })
    expect(result.matches).toHaveLength(0)
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

  it('changes the search signature when filters or custom text change', () => {
    const base = filterSignature(DEFAULT_CHARACTERISTICS, DEFAULT_PRICE_RANGE)
    expect(filterSignature(DEFAULT_CHARACTERISTICS, { min: 1200, max: 2400 })).not.toBe(base)
    expect(filterSignature(without(['gpu']), DEFAULT_PRICE_RANGE)).not.toBe(base)
    expect(filterSignature([...DEFAULT_CHARACTERISTICS, createCustomCharacteristic('Silenzioso', 'custom-quiet')], DEFAULT_PRICE_RANGE)).not.toBe(base)
  })
})
