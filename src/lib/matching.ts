import {
  GPU_TIERS,
  type Brief,
  type DismissReason,
  type LearnedPref,
  type MatchResult,
  type Offer,
  type Product,
  type RequirementMode,
} from '../data/fixtures'
import { formatCHF, groupOffers, priceRange, totalOf } from './sellers'

export interface Clarification {
  ram?: RequirementMode | 'keep'
  gpu?: RequirementMode | 'keep'
}

export interface ClarificationPrompt {
  key: 'ram' | 'gpu'
  question: string
  options: Array<{ value: RequirementMode | 'keep'; label: string }>
}

export interface DismissalResult {
  brief: Brief
  message: string
  learnedAdded: LearnedPref[]
}

export function gpuValue(gpu: string): number {
  return GPU_TIERS[gpu] ?? Number(gpu.match(/\d{4}/)?.[0] ?? 0)
}

export function computeMatch(product: Product, brief: Brief, productOffers: Offer[]): MatchResult {
  const hardFailures: string[] = []
  const softMisses: string[] = []
  const unknown: string[] = []
  const reasons: string[] = []
  const groups = groupOffers(productOffers)
  const best = groups.confirmedInStock[0]?.total ?? null
  const range = priceRange(productOffers)
  const confirmedTotals = productOffers.map(totalOf).filter((n): n is number => n !== null)
  const unknownCosts = productOffers.filter((offer) => totalOf(offer) === null)
  const withinBudget = confirmedTotals.filter((total) => total <= brief.budgetMax)

  if (brief.newOnly && product.config.condition !== 'New') {
    hardFailures.push('Condition differs from “new only”.')
  }
  if (brief.avoidGpu.includes(product.config.gpu)) {
    hardFailures.push(`GPU ${product.config.gpu} is on the “avoid” list.`)
  }
  if (brief.gpu.mode === 'required' && gpuValue(product.config.gpu) < brief.gpu.value) {
    hardFailures.push(`GPU ${product.config.gpu}: below the required RTX ${brief.gpu.value} minimum.`)
  }
  if (brief.ram.mode === 'required' && product.config.ramGB < brief.ram.value) {
    hardFailures.push(`RAM ${product.config.ramGB} GB: below the required ${brief.ram.value} GB minimum.`)
  }

  if (productOffers.length === 0) {
    unknown.push('No offers available from active sources.')
  } else if (confirmedTotals.length === 0 && unknownCosts.length === 0) {
    hardFailures.push('No price or cost information available.')
  } else if (confirmedTotals.length > 0 && withinBudget.length === 0) {
    if (unknownCosts.length > 0) {
      unknown.push(`No confirmed offer within ${formatCHF(brief.budgetMax)}; ${unknownCosts.length} total(s) unconfirmed.`)
    } else {
      hardFailures.push(`All confirmed offers exceed the ${formatCHF(brief.budgetMax)} budget ceiling.`)
    }
  } else if (confirmedTotals.length === 0 && unknownCosts.length > 0) {
    unknown.push(`Final price unconfirmed for ${unknownCosts.length} offer(s).`)
  }

  if (brief.minHard && best !== null && best < brief.budgetMin) {
    hardFailures.push(`Below the mandatory minimum of ${formatCHF(brief.budgetMin)}.`)
  }
  const inStockWithinBudget = groups.confirmedInStock.filter((row) => (row.total ?? Infinity) <= brief.budgetMax)
  if (withinBudget.length > 0 && inStockWithinBudget.length === 0) {
    unknown.push('An offer is within budget, but availability is unconfirmed.')
  }

  const gpuMeets = gpuValue(product.config.gpu) >= brief.gpu.value
  const ramMeets = product.config.ramGB >= brief.ram.value
  if (!gpuMeets && brief.gpu.mode === 'preferred') {
    softMisses.push(`GPU ${product.config.gpu}; preference is RTX ${brief.gpu.value} or higher.`)
  }
  if (!ramMeets && brief.ram.mode === 'preferred') {
    softMisses.push(`RAM ${product.config.ramGB} GB; preference is ${brief.ram.value} GB.`)
  }
  if (best !== null && best > brief.budgetMax) {
    softMisses.push(`The lowest confirmed total with known stock is ${formatCHF(best)}, above the ${formatCHF(brief.budgetMax)} ceiling.`)
  } else if (best !== null && best > brief.budgetMax * 0.9) {
    softMisses.push(`Near the budget ceiling (${formatCHF(best)} of ${formatCHF(brief.budgetMax)}).`)
  }
  if (!brief.minHard && best !== null && best < brief.budgetMin) {
    softMisses.push(`Below the ${formatCHF(brief.budgetMin)} target: the minimum is a soft preference.`)
  }

  if (gpuMeets) reasons.push(`GPU ${product.config.gpu} ${brief.gpu.mode} requirement met`)
  if (ramMeets) reasons.push(`${product.config.ramGB} GB RAM ${brief.ram.mode} requirement met`)
  if (best !== null) reasons.push(`Lowest delivered total shown: ${formatCHF(best)}`)
  if (range?.unknownCount) reasons.push(`${range.unknownCount} offer(s) with unconfirmed totals`)
  if (product.config.condition === 'New') reasons.push('New condition')

  let tier: MatchResult['tier'] = 'strong'
  if (hardFailures.length > 0) tier = 'conflict'
  else if (unknown.length > 0) tier = 'unknown'
  else if (softMisses.length > 0) tier = 'preference'

  let score: number | null = null
  if (tier !== 'conflict' && tier !== 'unknown' && best !== null) {
    const spec = Math.min(100, 45 + (gpuMeets ? 25 : 0) + (ramMeets ? 20 : 0) + (product.config.storageGB >= 1000 ? 10 : 0))
    const value = Math.max(0, Math.min(100, 100 - 55 * (best / brief.budgetMax)))
    const confidence = groups.confirmedInStock.length
      ? groups.confirmedInStock.reduce((sum, row) => sum + row.offer.confidence, 0) / groups.confirmedInStock.length
      : 0
    const valuePriority = brief.learned.some((pref) => pref.kind === 'value')
    score = valuePriority
      ? Math.round((spec * 0.4 + value * 0.45 + confidence * 0.15) * 10) / 10
      : Math.round((spec * 0.55 + value * 0.3 + confidence * 0.15) * 10) / 10
  }

  return {
    productId: product.id,
    tier,
    reasons: [...hardFailures, ...unknown, ...softMisses, ...reasons],
    score,
    hardFailures,
    softMisses,
    unknown,
    bestOffer: best,
    offerRange: range ? [range.min, range.max] : null,
    excluded: tier === 'conflict',
  }
}

