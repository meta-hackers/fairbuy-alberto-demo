import type { Characteristic } from '../lib/flow'
import type { Stock } from './fixtures'

// Entirely fictional scenario, devices, sellers, specifications, and offers.
// Hue support is an invented scenario attribute, not certification or evidence
// about any real relay model. No source URLs, live stock, or wiring guidance.
export const RELAY_SCENARIO = { loadW: 18, voltageV: 230, bridge: 'Philips Hue Bridge' }
export const RELAY_FEATURES: Characteristic[] = [
  { id: 'hue', label: 'Philips Hue Bridge compatible', kind: 'custom', supported: true },
  { id: 'on-off', label: 'ON/OFF only · no dimmer', kind: 'custom', supported: true },
  { id: 'voltage', label: '230 V AC · neutral L+N available', kind: 'custom', supported: true },
  { id: 'mount', label: 'Ceiling junction box · fixed wiring', kind: 'custom', supported: true },
  { id: 'load', label: 'Neon consumption: 18 W', kind: 'custom', supported: true },
]

// Nullable fields intentionally retain future missing-data handling.
export interface RelayOffer {
  seller: string
  item: number | null
  shipping: number | null
  fees: number | null
  stock: Stock
  deliveryDays: string
  warrantyMonths: number
  returnDays: number
  recorded: string
}
export interface RelayProduct {
  id: string
  name: string
  capacityW: number
  hueCompatible: boolean
  onOffOnly: boolean
  voltageV: number
  dimensions: string
  protection: string
  claim: string
  offers: RelayOffer[]
}

export function relayTotal(offer: RelayOffer): number | null {
  return offer.item === null || offer.shipping === null || offer.fees === null
    ? null : Math.round((offer.item + offer.shipping + offer.fees) * 100) / 100
}
export function relayPrice(product: RelayProduct): number | null {
  const totals = product.offers.map(relayTotal).filter((total): total is number => total !== null)
  return totals.length ? Math.min(...totals) : null
}
export function relayFitsScenario(product: RelayProduct): boolean {
  return product.capacityW >= RELAY_SCENARIO.loadW && product.voltageV === RELAY_SCENARIO.voltageV && product.hueCompatible && product.onOffOnly
}

export const relayProducts: RelayProduct[] = [
  {
    id: 'luma-one', name: 'LumaNest Relay One', capacityW: 120, hueCompatible: true, onOffOnly: true,
    voltageV: 230, dimensions: '42 × 42 × 18 mm', protection: 'IP20',
    claim: 'ON/OFF relay with native Hue Bridge support. Rated for a 120 W LED load; suitable for the 18 W neon scenario. Neutral required; designed for a ceiling junction box.',
    offers: [
      { seller: 'Lantern Lane', item: 29.65, shipping: 5, fees: 0, stock: 'Available', deliveryDays: '2–3 days', warrantyMonths: 24, returnDays: 30, recorded: '28 Oct 2026, 10:00' },
      { seller: 'Bright Parcel', item: 32, shipping: 3.5, fees: 0.5, stock: 'Available', deliveryDays: '1–2 days', warrantyMonths: 24, returnDays: 30, recorded: '28 Oct 2026, 10:15' },
    ],
  },
  {
    id: 'glow-mini', name: 'Glowstead Mini Relay', capacityW: 150, hueCompatible: true, onOffOnly: true,
    voltageV: 230, dimensions: '40 × 40 × 17 mm', protection: 'IP20',
    claim: 'Compact ON/OFF relay with native Hue Bridge support. Rated for a 150 W LED load; suitable for the 18 W neon scenario. Neutral required; designed for a ceiling junction box.',
    offers: [
      { seller: 'Bright Parcel', item: 42, shipping: 6, fees: 1, stock: 'Available', deliveryDays: '3–4 days', warrantyMonths: 36, returnDays: 30, recorded: '28 Oct 2026, 10:20' },
      { seller: 'Lantern Lane', item: 46, shipping: 4, fees: 0, stock: 'Available', deliveryDays: '2–3 days', warrantyMonths: 36, returnDays: 14, recorded: '28 Oct 2026, 10:25' },
    ],
  },
  {
    id: 'ember-link', name: 'Embervale Link Relay', capacityW: 100, hueCompatible: true, onOffOnly: true,
    voltageV: 230, dimensions: '45 × 43 × 19 mm', protection: 'IP20',
    claim: 'ON/OFF relay with native Hue Bridge support. Rated for a 100 W LED load; suitable for the 18 W neon scenario. Neutral required; designed for a ceiling junction box.',
    offers: [
      { seller: 'Lantern Lane', item: 34, shipping: 4, fees: 1, stock: 'Available', deliveryDays: '2–4 days', warrantyMonths: 24, returnDays: 30, recorded: '28 Oct 2026, 10:30' },
      { seller: 'Bright Parcel', item: 37, shipping: 3, fees: 0, stock: 'Available', deliveryDays: '1–3 days', warrantyMonths: 24, returnDays: 14, recorded: '28 Oct 2026, 10:35' },
    ],
  },
]

export const RELAY_FOLLOW_UP = 'The starting setup is an 18 W neon light, a Hue Bridge, and a 230 V supply with neutral available. What is your budget, and do you have a size preference?'
