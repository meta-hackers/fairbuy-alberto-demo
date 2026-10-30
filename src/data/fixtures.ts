// All products and offers below are invented UI fixtures, not live retailer evidence.
export type Condition = 'New' | 'Refurbished'
export type Tier = 'strong' | 'preference' | 'conflict' | 'unknown'
export type RequirementMode = 'required' | 'preferred'
export type Retailer = 'Amazon' | 'Galaxus' | 'MediaWorld' | 'TechStore' | 'PC Dock' | 'Lantern Lane' | 'Bright Parcel'
export type Stock = 'Available' | 'Out of stock' | 'To be confirmed'
export type Resolution = '1080p' | '1440p' | '4K'
export type Illustration = 'forge' | 'pulse' | 'elite' | 'strix' | 'flux' | 'vega' | 'air' | 'orbit' | 'titan' | 'aura'

export interface Config {
  cpu: string
  gpu: string
  ramGB: number
  storageGB: number
  condition: Condition
}

export interface Offer {
  id: string
  productId: string
  retailer: Retailer
  seller: string
  item: number
  shipping: number | null
  fees: number | null
  stock: Stock
  deliveryDays: string
  warrantyMonths: number
  returnDays: number
  sourceTs: string
  confidence: number
  note?: string
}

export interface Product {
  id: string
  name: string
  config: Config
  tagline: string
  features: string[]
  maxResolution: Resolution
  illustration: Illustration
  pool: 'primary' | 'alternative'
}

export interface Requirement {
  mode: RequirementMode
  value: number
}

export interface LearnedPref {
  id: string
  kind: 'value' | 'avoidGpu' | 'ram' | 'gpu'
  label: string
  value: string | number
  previousMode?: RequirementMode
  previousValue?: number
}

export interface Brief {
  budgetMin: number
  budgetMax: number
  minHard: boolean
  includesPeripherals: boolean
  resolution: string
  targetFps: number
  games: string[]
  gpu: Requirement
  ram: Requirement
  avoidGpu: string[]
  newOnly: boolean
  city: 'Zurich'
  learned: LearnedPref[]
  notes: string
}

export type DismissReason = 'expensive' | 'ram' | 'gpu' | 'avoidGpu' | 'other' | 'skip'

export interface MatchResult {
  productId: string
  tier: Tier
  reasons: string[]
  score: number | null
  hardFailures: string[]
  softMisses: string[]
  unknown: string[]
  bestOffer: number | null
  offerRange: [number, number] | null
  excluded: boolean
}

export const GPU_TIERS: Record<string, number> = {
  'RTX 4060': 4060,
  'RTX 4060 Ti': 4060.5,
  'RTX 4070': 4070,
  'RTX 4070 SUPER': 4070.5,
  'RTX 4070 Ti': 4070.7,
  'RTX 4080 SUPER': 4080,
}

export const defaultBrief: Brief = {
  budgetMin: 1200,
  budgetMax: 2400,
  minHard: false,
  includesPeripherals: false,
  resolution: '1440p',
  targetFps: 120,
  games: ['Competitive FPS', 'AAA games'],
  gpu: { mode: 'preferred', value: 4070 },
  ram: { mode: 'preferred', value: 32 },
  avoidGpu: [],
  newOnly: true,
  city: 'Zurich',
  learned: [],
  notes: '',
}

const o = (
  id: string,
  productId: string,
  retailer: Retailer,
  item: number,
  shipping: number | null,
  fees: number | null,
  stock: Stock,
  deliveryDays: string,
  warrantyMonths: number,
  returnDays: number,
  sourceTs: string,
  confidence: number,
  note?: string,
): Offer => ({ id, productId, retailer, seller: retailer, item, shipping, fees, stock, deliveryDays, warrantyMonths, returnDays, sourceTs, confidence, note })