export function evaluateCatalog(
  products: Product[],
  brief: Brief,
  offers: Offer[],
  discoveredIds: string[],
  dismissedIds: string[],
) {
  const results = products
    .filter((product) => discoveredIds.includes(product.id) && !dismissedIds.includes(product.id))
    .map((product) => computeMatch(product, brief, offers.filter((offer) => offer.productId === product.id)))
  const feasible = results
    .filter((result) => result.tier === 'strong' || result.tier === 'preference')
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (a.bestOffer ?? Infinity) - (b.bestOffer ?? Infinity))
  const excluded = results.filter((result) => result.tier === 'conflict')
  const unknown = results.filter((result) => result.tier === 'unknown')
  return { results, feasible, excluded, unknown }
}

export function clarificationsFor(reasons: DismissReason[], brief: Brief): ClarificationPrompt[] {
  const prompts: ClarificationPrompt[] = []
  if (reasons.includes('ram')) {
    prompts.push({
      key: 'ram',
      question: `Should ${brief.ram.value} GB of RAM be required or preferred?`,
      options: [
        { value: 'required', label: `Required (${brief.ram.value} GB minimum)` },
        { value: 'preferred', label: 'Preference only' },
        { value: 'keep', label: 'Keep current settings' },
      ],
    })
  }
  if (reasons.includes('gpu')) {
    prompts.push({
      key: 'gpu',
      question: `Should RTX ${brief.gpu.value} or higher be required or preferred?`,
      options: [
        { value: 'required', label: `Required (RTX ${brief.gpu.value}+)` },
        { value: 'preferred', label: 'Preference only' },
        { value: 'keep', label: 'Keep current settings' },
      ],
    })
  }
  return prompts
}

function addLearned(brief: Brief, pref: LearnedPref): { brief: Brief; added: LearnedPref | null } {
  const exists = brief.learned.some((item) => item.kind === pref.kind && item.value === pref.value)
  if (exists) return { brief, added: null }
  return { brief: { ...brief, learned: [...brief.learned, pref] }, added: pref }
}

