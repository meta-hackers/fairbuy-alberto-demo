import {
  defaultBrief,
  type Brief,
  type Offer,
  type Product,
  type Resolution,
} from '../data/fixtures'
import { gpuValue } from './matching'
import { formatCHF, priceRange, priceRangeRetailers, totalOf } from './sellers'

export type CharacteristicKind = 'use' | 'resolution' | 'gpu' | 'ram' | 'condition' | 'avoidGpu' | 'value' | 'custom'

/**
 * Priority only changes ranking emphasis. Every requirement, including price,
 * remains a soft preference and can never remove a product from discovery.
 */
export type CharacteristicMode = 'required' | 'preferred'

export interface Characteristic {
  id: string
  label: string
  kind: CharacteristicKind
  value?: string | number
  /** A high priority raises the ranking weight. It is not an eligibility gate. */
  mode?: CharacteristicMode
  preferenceOnly?: boolean
  /** Preset characteristics can be verified against fixture specs. Custom text cannot. */
  supported: boolean
}

export interface PriceBounds {
  min: number
  max: number
}

export interface DiscoveryResult {
  matches: Product[]
  scores: Record<string, number>
  /** Characteristics that the fixture catalog cannot verify (custom text). */
  unsupported: Characteristic[]
}

export type MatchLabel = 'Strong match' | 'Good match' | 'Poor match'

export interface RankedProduct {
  product: Product
  score: number
  label: MatchLabel
  offerRange: [number, number] | null
  priceBasis: string | null
  retailers: string[]
  reasons: string[]
  tradeoffs: string[]
  unknown: string[]
}

export const TOP_K = 5
export const PRODUCT_PRICE_BOUNDS: PriceBounds = { min: 1000, max: 3000 }
export const DEFAULT_PRICE_RANGE: PriceBounds = { min: 1000, max: 3000 }

export function matchLabelFor(score: number): MatchLabel {
  if (score >= 85) return 'Strong match'
  if (score >= 60) return 'Good match'
  return 'Poor match'
}

export function gpuCharacteristicLabel(value: number, mode: CharacteristicMode = 'preferred'): string {
  return `GPU: RTX ${value} or higher${mode === 'required' ? ' · high priority' : ' · normal priority'}`
}

export function ramCharacteristicLabel(value: number, mode: CharacteristicMode = 'preferred'): string {
  return `RAM: ${value} GB${mode === 'required' ? ' · high priority' : ' · normal priority'}`
}

export function setCharacteristicMode(characteristic: Characteristic, mode: CharacteristicMode): Characteristic {
  if (characteristic.kind === 'gpu') {
    return { ...characteristic, mode, preferenceOnly: mode === 'preferred', label: gpuCharacteristicLabel(Number(characteristic.value), mode) }
  }
  if (characteristic.kind === 'ram') {
    return { ...characteristic, mode, preferenceOnly: mode === 'preferred', label: ramCharacteristicLabel(Number(characteristic.value), mode) }
  }
  return characteristic
}

export const DEFAULT_CHARACTERISTICS: Characteristic[] = [
  { id: 'use', label: 'Use: competitive and AAA gaming', kind: 'use', supported: true },
  { id: 'resolution', label: 'Resolution: 1440p · 120 fps', kind: 'resolution', value: '1440p', supported: true },
  { id: 'gpu', label: gpuCharacteristicLabel(4070), kind: 'gpu', value: 4070, mode: 'preferred', supported: true },
  { id: 'ram', label: ramCharacteristicLabel(32), kind: 'ram', value: 32, mode: 'preferred', supported: true },
  { id: 'condition', label: 'Condition: new only', kind: 'condition', supported: true },
]

const RESOLUTION_RANK: Record<Resolution, number> = {
  '1080p': 1,
  '1440p': 2,
  '4K': 3,
}

