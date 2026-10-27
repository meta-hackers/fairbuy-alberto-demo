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

  if (brief.newOnly && product.config.condition !== 'Nuovo') {
    hardFailures.push('Condizione diversa da “solo nuovo”.')
  }
  if (brief.avoidGpu.includes(product.config.gpu)) {
    hardFailures.push(`GPU ${product.config.gpu} presente nella lista “da evitare”.`)
  }
  if (brief.gpu.mode === 'required' && gpuValue(product.config.gpu) < brief.gpu.value) {
    hardFailures.push(`GPU ${product.config.gpu}: sotto il minimo obbligatorio RTX ${brief.gpu.value}.`)
  }
  if (brief.ram.mode === 'required' && product.config.ramGB < brief.ram.value) {
    hardFailures.push(`RAM ${product.config.ramGB} GB: sotto il minimo obbligatorio ${brief.ram.value} GB.`)
  }

  if (productOffers.length === 0) {
    unknown.push('Nessuna offerta disponibile dalle fonti attive.')
  } else if (confirmedTotals.length === 0 && unknownCosts.length === 0) {
    hardFailures.push('Nessun prezzo o costo disponibile.')
  } else if (confirmedTotals.length > 0 && withinBudget.length === 0) {
    if (unknownCosts.length > 0) {
      unknown.push(`Nessuna offerta confermata entro ${formatCHF(brief.budgetMax)}; ${unknownCosts.length} totale da confermare.`)
    } else {
      hardFailures.push(`Tutte le offerte confermate superano il tetto di ${formatCHF(brief.budgetMax)}.`)
    }
  } else if (confirmedTotals.length === 0 && unknownCosts.length > 0) {
    unknown.push(`Prezzo finale non confermato per ${unknownCosts.length} offerta/e.`)
  }

  if (brief.minHard && best !== null && best < brief.budgetMin) {
    hardFailures.push(`Sotto il minimo obbligatorio di ${formatCHF(brief.budgetMin)}.`)
  }
  const inStockWithinBudget = groups.confirmedInStock.filter((row) => (row.total ?? Infinity) <= brief.budgetMax)
  if (withinBudget.length > 0 && inStockWithinBudget.length === 0) {
    unknown.push('Offerta entro budget con disponibilità non confermata.')
  }

  const gpuMeets = gpuValue(product.config.gpu) >= brief.gpu.value
  const ramMeets = product.config.ramGB >= brief.ram.value
  if (!gpuMeets && brief.gpu.mode === 'preferred') {
    softMisses.push(`GPU ${product.config.gpu}; preferisci RTX ${brief.gpu.value} o superiore.`)
  }
  if (!ramMeets && brief.ram.mode === 'preferred') {
    softMisses.push(`RAM ${product.config.ramGB} GB; preferisci ${brief.ram.value} GB.`)
  }
  if (best !== null && best > brief.budgetMax) {
    softMisses.push(`Il totale confermato più basso con stock certo è ${formatCHF(best)}, sopra il tetto di ${formatCHF(brief.budgetMax)}.`)
  } else if (best !== null && best > brief.budgetMax * 0.9) {
    softMisses.push(`Vicino al tetto di budget (${formatCHF(best)} su ${formatCHF(brief.budgetMax)}).`)
  }
  if (!brief.minHard && best !== null && best < brief.budgetMin) {
    softMisses.push(`Sotto il target minimo di ${formatCHF(brief.budgetMin)}: il minimo è una preferenza soft.`)
  }

  if (gpuMeets) reasons.push(`GPU ${product.config.gpu} ${brief.gpu.mode === 'required' ? 'obbligatoria' : 'preferita'} rispettata`)
  if (ramMeets) reasons.push(`${product.config.ramGB} GB di RAM ${brief.ram.mode === 'required' ? 'obbligatori' : 'preferiti'} rispettati`)
  if (best !== null) reasons.push(`Migliore totale consegnato confermato: ${formatCHF(best)}`)
  if (range?.unknownCount) reasons.push(`${range.unknownCount} offerta/e con totale non confermato`)
  if (product.config.condition === 'Nuovo') reasons.push('Condizione nuova')
  reasons.push('Dati fixture sintetiche, nessuna offerta reale')

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
      question: `Vuoi rendere ${brief.ram.value} GB di RAM obbligatori o solo preferiti?`,
      options: [
        { value: 'required', label: `Obbligatori (${brief.ram.value} GB minimo)` },
        { value: 'preferred', label: 'Solo una preferenza' },
        { value: 'keep', label: 'Non cambiare il brief' },
      ],
    })
  }
  if (reasons.includes('gpu')) {
    prompts.push({
      key: 'gpu',
      question: `Vuoi rendere RTX ${brief.gpu.value} o superiore obbligatoria o solo preferita?`,
      options: [
        { value: 'required', label: `Obbligatoria (RTX ${brief.gpu.value}+)` },
        { value: 'preferred', label: 'Solo una preferenza' },
        { value: 'keep', label: 'Non cambiare il brief' },
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
      label: `RAM ${next.ram.value} GB ${next.ram.mode === 'required' ? 'obbligatoria' : 'preferita'}`,
      value: next.ram.value,
      previousMode: brief.ram.mode,
      previousValue: brief.ram.value,
    })
    next = learned.brief
    if (learned.added) added.push(learned.added)
    messages.push(ramMode === 'required' ? 'Hai reso la RAM un requisito obbligatorio.' : 'Ho registrato la RAM come preferenza, non come regola obbligatoria.')
  }
  if (reasons.includes('gpu')) {
    if (gpuMode === 'required') next.gpu = { ...next.gpu, mode: 'required' }
    if (gpuMode === 'preferred') next.gpu = { ...next.gpu, mode: 'preferred' }
    const learned = addLearned(next, {
      id: `gpu-${next.gpu.mode}-${next.gpu.value}`,
      kind: 'gpu',
      label: `GPU RTX ${next.gpu.value}+ ${next.gpu.mode === 'required' ? 'obbligatoria' : 'preferita'}`,
      value: next.gpu.value,
      previousMode: brief.gpu.mode,
      previousValue: brief.gpu.value,
    })
    next = learned.brief
    if (learned.added) added.push(learned.added)
    messages.push(gpuMode === 'required' ? 'Hai reso la GPU un requisito obbligatorio.' : 'Ho registrato la GPU come preferenza, non come regola obbligatoria.')
  }
  if (reasons.includes('avoidGpu')) {
    if (!next.avoidGpu.includes(product.config.gpu)) {
      next.avoidGpu = [...next.avoidGpu, product.config.gpu]
    }
    const learned = addLearned(next, {
      id: `avoid-${product.config.gpu}`,
      kind: 'avoidGpu',
      label: `Evita ${product.config.gpu}`,
      value: product.config.gpu,
    })
    next = learned.brief
    if (learned.added) added.push(learned.added)
    messages.push(`Ho aggiunto ${product.config.gpu} alle GPU da evitare. Puoi rimuoverla dal brief.`)
  }
  if (reasons.includes('expensive')) {
    const learned = addLearned(next, {
      id: 'value-priority',
      kind: 'value',
      label: 'Dare priorità al risparmio',
      value: 'value',
    })
    next = learned.brief
    if (learned.added) added.push(learned.added)
    messages.push('Ho aggiunto “priorità al risparmio” come preferenza soft; il tetto di budget non cambia.')
  }
  if (reasons.includes('other') && brief.notes.trim()) {
    messages.push('La tua nota è stata salvata nel brief senza creare regole automatiche.')
  }
  if (reasons.includes('skip')) {
    messages.push('Prodotto rimosso senza apprendere preferenze. Puoi annullare.')
  }
  return { brief: next, message: messages.join(' ') || 'Prodotto rimosso.', learnedAdded: added }
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