export function applyDismissal(
  product: Product,
  reasons: DismissReason[],
  clarification: Clarification,
  brief: Brief,
): DismissalResult {
  let next = { ...brief, learned: [...brief.learned] }
  const added: LearnedPref[] = []
  const messages: string[] = []

  const ramMode = clarification.ram ?? 'keep'
  const gpuMode = clarification.gpu ?? 'keep'
  if (reasons.includes('ram')) {
    if (ramMode === 'required') next.ram = { ...next.ram, mode: 'required' }
    if (ramMode === 'preferred') next.ram = { ...next.ram, mode: 'preferred' }
    const learned = addLearned(next, {
      id: `ram-${next.ram.mode}-${next.ram.value}`,
      kind: 'ram',
      label: `RAM: ${next.ram.value} GB${next.ram.mode === 'preferred' ? ' · preference only' : ' · required'}`,
      value: next.ram.value,
      previousMode: brief.ram.mode,
      previousValue: brief.ram.value,
    })
    next = learned.brief
    if (learned.added) added.push(learned.added)
    messages.push(ramMode === 'required' ? 'You made RAM a requirement.' : 'RAM is recorded as a preference, not a requirement.')
  }
  if (reasons.includes('gpu')) {
    if (gpuMode === 'required') next.gpu = { ...next.gpu, mode: 'required' }
    if (gpuMode === 'preferred') next.gpu = { ...next.gpu, mode: 'preferred' }
    const learned = addLearned(next, {
      id: `gpu-${next.gpu.mode}-${next.gpu.value}`,
      kind: 'gpu',
      label: `RTX ${next.gpu.value}+ GPU ${next.gpu.mode}`,
      value: next.gpu.value,
      previousMode: brief.gpu.mode,
      previousValue: brief.gpu.value,
    })
    next = learned.brief
    if (learned.added) added.push(learned.added)
    messages.push(gpuMode === 'required' ? 'You made the GPU a requirement.' : 'The GPU is recorded as a preference, not a requirement.')
  }
  if (reasons.includes('avoidGpu')) {
    if (!next.avoidGpu.includes(product.config.gpu)) {
      next.avoidGpu = [...next.avoidGpu, product.config.gpu]
    }
    const learned = addLearned(next, {
      id: `avoid-${product.config.gpu}`,
      kind: 'avoidGpu',
      label: `Avoid ${product.config.gpu}`,
      value: product.config.gpu,
    })
    next = learned.brief
    if (learned.added) added.push(learned.added)
    messages.push(`Added ${product.config.gpu} to the avoid list. You can remove it from your settings.`)
  }
  if (reasons.includes('expensive')) {
    const learned = addLearned(next, {
      id: 'value-priority',
      kind: 'value',
      label: 'Prioritize savings',
      value: 'value',
    })
    next = learned.brief
    if (learned.added) added.push(learned.added)
    messages.push('Added “prioritize savings” as a soft preference; the budget ceiling is unchanged.')
  }
  if (reasons.includes('other') && brief.notes.trim()) {
    messages.push('Your note was saved without creating automatic rules.')
  }
  if (reasons.includes('skip')) {
    messages.push('Product excluded without learning a preference. You can undo this.')
  }
  return { brief: next, message: messages.join(' ') || 'Product excluded.', learnedAdded: added }
}

export function removeLearned(brief: Brief, learnedId: string): Brief {
  const pref = brief.learned.find((item) => item.id === learnedId)
  if (!pref) return brief
  let next: Brief = { ...brief, learned: brief.learned.filter((item) => item.id !== learnedId) }
  if (pref.kind === 'avoidGpu') {
    next = { ...next, avoidGpu: next.avoidGpu.filter((gpu) => gpu !== pref.value) }
  }
  if (pref.kind === 'ram') {
    next = { ...next, ram: { mode: pref.previousMode ?? 'preferred', value: pref.previousValue ?? 32 } }
  }
  if (pref.kind === 'gpu') {
    next = { ...next, gpu: { mode: pref.previousMode ?? 'preferred', value: pref.previousValue ?? 4070 } }
  }
  return next
}

export function discoverAlternatives(
  product: Product,
  reasons: DismissReason[],
  discoveredIds: string[],
  dismissedIds: string[],
): string[] {
  if (reasons.includes('skip')) return []
  const map: Record<string, string[]> = {
    expensive: ['pulse-air', 'aura', 'vega'],
    ram: ['vega', 'orbit-pro', 'aura'],
    gpu: ['aero', 'vega', 'orbit-pro'],
    avoidGpu: ['orbit-pro', 'aero', 'vega'],
    other: ['vega', 'aero'],
  }
  const candidates = [...new Set(reasons.flatMap((reason) => map[reason] ?? []))]
  return candidates
    .filter((id) => id !== product.id && !discoveredIds.includes(id) && !dismissedIds.includes(id))
    .slice(0, 2)
}