export function createCustomCharacteristic(label: string, id?: string): Characteristic {
  const clean = label.trim()
  return {
    id: id ?? `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: clean,
    kind: 'custom',
    supported: false,
  }
}

export function createSupportedCustomCharacteristic(label: string, id: string): Characteristic {
  return { id, label: label.trim(), kind: 'custom', supported: true }
}

/** Cheapest confirmed delivered total for a product, used only by the demo ranking. */
export function productPrice(product: Product, offers: Offer[]): number | null {
  const totals = offers
    .filter((offer) => offer.productId === product.id)
    .map(totalOf)
    .filter((total): total is number => total !== null)
  return totals.length > 0 ? Math.min(...totals) : null
}

export function matchesCharacteristic(product: Product, characteristic: Characteristic): boolean {
  void product
  void characteristic
  // Compatibility helper only: no preference mismatch is an eligibility gate.
  return true
}

const BASE_WEIGHTS: Record<CharacteristicKind, number> = {
  use: 10,
  resolution: 15,
  gpu: 25,
  ram: 20,
  condition: 5,
  avoidGpu: 15,
  value: 12,
  custom: 12,
}
const BUDGET_WEIGHT = 30

interface FeatureOutcome {
  matched: boolean
  fit?: number
  reason?: string
  tradeoff?: string
  unknown?: string
  weight: number
}

const pushUnique = (list: string[], value: string) => {
  if (value && !list.includes(value)) list.push(value)
}

function productText(product: Product): string {
  return `${product.name} ${product.tagline} ${product.features.join(' ')} ${product.config.cpu} ${product.config.gpu}`.toLowerCase()
}

function evaluateCustom(label: string, product: Product, offerRange: [number, number] | null, range: PriceBounds, supported: boolean): FeatureOutcome {
  const text = productText(product)
  const lower = label.toLowerCase()
  const weight = BASE_WEIGHTS.custom
  if (/quiet|noise|silent/.test(lower)) {
    return /quiet|low-noise|silent/.test(text)
      ? { matched: true, reason: `Low-noise design noted for ${product.name}, matching your quieter preference.`, weight }
      : { matched: false, tradeoff: `No fan-noise claim is listed for ${product.name}, against your quieter preference.`, weight }
  }
  if (/compact|small|space|mini/.test(lower)) {
    return /compact|mini|small/.test(text)
      ? { matched: true, reason: `Compact housing is listed for ${product.name}, matching your size preference.`, weight }
      : { matched: false, tradeoff: `${product.name} is a larger configuration than your compact-size preference.`, weight }
  }
  if (/cheap|lower delivered|lower price|budget|savings|value|expensive/.test(lower)) {
    if (!offerRange) return { matched: false, unknown: `Price could not be confirmed for ${product.name}, so your value preference cannot be scored.`, weight }
    const fits = offerRange[0] <= range.max * 0.85
    return fits
      ? { matched: true, reason: `Lowest delivered offer ${formatCHF(offerRange[0])} supports your value preference.`, weight }
      : { matched: false, tradeoff: `Lowest delivered offer is ${formatCHF(offerRange[0])}; it does not reach the cheaper part of your price preference.`, weight }
  }
  if (/more ram|larger ram|extra ram/.test(lower)) {
    return product.config.ramGB >= 32
      ? { matched: true, reason: `${product.config.ramGB} GB RAM supports your request for more memory.`, weight }
      : { matched: false, tradeoff: `${product.config.ramGB} GB RAM is below your request for more memory.`, weight }
  }
  if (/more gpu|faster gpu|stronger gpu|gpu performance/.test(lower)) {
    return gpuValue(product.config.gpu) >= 4070
      ? { matched: true, reason: `${product.config.gpu} supports your request for stronger graphics.`, weight }
      : { matched: false, tradeoff: `${product.config.gpu} is below your stronger-GPU preference.`, weight }
  }
  if (/hue/.test(lower)) {
    return /hue/.test(text)
      ? { matched: true, reason: 'Native Hue Bridge support is listed in the demo composition.', weight }
      : { matched: false, tradeoff: 'Hue Bridge support is not listed for this device.', weight }
  }
  if (/on\s*\/\s*off|no dimmer|dimmer/.test(lower)) {
    return /on\/off/.test(text) && !/only dimmable|dimmer only/.test(text)
      ? { matched: true, reason: 'ON/OFF operation without dimming is listed.', weight }
      : { matched: false, tradeoff: 'ON/OFF-only operation is not listed for this device.', weight }
  }
  if (/230\s*v|neutral|l\s*\+\s*n/.test(lower)) {
    return /230\s*v/.test(text)
      ? { matched: true, reason: 'The listed 230 V AC supply matches your wiring preference.', weight }
      : { matched: false, tradeoff: 'The listed voltage does not match your 230 V AC preference.', weight }
  }
  if (/junction|ceiling|mount|fixed wiring/.test(lower)) {
    return /ceiling|junction|fixed wiring/.test(text)
      ? { matched: true, reason: 'Ceiling / fixed-wiring installation is listed in the demo composition.', weight }
      : { matched: false, tradeoff: 'Ceiling fixed-wiring installation is not listed for this device.', weight }
  }
  if (/load|capacity|18\s*w/.test(lower)) {
    const requested = Number(lower.match(/(\d+)\s*w/)?.[1] ?? 18)
    const capacity = Number(text.match(/rated for (?:a )?(\d+)\s*w/)?.[1] ?? product.config.ramGB)
    return capacity >= requested
      ? { matched: true, fit: Math.min(1, capacity / Math.max(requested * 8, 1)), reason: `${capacity} W listed capacity covers your ${requested} W load preference.`, weight }
      : { matched: false, tradeoff: `${capacity} W listed capacity is below your ${requested} W load preference.`, weight }
  }
  if (/warranty/.test(lower)) {
    return { matched: false, unknown: 'Warranty length varies by seller offer, so it is shown in Buy rather than used in ranking.', weight: 0 }
  }
  if (!supported) {
    return { matched: false, unknown: `“${label}” cannot be verified in this fictional catalog, so it does not affect the score.`, weight: 0 }
  }
  return { matched: true, reason: `“${label}” is recorded as a general preference in this demo.`, weight: 0 }
}

function evaluateFeature(product: Product, feature: Characteristic, offerRange: [number, number] | null, range: PriceBounds): FeatureOutcome {
  const priority = feature.mode === 'required' ? 1.5 : 1
  const base = { weight: BASE_WEIGHTS[feature.kind] * priority }
  if (!feature.supported) {
    return { matched: false, unknown: `“${feature.label}” cannot be verified in this fictional catalog, so it does not affect the score.`, weight: 0 }
  }
  if (feature.kind === 'resolution') {
    const target = feature.value as Resolution
    return RESOLUTION_RANK[product.maxResolution] >= RESOLUTION_RANK[target]
      ? { ...base, matched: true, reason: `${product.maxResolution} output meets your ${target} target.` }
      : { ...base, matched: false, tradeoff: `${product.maxResolution} output is below your ${target} target.` }
  }
  if (feature.kind === 'gpu') {
    const target = Number(feature.value)
    return gpuValue(product.config.gpu) >= target
      ? { ...base, matched: true, reason: `${product.config.gpu} meets your RTX ${target}+ preference.` }
      : { ...base, matched: false, tradeoff: `${product.config.gpu} is below your RTX ${target}+ preference.` }
  }
  if (feature.kind === 'ram') {
    const target = Number(feature.value)
    return product.config.ramGB >= target
      ? { ...base, matched: true, reason: `${product.config.ramGB} GB RAM meets your ${target} GB preference.` }
      : { ...base, matched: false, tradeoff: `${product.config.ramGB} GB RAM is below your ${target} GB preference.` }
  }
  if (feature.kind === 'condition') {
    const wantsRefurbished = /refurb/i.test(feature.label)
    if (wantsRefurbished) {
      return product.config.condition === 'Refurbished'
        ? { ...base, matched: true, reason: 'Refurbished condition matches your preference.' }
        : { ...base, matched: false, tradeoff: `This unit is ${product.config.condition}, not refurbished.` }
    }
    return product.config.condition === 'New'
      ? { ...base, matched: true, reason: 'New condition matches your preference.' }
      : { ...base, matched: false, tradeoff: `This unit is ${product.config.condition}, not new.` }
  }
  if (feature.kind === 'use') {
    const use = String(feature.value ?? feature.label).replace(/^use:\s*/i, '')
    const text = productText(product)
    if (/gaming|game|fps|aaa|esport/.test(use)) {
      return /gaming|rtx|radeon|fps/.test(text)
        ? { ...base, matched: true, reason: `Built for gaming, matching your “${use}” request.` }
        : { ...base, matched: false, tradeoff: `No gaming capability is listed against your “${use}” request.` }
    }
    if (/edit|video|photo|render|3d|creative/.test(use)) {
      return product.config.ramGB >= 16 && gpuValue(product.config.gpu) >= 4060
        ? { ...base, matched: true, reason: `${product.config.gpu} and ${product.config.ramGB} GB RAM support your “${use}” work.` }
        : { ...base, matched: false, tradeoff: `The listed CPU/GPU/RAM is modest for your “${use}” work.` }
    }
    if (/stream|twitch|obs/.test(use)) {
      return product.config.ramGB >= 16 && gpuValue(product.config.gpu) >= 4060
        ? { ...base, matched: true, reason: `${product.config.gpu} and ${product.config.ramGB} GB RAM support your streaming request.` }
        : { ...base, matched: false, tradeoff: `The listed configuration is modest for streaming.` }
    }
    return { ...base, matched: true, reason: `General-purpose desktop suitable for “${use}”.` }
  }
  if (feature.kind === 'avoidGpu') {
    const avoid = gpuValue(String(feature.value ?? feature.label))
    return gpuValue(product.config.gpu) >= avoid
      ? { ...base, matched: false, tradeoff: `${product.config.gpu} overlaps the GPU family you asked to avoid.` }
      : { ...base, matched: true, reason: `${product.config.gpu} avoids the GPU family you asked to avoid.` }
  }
  if (feature.kind === 'value') {
    if (!offerRange) return { ...base, matched: false, unknown: 'Price is unconfirmed, so the value preference cannot be scored.' }
    return offerRange[0] <= range.max * 0.85
      ? { ...base, matched: true, reason: `Lowest delivered offer ${formatCHF(offerRange[0])} supports your value preference.` }
      : { ...base, matched: false, tradeoff: `Lowest delivered offer is ${formatCHF(offerRange[0])}, above the cheaper part of your price preference.` }
  }
  return evaluateCustom(feature.label, product, offerRange, range, feature.supported)
}

function evaluateBudget(offerRange: [number, number] | null, range: PriceBounds): FeatureOutcome {
  const weight = BUDGET_WEIGHT
  if (!offerRange) {
    return { matched: false, unknown: 'No confirmed delivered price is available, so the price preference cannot be scored.', weight }
  }
  const [low, high] = offerRange
  if (low > range.max) {
    return {
      matched: false,
      tradeoff: `Lowest delivered offer ${formatCHF(low)} is ${formatCHF(low - range.max)} above your ${formatCHF(range.max)} soft ceiling; included so you can compare.`,
      weight,
    }
  }
  if (high < range.min) {
    return {
      matched: false,
      tradeoff: `All confirmed offers (${formatCHF(low)}–${formatCHF(high)}) are below your ${formatCHF(range.min)} soft lower target.`,
      weight,
    }
  }
  const overCeiling = high > range.max
  return {
    matched: true,
    reason: overCeiling
      ? `Offers span ${formatCHF(low)}–${formatCHF(high)}, inside your ${formatCHF(range.max)} ceiling; the top offer sits near it.`
      : `Offers span ${formatCHF(low)}–${formatCHF(high)}, within your ${formatCHF(range.min)}–${formatCHF(range.max)} soft price preference.`,
    weight,
  }
}

/**
 * Rank every product by preference adherence. Nothing is removed for a miss;
 * each result reports its positive fit and explicit trade-offs.
 */
export function rankProducts(
  products: Product[],
  offers: Offer[],
  characteristics: Characteristic[],
  range: PriceBounds,
): RankedProduct[] {
  const ranked = products.map((product, index) => {
    const productOffers = offers.filter((offer) => offer.productId === product.id)
    const price = priceRange(productOffers)
    const offerRange: [number, number] | null = price ? [price.min, price.max] : null
    const retailers = priceRangeRetailers(productOffers)
    const reasons: string[] = []
    const tradeoffs: string[] = []
    const unknown: string[] = []
    let earned = 0
    let total = 0

    for (const feature of characteristics) {
      const outcome = evaluateFeature(product, feature, offerRange, range)
      if (outcome.weight === 0) {
        if (outcome.unknown) pushUnique(unknown, outcome.unknown)
        continue
      }
      total += outcome.weight
      if (outcome.matched) earned += outcome.weight * (outcome.fit ?? 1)
      if (outcome.reason) pushUnique(reasons, outcome.reason)
      if (outcome.tradeoff) pushUnique(tradeoffs, outcome.tradeoff)
      if (outcome.unknown) pushUnique(unknown, outcome.unknown)
    }

    const budget = evaluateBudget(offerRange, range)
    total += budget.weight
    if (budget.matched) earned += budget.weight
    else if (offerRange && offerRange[0] > range.max) {
      const over = offerRange[0] - range.max
      earned += budget.weight * Math.max(0, 0.5 - over / Math.max(range.max, 1))
    } else if (offerRange) {
      earned += budget.weight * 0.5
    }
    if (budget.reason) pushUnique(reasons, budget.reason)
    if (budget.tradeoff) pushUnique(tradeoffs, budget.tradeoff)
    if (budget.unknown) pushUnique(unknown, budget.unknown)

    const score = total === 0 ? 0 : Math.round((earned / total) * 1000) / 10
    const label = matchLabelFor(score)
    return { product, score, label, offerRange, priceBasis: price?.basis ?? null, retailers, reasons, tradeoffs, unknown, index }
  })

  return ranked
    .sort((a, b) => b.score - a.score
      || (a.offerRange?.[0] ?? Infinity) - (b.offerRange?.[0] ?? Infinity)
      || a.index - b.index)
    .map(({ index: _index, ...result }) => result)
}

export function findDiscoveryMatches(
  products: Product[],
  offers: Offer[],
  characteristics: Characteristic[],
  range: PriceBounds,
): DiscoveryResult {
  const unsupported = characteristics.filter((characteristic) => !characteristic.supported)
  const ranked = rankProducts(products, offers, characteristics, range)
  const scores = Object.fromEntries(ranked.map((result) => [result.product.id, result.score]))
  return { matches: ranked.map((result) => result.product), scores, unsupported }
}

export function scoreProductPreference(product: Product, offers: Offer[], characteristics: Characteristic[], range: PriceBounds): number {
  return rankProducts([product], offers, characteristics, range)[0]?.score ?? 0
}

export function filterSignature(characteristics: Characteristic[], range: PriceBounds): string {
  const features = characteristics
    .map((characteristic) => `${characteristic.id}:${characteristic.kind}:${String(characteristic.value ?? '')}:${characteristic.mode ?? ''}:${characteristic.preferenceOnly ?? false}:${characteristic.label}`)
    .sort()
    .join(',')
  return `${range.min}|${range.max}|${features}`
}

/** Build the legacy Brief consumed by offer helpers from the new flow state. */
export function deriveBrief(characteristics: Characteristic[], range: PriceBounds): Brief {
  const next: Brief = {
    ...defaultBrief,
    budgetMin: range.min,
    budgetMax: range.max,
    minHard: false,
    learned: [],
    notes: '',
  }

  const resolution = characteristics.find((characteristic) => characteristic.kind === 'resolution')
  if (resolution) {
    next.resolution = resolution.value as Resolution
    next.targetFps = next.resolution === '4K' ? 60 : next.resolution === '1440p' ? 120 : 144
  }

  const gpu = characteristics.find((characteristic) => characteristic.kind === 'gpu')
  next.gpu = gpu
    ? { mode: gpu.mode ?? 'preferred', value: Number(gpu.value) }
    : { mode: 'preferred', value: 4060 }

  const ram = characteristics.find((characteristic) => characteristic.kind === 'ram')
  next.ram = ram
    ? { mode: ram.mode ?? 'preferred', value: Number(ram.value) }
    : { mode: 'preferred', value: 16 }

  next.newOnly = characteristics.some((characteristic) => characteristic.kind === 'condition')
  return next
}