export const products: Product[] = [
  {
    id: 'nova', name: 'NOVA Forge 4070 SUPER', pool: 'primary', illustration: 'forge',
    maxResolution: '1440p',
    config: { cpu: 'Intel Core i7-13700F', gpu: 'RTX 4070 SUPER', ramGB: 32, storageGB: 1000, condition: 'New' },
    tagline: 'High-end balance: competitive 1440p and AAA gaming without compromise.',
    features: ['32 GB DDR5', '1 TB SSD', 'Ray tracing', 'Low-noise fans'],
  },
  {
    id: 'orbit', name: 'ORBIT Pulse 4060 Ti', pool: 'primary', illustration: 'pulse',
    maxResolution: '1440p',
    config: { cpu: 'AMD Ryzen 5 7600', gpu: 'RTX 4060 Ti', ramGB: 16, storageGB: 1000, condition: 'New' },
    tagline: 'Aggressive price, but 16 GB and the 4060 Ti are trade-offs.',
    features: ['16 GB DDR5', '1 TB SSD', 'Balanced 1440p', 'Compact form factor'],
  },
  {
    id: 'vortex', name: 'VORTEX Elite 4080 SUPER', pool: 'primary', illustration: 'elite',
    maxResolution: '4K',
    config: { cpu: 'AMD Ryzen 9 7900X', gpu: 'RTX 4080 SUPER', ramGB: 32, storageGB: 1000, condition: 'New' },
    tagline: 'High performance; one offer approaches the budget ceiling.',
    features: ['32 GB DDR5', '1 TB SSD', '4K ready', 'Liquid cooling'],
  },
  {
    id: 'strix', name: 'STRIX Core 4060 Ti', pool: 'primary', illustration: 'strix',
    maxResolution: '1440p',
    config: { cpu: 'Intel Core i5-13400F', gpu: 'RTX 4060 Ti', ramGB: 16, storageGB: 1000, condition: 'New' },
    tagline: 'A good 1440p entry point, with RAM and GPU below preferences.',
    features: ['16 GB DDR4', '1 TB SSD', 'Compact', 'Affordable price'],
  },
  {
    id: 'vega', name: 'VEGA Mini 4070', pool: 'alternative', illustration: 'vega',
    maxResolution: '1440p',
    config: { cpu: 'AMD Ryzen 7 7700', gpu: 'RTX 4070', ramGB: 32, storageGB: 1000, condition: 'New' },
    tagline: 'Compact alternative with 32 GB and an RTX 4070.',
    features: ['32 GB DDR5', '1 TB SSD', 'Mini-ITX', 'Low power consumption'],
  },
  {
    id: 'aero', name: 'AERO Flux 4070 Ti', pool: 'alternative', illustration: 'flux',
    maxResolution: '1440p',
    config: { cpu: 'Intel Core i5-14600KF', gpu: 'RTX 4070 Ti', ramGB: 32, storageGB: 1000, condition: 'New' },
    tagline: 'More GPU performance for the same budget: an alternative above the preferred threshold.',
    features: ['32 GB DDR5', '1 TB SSD', '4070 Ti', 'Optimized airflow'],
  },
  {
    id: 'pulse-air', name: 'PULSE Air 4060', pool: 'alternative', illustration: 'air',
    maxResolution: '1080p',
    config: { cpu: 'Intel Core i5-13400F', gpu: 'RTX 4060', ramGB: 16, storageGB: 1000, condition: 'New' },
    tagline: 'Budget option surfaced after price feedback.',
    features: ['16 GB DDR5', '1 TB SSD', 'Full HD/1440p', 'Quiet operation'],
  },
  {
    id: 'orbit-pro', name: 'ORBIT Pro 4070', pool: 'alternative', illustration: 'orbit',
    maxResolution: '1440p',
    config: { cpu: 'AMD Ryzen 7 7800X3D', gpu: 'RTX 4070', ramGB: 32, storageGB: 1000, condition: 'New' },
    tagline: 'The ORBIT family with 32 GB and an RTX 4070, without the 4060 Ti.',
    features: ['32 GB DDR5', '1 TB SSD', '4070', 'Compact case'],
  },
  {
    id: 'titan', name: 'TITAN Edge 4080 SUPER', pool: 'alternative', illustration: 'titan',
    maxResolution: '4K',
    config: { cpu: 'Intel Core i9-14900K', gpu: 'RTX 4080 SUPER', ramGB: 32, storageGB: 2000, condition: 'New' },
    tagline: 'Premium configuration with a higher price point.',
    features: ['32 GB DDR5', '2 TB SSD', '4080 SUPER', '4K high refresh'],
  },
  {
    id: 'aura', name: 'AURA Studio 4070', pool: 'alternative', illustration: 'aura',
    maxResolution: '1440p',
    config: { cpu: 'AMD Ryzen 5 7600', gpu: 'RTX 4070', ramGB: 16, storageGB: 1000, condition: 'New' },
    tagline: 'Capable GPU but 16 GB: a trade-off against the preferred RAM target.',
    features: ['16 GB DDR5', '1 TB SSD', '4070', 'Clean design'],
  },
]

