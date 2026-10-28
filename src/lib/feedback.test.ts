import { describe, expect, it } from 'vitest'
import { clarifyFeatures, undoFeatureChanges } from './feedback'
import { DEFAULT_CHARACTERISTICS, setCharacteristicMode } from './flow'

describe('reversible explicit feedback', () => {
  it('does not infer requirements from a price rejection or note', () => {
    const { next, changes } = clarifyFeatures(DEFAULT_CHARACTERISTICS, ['expensive', 'other'], { ram: 'required' })
    expect(next).toEqual(DEFAULT_CHARACTERISTICS)
    expect(changes).toEqual([])
  })
  it('applies and undoes only an explicit RAM choice', () => {
    const { next, changes } = clarifyFeatures(DEFAULT_CHARACTERISTICS, ['ram'], { ram: 'required', gpu: 'keep' })
    expect(next.find((f) => f.id === 'ram')?.mode).toBe('required')
    expect(next.find((f) => f.id === 'gpu')?.mode).toBe('preferred')
    expect(undoFeatureChanges(next, changes)).toEqual(DEFAULT_CHARACTERISTICS)
  })
  it('preserves later edits instead of restoring a stale snapshot', () => {
    const { next, changes } = clarifyFeatures(DEFAULT_CHARACTERISTICS, ['ram'], { ram: 'required' })
    const later = next.map((f) => f.id === 'ram' ? setCharacteristicMode(f, 'preferred') : f)
    expect(undoFeatureChanges(later, changes)).toEqual(later)
  })
})
