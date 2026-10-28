import {
  defaultBrief,
  type Brief,
  type Offer,
  type Product,
  type Resolution,
} from '../data/fixtures'
import { gpuValue } from './matching'
import { totalOf } from './sellers'

export type CharacteristicKind = 'use' | 'resolution' | 'gpu' | 'ram' | 'condition' | 'custom'

export interface Characteristic {
  id: string
  label: string
  kind: CharacteristicKind
  value?: string | number
  /** Preset characteristics can be verified against fixture specs. Custom text cannot. */
  supported: boolean
}

export interface PriceBounds {
  min: number
  max: number
}

export interface DiscoveryResult {
  matches: Product[]
  /** Characteristics that the fixture catalog cannot verify (custom text). */
  unsupported: Characteristic[]
}

export const PRODUCT_PRICE_BOUNDS: PriceBounds = { min: 1000, max: 3000 }
export const DEFAULT_PRICE_RANGE: PriceBounds = { min: 1000, max: 3000 }

export const DEFAULT_CHARACTERISTICS: Characteristic[] = [
  { id: 'use', label: 'Uso: gaming competitivo e AAA', kind: 'use', supported: true },
  { id: 'resolution', label: 'Risoluzione: 1440p · 120 fps', kind: 'resolution', value: '1440p', supported: true },
  { id: 'gpu', label: 'GPU: RTX 4070 o superiore', kind: 'gpu', value: 4070, supported: true },
  { id: 'ram', label: 'RAM: 32 GB', kind: 'ram', value: 32, supported: true },
  { id: 'condition', label: 'Condizione: solo nuovo', kind: 'condition', supported: true },
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

/** Cheapest confirmed delivered total for a product, used only by the demo filter. */
export function productPrice(product: Product, offers: Offer[]): number | null {
  const totals = offers
    .filter((offer) => offer.productId === product.id)
    .map(totalOf)
    .filter((total): total is number => total !== null)
  return totals.length > 0 ? Math.min(...totals) : null
}

export function matchesCharacteristic(product: Product, characteristic: Characteristic): boolean {
  if (!characteristic.supported) return true
  if (characteristic.kind === 'resolution') {
    return RESOLUTION_RANK[product.maxResolution] >= RESOLUTION_RANK[characteristic.value as Resolution]
  }
  if (characteristic.kind === 'gpu') {
    return gpuValue(product.config.gpu) >= Number(characteristic.value)
  }
  if (characteristic.kind === 'ram') {
    return product.config.ramGB >= Number(characteristic.value)
  }
  if (characteristic.kind === 'condition') {
    return product.config.condition === 'Nuovo'
  }
  return true
}

export function findDiscoveryMatches(
  products: Product[],
  offers: Offer[],
  characteristics: Characteristic[],
  range: PriceBounds,
): DiscoveryResult {
  const unsupported = characteristics.filter((characteristic) => !characteristic.supported)
  const matches = products.filter((product) => {
    const price = productPrice(product, offers)
    if (price === null || price < range.min || price > range.max) return false
    return characteristics.every((characteristic) => matchesCharacteristic(product, characteristic))
  })
  return { matches, unsupported }
}

export function filterSignature(characteristics: Characteristic[], range: PriceBounds): string {
  const features = characteristics
    .map((characteristic) => `${characteristic.id}:${characteristic.kind}:${String(characteristic.value ?? '')}`)
    .sort()
    .join(',')
  return `${range.min}|${range.max}|${features}`
}

/** Build the legacy Brief consumed by cards/offers from the new flow state. */
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
    ? { mode: 'preferred', value: Number(gpu.value) }
    : { mode: 'preferred', value: 4060 }

  const ram = characteristics.find((characteristic) => characteristic.kind === 'ram')
  next.ram = ram
    ? { mode: 'preferred', value: Number(ram.value) }
    : { mode: 'preferred', value: 16 }

  next.newOnly = characteristics.some((characteristic) => characteristic.kind === 'condition')
  return next
}
