import type { Characteristic } from './flow'
import { createCustomCharacteristic, createSupportedCustomCharacteristic, gpuCharacteristicLabel, ramCharacteristicLabel } from './flow'

export type DemoCategory = 'pc' | 'relay'

export interface ExtractedRequirements {
  features: Characteristic[]
  budgetMax: number | null
}

const PC_USE_RULES: Array<{ id: string; pattern: RegExp; label: string }> = [
  { id: 'use-gaming', pattern: /game|gaming|fps|steam|esport|aaa/i, label: 'Use: gaming' },
  { id: 'use-creative', pattern: /video edit|editing|premiere|davinci|photo|render|blender|3d/i, label: 'Use: photo / video / 3D work' },
  { id: 'use-streaming', pattern: /stream|twitch|obs/i, label: 'Use: streaming' },
  { id: 'use-coding', pattern: /coding|program|developer|software/i, label: 'Use: coding' },
  { id: 'use-office', pattern: /office|school|study|writing|spreadsheet/i, label: 'Use: everyday productivity' },
]

function parseMoney(raw: string): number | null {
  let clean = raw.replace(/[’'\s]/g, '')
  clean = /^\d{1,3}(?:,\d{3})+$/.test(clean) ? clean.replace(/,/g, '') : clean.replace(/,/g, '.')
  const value = Number(clean)
  return Number.isFinite(value) && value > 0 ? value : null
}

export function extractBudget(text: string): number | null {
  const patterns = [
    /(?:chf|francs?|budget|max(?:imum)?|under|below|up to|around|about)\s*(?:chf|francs?)?\s*([\d][\d'’,.]*)/i,
    /([\d][\d'’,.]*)\s*(?:chf|francs?)/i,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const parsed = parseMoney(match[1])
      if (parsed !== null) return parsed
    }
  }
  return null
}

function priorityFor(text: string): 'required' | 'preferred' {
  return /must|required|at least|minimum|need\b|only|high priority/i.test(text) ? 'required' : 'preferred'
}

function uniqueByLabel(features: Characteristic[]): Characteristic[] {
  const seen = new Set<string>()
  return features.filter((feature) => {
    const key = feature.kind === 'use' ? feature.id : feature.label.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function extractPc(text: string): Characteristic[] {
  const features: Characteristic[] = []
  for (const rule of PC_USE_RULES) {
    if (rule.pattern.test(text)) features.push({ id: rule.id, label: rule.label, kind: 'use', value: rule.label.replace(/^Use:\s*/i, ''), supported: true })
  }

  const resolution = text.match(/\b(4k|2160p|1440p|qhd|1080p|full\s*hd)\b/i)?.[0]?.toLowerCase().replace(/\s+/g, '')
  if (resolution) {
    const value = /4k|2160/.test(resolution) ? '4K' : /1440|qhd/.test(resolution) ? '1440p' : '1080p'
    features.push({ id: 'resolution', label: `Resolution: ${value}`, kind: 'resolution', value, supported: true })
  }

  const ram = text.match(/\b(8|16|32|64|128)\s*gb\b/i)
  if (ram) {
    const value = Number(ram[1])
    const mode = priorityFor(text)
    features.push({ id: 'ram', label: ramCharacteristicLabel(value, mode), kind: 'ram', value, mode, supported: true })
  }

  const gpu = text.match(/\b(?:rtx\s*)?(4060|4070|4080)\b(?:\s*(ti|super))?/i)
  if (gpu) {
    const value = Number(gpu[1])
    const mode = priorityFor(text)
    features.push({ id: 'gpu', label: gpuCharacteristicLabel(value, mode), kind: 'gpu', value, mode, supported: true })
  }

  if (/brand new|new only|new condition|sealed/i.test(text)) {
    features.push({ id: 'condition', label: 'Condition: new', kind: 'condition', supported: true })
  } else if (/refurb/i.test(text)) {
    features.push({ id: 'condition', label: 'Condition: refurbished', kind: 'condition', supported: true })
  }

  if (/quiet|noise|silent/i.test(text)) features.push(createSupportedCustomCharacteristic('Prefer quieter products.', 'quiet'))
  if (/compact|small|mini|space[- ]saving/i.test(text)) features.push(createSupportedCustomCharacteristic('Prefer compact products.', 'compact'))
  if (/cheap|cheaper|value|budget[- ]friendly|save money|lower price/i.test(text)) features.push(createSupportedCustomCharacteristic('Prioritize lower delivered prices.', 'value'))
  if (/more ram|extra ram|larger ram/i.test(text) && !ram) features.push(createSupportedCustomCharacteristic('Prefer more RAM.', 'more-ram'))

  const explicit = text.match(/(?:prefer|would like|want)\s+([^,.!?;]{3,60})/i)
  if (explicit) {
    const phrase = explicit[1].trim()
    const known = features.some((feature) => feature.label.toLowerCase().includes(phrase.toLowerCase()))
    const recognizedPhrase = /quiet|noise|silent|compact|small|mini|cheap|cheaper|value|ram|memory|gpu|graphics|rgb|hue|watt|capacity|voltage|wiring|ceiling/i.test(phrase)
    if (!known && !recognizedPhrase) features.push(createCustomCharacteristic(phrase))
  }
  return uniqueByLabel(features)
}

function extractRelay(text: string): Characteristic[] {
  const features: Characteristic[] = []
  if (/hue/i.test(text)) features.push({ id: 'hue', label: 'Philips Hue Bridge compatible', kind: 'custom', supported: true })
  if (/on\s*\/\s*off|no dimmer|switch/i.test(text)) features.push({ id: 'on-off', label: 'ON/OFF only · no dimmer', kind: 'custom', supported: true })
  if (/230|neutral|l\s*\+\s*n/i.test(text)) features.push({ id: 'voltage', label: '230 V AC · neutral L+N available', kind: 'custom', supported: true })
  if (/junction|ceiling|mount|fixed wiring/i.test(text)) features.push({ id: 'mount', label: 'Ceiling junction box · fixed wiring', kind: 'custom', supported: true })
  const load = text.match(/\b(\d+)\s*w\b/i)
  if (load) features.push({ id: 'load', label: `Load: ${load[1]} W`, kind: 'custom', supported: true })
  if (/compact|small|mini|space[- ]saving/i.test(text)) features.push(createSupportedCustomCharacteristic('Prefer compact products.', 'compact'))
  if (/cheap|cheaper|value|budget[- ]friendly|lower price/i.test(text)) features.push(createSupportedCustomCharacteristic('Prioritize lower delivered prices.', 'value'))

  const explicit = text.match(/(?:prefer|would like|want)\s+([^,.!?;]{3,60})/i)
  if (explicit) {
    const phrase = explicit[1].trim()
    const known = features.some((feature) => feature.label.toLowerCase().includes(phrase.toLowerCase()))
    const recognizedPhrase = /quiet|noise|silent|compact|small|mini|cheap|cheaper|value|hue|watts?|capacity|voltage|wiring|ceiling|neutral|dimmer/i.test(phrase)
    if (!known && !recognizedPhrase) features.push(createCustomCharacteristic(phrase))
  }
  return uniqueByLabel(features)
}

/** Extract only what the user actually wrote; there is no default requirement set. */
export function extractRequirements(category: DemoCategory, text: string): ExtractedRequirements {
  const budgetMax = extractBudget(text)
  return {
    features: (category === 'pc' ? extractPc(text) : extractRelay(text)).map((feature) => ({ ...feature, origin: 'chat' as const })),
    budgetMax,
  }
}

export interface FeedbackInterpretation {
  text: string
  interpretable: boolean
}

const REASON_LABELS: Record<DemoCategory, Record<string, string>> = {
  pc: {
    expensive: 'Prefer lower delivered prices.',
    ram: 'Prefer more RAM.',
    gpu: 'Prefer stronger GPU performance.',
    compact: 'Prefer compact products.',
    quiet: 'Prefer quieter products.',
  },
  relay: {
    expensive: 'Prefer lower delivered prices.',
    capacity: 'Prefer higher load capacity.',
    compact: 'Prefer compact products.',
    compatibility: 'Prefer verified Hue Bridge compatibility.',
    wiring: 'Prefer verified 230 V fixed-wiring support.',
  },
}

function preferenceForClause(category: DemoCategory, clause: string): string | null {
  const text = clause.toLowerCase()
  if (/cheap|cheaper|lower price|lower delivered|budget|expensive|price|value|save/.test(text)) return 'Prefer lower delivered prices.'
  if (/more ram|extra ram|larger ram|memory/.test(text)) return 'Prefer more RAM.'
  if (/stronger gpu|faster gpu|more gpu|gpu performance|graphics/.test(text)) return 'Prefer stronger GPU performance.'
  if (/quiet|noise|silent/.test(text)) return 'Prefer quieter products.'
  if (/compact|small|space|mini/.test(text)) return 'Prefer compact products.'
  if (/capacity|watt|power|load/.test(text)) {
    if (category === 'relay') return 'Prefer higher load capacity.'
    return null
  }
  if (/hue|bridge|compatib/.test(text)) return category === 'relay' ? 'Prefer verified Hue Bridge compatibility.' : null
  if (/wiring|230|neutral|voltage|junction|ceiling/.test(text)) return category === 'relay' ? 'Prefer verified 230 V fixed-wiring support.' : null
  return null
}

/** Derive a visible, editable clarification from the user's reasons and note. */
export function deriveFeedbackClarification(category: DemoCategory, reasons: string[], note: string): FeedbackInterpretation {
  const parts: string[] = []
  for (const reason of reasons) {
    const label = REASON_LABELS[category][reason]
    if (label && !parts.includes(label)) parts.push(label)
  }
  const clauses = note.split(/[;.!?]+/).map((clause) => clause.trim()).filter(Boolean)
  for (const clause of clauses) {
    const label = preferenceForClause(category, clause)
    if (label && !parts.includes(label)) parts.push(label)
  }
  return { text: parts.join('; '), interpretable: parts.length > 0 }
}

/**
 * Turn the edited clarification into ranking preferences. Known demo attributes
 * map to supported preferences; text that cannot be interpreted is retained as
 * an explicitly unverified requirement rather than silently ignored.
 */
export function preferencesFromFeedback(category: DemoCategory, text: string): Characteristic[] {
  const clean = text.trim()
  if (!clean) return []
  const clauses = clean.split(/[;]+/).map((clause) => clause.trim()).filter(Boolean)
  const features: Characteristic[] = []
  for (const clause of clauses) {
    const label = preferenceForClause(category, clause)
    if (!label) {
      features.push(createCustomCharacteristic(clause))
      continue
    }
    if (label === 'Prefer more RAM.') {
      features.push(createSupportedCustomCharacteristic(label, 'feedback-more-ram'))
    } else if (label === 'Prefer stronger GPU performance.') {
      features.push(createSupportedCustomCharacteristic(label, 'feedback-stronger-gpu'))
    } else if (label === 'Prefer quieter products.') {
      features.push(createSupportedCustomCharacteristic(label, 'feedback-quiet'))
    } else if (label === 'Prefer compact products.') {
      features.push(createSupportedCustomCharacteristic(label, 'feedback-compact'))
    } else if (label === 'Prefer lower delivered prices.') {
      features.push(createSupportedCustomCharacteristic(label, 'feedback-value'))
    } else if (label === 'Prefer higher load capacity.') {
      features.push(createSupportedCustomCharacteristic(label, 'feedback-capacity'))
    } else if (label === 'Prefer verified Hue Bridge compatibility.') {
      features.push(createSupportedCustomCharacteristic(label, 'feedback-hue'))
    } else if (label === 'Prefer verified 230 V fixed-wiring support.') {
      features.push(createSupportedCustomCharacteristic(label, 'feedback-wiring'))
    } else {
      features.push(createCustomCharacteristic(label))
    }
  }
  return uniqueByLabel(features).map((feature) => ({ ...feature, origin: 'feedback' as const }))
}
