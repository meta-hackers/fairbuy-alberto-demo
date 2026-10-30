import { describe, expect, it } from 'vitest'
import { defaultBrief, offers, products } from '../data/fixtures'
import { applyDismissal, computeMatch, discoverAlternatives, evaluateCatalog, removeLearned } from './matching'

const product = (id: string) => products.find((item) => item.id === id)!
const productOffers = (id: string) => offers.filter((offer) => offer.productId === id)

describe('computeMatch', () => {
  it('marks NOVA strong under the default soft preferences', () => {
    const match = computeMatch(product('nova'), defaultBrief, productOffers('nova'))
    expect(match.tier).toBe('strong')
    expect(match.score).toBeGreaterThan(80)
    expect(match.bestOffer).toBe(1899)
    expect(match.offerRange).toEqual([1899, 2029])
    expect(match.hardFailures).toHaveLength(0)
    for (const item of products) {
      const result = computeMatch(item, defaultBrief, productOffers(item.id))
      expect([...result.reasons, ...result.unknown, ...result.softMisses, ...result.hardFailures].join(' ')).not.toMatch(/synthetic|demo|mock|scripted/i)
    }
  })

  it('marks 16 GB / 4060 Ti products as amber preferences, not hard failures', () => {
    const match = computeMatch(product('orbit'), defaultBrief, productOffers('orbit'))
    expect(match.tier).toBe('preference')
    expect(match.hardFailures).toHaveLength(0)
    expect(match.softMisses.join(' ')).toContain('RAM')
  })

  it('scores a below-target GPU as a soft conflict', () => {
    const brief = { ...defaultBrief, gpu: { mode: 'required' as const, value: 4070 } }
    const match = computeMatch(product('orbit'), brief, productOffers('orbit'))
    expect(match.tier).toBe('preference')
    expect(match.excluded).toBe(false)
    expect(match.score).not.toBeNull()
  })

  it('scores a below-target RAM as a soft conflict', () => {
    const brief = { ...defaultBrief, ram: { mode: 'required' as const, value: 32 } }
    const match = computeMatch(product('strix'), brief, productOffers('strix'))
    expect(match.tier).toBe('preference')
    expect(match.excluded).toBe(false)
  })

  it('does not exclude a product whose range crosses budget when an exact offer fits', () => {
    const match = computeMatch(product('vortex'), defaultBrief, productOffers('vortex'))
    expect(match.tier).toBe('preference')
    expect(match.hardFailures).toHaveLength(0)
    expect(match.offerRange?.[0]).toBeLessThanOrEqual(defaultBrief.budgetMax)
    expect(match.offerRange?.[1]).toBeGreaterThan(defaultBrief.budgetMax)
  })

  it('marks a product unknown when only an in-budget offer has unconfirmed stock', () => {
    const incomplete = productOffers('vortex').map((offer) => offer.id === 'vortex-g' ? { ...offer, stock: 'To be confirmed' as const } : offer)
    const match = computeMatch(product('vortex'), defaultBrief, incomplete)
    expect(match.tier).toBe('unknown')
    expect(match.unknown.join(' ')).toContain('availability')
    expect(match.bestOffer).toBe(2649)
  })

  it('treats a missing source result as unknown, not a hard conflict', () => {
    const match = computeMatch(product('nova'), defaultBrief, [])
    expect(match.tier).toBe('unknown')
    expect(match.hardFailures).toHaveLength(0)
  })

  it('keeps a product when every confirmed offer is over the soft budget', () => {
    const match = computeMatch(product('titan'), defaultBrief, productOffers('titan'))
    expect(match.tier).toBe('preference')
    expect(match.excluded).toBe(false)
  })
})

describe('feedback and rediscovery', () => {
  it('keeps RAM preferred when the user does not ask to make it mandatory', () => {
    const result = applyDismissal(product('orbit'), ['ram'], { ram: 'keep' }, defaultBrief)
    expect(result.brief.ram.mode).toBe('preferred')
    expect(result.brief.learned.some((pref) => pref.kind === 'ram')).toBe(true)
  })

  it('makes RAM mandatory only after an explicit clarification', () => {
    const result = applyDismissal(product('orbit'), ['ram'], { ram: 'required' }, defaultBrief)
    expect(result.brief.ram.mode).toBe('required')
  })

  it('adds and reverses an avoid-GPU preference', () => {
    const result = applyDismissal(product('orbit'), ['avoidGpu'], {}, defaultBrief)
    expect(result.brief.avoidGpu).toContain('RTX 4060 Ti')
    const learned = result.brief.learned.find((pref) => pref.kind === 'avoidGpu')!
    const reversed = removeLearned(result.brief, learned.id)
    expect(reversed.avoidGpu).not.toContain('RTX 4060 Ti')
  })

  it('discovers new fixtures, not only reordered products', () => {
    const ids = discoverAlternatives(product('orbit'), ['ram'], ['nova', 'orbit', 'vortex', 'strix'], ['orbit'])
    expect(ids.length).toBeGreaterThan(0)
    expect(ids).toContain('vega')
    expect(ids).not.toContain('orbit')
  })

  it('skips rediscovery when dismissal is skipped without reason', () => {
    expect(discoverAlternatives(product('orbit'), ['skip'], ['nova', 'orbit'], ['orbit'])).toEqual([])
  })
})

describe('evaluateCatalog', () => {
  it('separates feasible, unknown and excluded groups', () => {
    const incomplete = offers.map((offer) => offer.id === 'vortex-g' ? { ...offer, stock: 'To be confirmed' as const } : offer)
    const result = evaluateCatalog(products, defaultBrief, incomplete, ['nova', 'orbit', 'vortex', 'strix', 'titan', 'aura'], [])
    expect(result.feasible.map((match) => match.productId)).toContain('nova')
    expect(result.feasible.map((match) => match.productId)).toContain('titan')
    expect(result.unknown.map((match) => match.productId)).toContain('vortex')
  })
})
