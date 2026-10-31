import { describe, expect, it } from 'vitest'
import {
  deriveFeedbackClarification,
  extractBudget,
  extractRequirements,
  preferencesFromFeedback,
} from './requirements'

describe('requirement extraction from natural chat', () => {
  it('extracts PC requirements from the user text instead of a default set', () => {
    const extracted = extractRequirements('pc', 'I need a computer for photo editing in 4K with 64 GB RAM and a quiet case, budget CHF 2,400')
    expect(extracted.features.map((feature) => feature.id)).toEqual(expect.arrayContaining(['use-creative', 'resolution', 'ram', 'quiet']))
    expect(extracted.features.find((feature) => feature.id === 'resolution')?.value).toBe('4K')
    expect(extracted.features.find((feature) => feature.id === 'ram')?.value).toBe(64)
    expect(extracted.budgetMax).toBe(2400)
    expect(extracted.features.every((feature) => feature.origin === 'chat')).toBe(true)
  })

  it('combines useful details across both turns without inventing a default GPU', () => {
    const text = 'I need a computer for gaming CHF 2000, 1440p, 32 GB RAM'
    const extracted = extractRequirements('pc', text)
    expect(extracted.features.find((feature) => feature.id === 'use-gaming')).toBeTruthy()
    expect(extracted.features.find((feature) => feature.id === 'resolution')?.value).toBe('1440p')
    expect(extracted.features.find((feature) => feature.id === 'ram')?.value).toBe(32)
    expect(extracted.features.find((feature) => feature.kind === 'gpu')).toBeUndefined()
    expect(extracted.budgetMax).toBe(2000)
  })

  it('extracts relay scenario details only when written', () => {
    const relay = extractRequirements('relay', 'A smart switch for my 18 W neon light, Hue Bridge, 230 V with neutral, ceiling box, compact please')
    expect(relay.features.map((feature) => feature.id)).toEqual(expect.arrayContaining(['hue', 'voltage', 'mount', 'load', 'compact']))
    expect(relay.features.find((feature) => feature.id === 'load')?.label).toContain('18 W')
  })

  it('reads CHF budgets in common forms', () => {
    expect(extractBudget('budget CHF 60')).toBe(60)
    expect(extractBudget("max 2'000 CHF")).toBe(2000)
    expect(extractBudget('around 1,800')).toBe(1800)
    expect(extractBudget('no price yet')).toBeNull()
  })
})

describe('feedback interpretation', () => {
  it('turns selected reasons and free text into a visible clarification', () => {
    const result = deriveFeedbackClarification('pc', ['expensive', 'quiet'], 'I prefer a compact case')
    expect(result.interpretable).toBe(true)
    expect(result.text).toContain('Prefer lower delivered prices.')
    expect(result.text).toContain('Prefer quieter products.')
    expect(result.text).toContain('Prefer compact products.')
  })

  it('maps supported free text to ranking preferences', () => {
    const labels = preferencesFromFeedback('pc', 'Prefer more RAM; Prefer stronger GPU performance.').map((feature) => feature.label)
    expect(labels).toEqual(['Prefer more RAM.', 'Prefer stronger GPU performance.'])
    expect(preferencesFromFeedback('pc', 'Prefer more RAM.')[0].supported).toBe(true)
    expect(preferencesFromFeedback('pc', 'Prefer more RAM.')[0].origin).toBe('feedback')
  })

  it('keeps an uninterpretable note transparent and unverified instead of silently ignoring it', () => {
    const derived = deriveFeedbackClarification('pc', [], 'It must match my curtains')
    expect(derived.interpretable).toBe(false)
    const learned = preferencesFromFeedback('pc', 'It must match my curtains')
    expect(learned).toHaveLength(1)
    expect(learned[0].supported).toBe(false)
    expect(learned[0].label).toContain('curtains')
  })
})