export const offers: Offer[] = [
  o('nova-g', 'nova', 'Galaxus', 1869, 0, 30, 'Available', '2–3 days', 24, 30, '27 Oct 2026, 09:40', 92),
  o('nova-m', 'nova', 'MediaWorld', 1919, 20, 0, 'Available', '3–5 days', 24, 14, '27 Oct 2026, 09:12', 88),
  o('nova-a', 'nova', 'Amazon', 1949, 0, 30, 'Available', '1–2 days', 24, 30, '27 Oct 2026, 08:55', 90),
  o('nova-t', 'nova', 'TechStore', 2029, 0, 0, 'Available', '5–7 days', 12, 14, '26 Oct 2026, 18:20', 76),
  o('nova-p', 'nova', 'PC Dock', 1840, 49, 20, 'Available', '4–6 days', 12, 14, '27 Oct 2026, 07:30', 88),
  o('orbit-a', 'orbit', 'Amazon', 1420, 30, 0, 'Available', '1–2 days', 24, 30, '27 Oct 2026, 10:05', 89),
  o('orbit-m', 'orbit', 'MediaWorld', 1600, 40, 0, 'Available', '3–5 days', 24, 14, '27 Oct 2026, 09:44', 84),
  o('orbit-g', 'orbit', 'Galaxus', 1510, 0, 20, 'Available', '2–3 days', 24, 30, '27 Oct 2026, 09:02', 90),
  o('vortex-g', 'vortex', 'Galaxus', 2299, 0, 51, 'Available', '2–4 days', 24, 30, '27 Oct 2026, 10:12', 87),
  o('vortex-a', 'vortex', 'Amazon', 2620, 29, 0, 'Available', '1–2 days', 24, 30, '27 Oct 2026, 08:40', 85),
  o('vortex-m', 'vortex', 'MediaWorld', 2600, 49, 0, 'Available', '3–5 days', 24, 14, '27 Oct 2026, 08:31', 81),
  o('strix-g', 'strix', 'Galaxus', 1560, 0, 39, 'Available', '2–3 days', 24, 30, '27 Oct 2026, 09:58', 86),
  o('strix-m', 'strix', 'MediaWorld', 1739, 40, 0, 'Available', '3–5 days', 24, 14, '27 Oct 2026, 09:20', 82),
  o('strix-a', 'strix', 'Amazon', 1660, 29, 0, 'Available', '1–2 days', 24, 30, '27 Oct 2026, 08:47', 84),
  o('vega-g', 'vega', 'Galaxus', 1749, 0, 0, 'Available', '2–3 days', 24, 30, '27 Oct 2026, 11:02', 90),
  o('vega-a', 'vega', 'Amazon', 1799, 0, 0, 'Available', '1–2 days', 24, 30, '27 Oct 2026, 10:55', 88),
  o('aero-g', 'aero', 'Galaxus', 1999, 0, 0, 'Available', '2–3 days', 24, 30, '27 Oct 2026, 11:10', 91),
  o('aero-m', 'aero', 'MediaWorld', 2049, 0, 0, 'Available', '3–5 days', 24, 14, '27 Oct 2026, 10:48', 86),
  o('air-a', 'pulse-air', 'Amazon', 1149, 50, 0, 'Available', '1–2 days', 24, 30, '27 Oct 2026, 11:20', 87),
  o('air-g', 'pulse-air', 'Galaxus', 1249, 0, 0, 'Available', '2–3 days', 24, 30, '27 Oct 2026, 11:18', 88),
  o('orbitpro-a', 'orbit-pro', 'Amazon', 1829, 0, 0, 'Available', '1–2 days', 24, 30, '27 Oct 2026, 11:26', 89),
  o('orbitpro-g', 'orbit-pro', 'Galaxus', 1899, 0, 0, 'Available', '2–3 days', 24, 30, '27 Oct 2026, 11:22', 90),
  o('titan-g', 'titan', 'Galaxus', 2799, 0, 0, 'Available', '2–4 days', 24, 30, '27 Oct 2026, 11:30', 86),
  o('titan-a', 'titan', 'Amazon', 2899, 0, 0, 'Available', '1–2 days', 24, 30, '27 Oct 2026, 11:28', 84),
  o('aura-a', 'aura', 'Amazon', 1650, 25, 0, 'Available', '1–2 days', 24, 30, '27 Oct 2026, 11:36', 87),
  o('aura-m', 'aura', 'MediaWorld', 1699, 0, 0, 'Available', '3–5 days', 24, 14, '27 Oct 2026, 11:34', 85),
  o('aura-d', 'aura', 'PC Dock', 1580, 35, 10, 'Available', '3–4 days', 12, 14, '27 Oct 2026, 11:32', 86),
]
