import type { Characteristic } from './flow'
import { setCharacteristicMode } from './flow'
import type { Clarification } from './matching'

export interface FeatureChange { before: Characteristic; after: Characteristic }
export interface Feedback {
  id: string
  productId: string
  productName: string
  reasons: string[]
  note: string
  clarification: string
  active: boolean
  changes: FeatureChange[]
}

export function clarifyFeatures(features: Characteristic[], reasons: string[], clarification: Clarification) {
  const changes: FeatureChange[] = []
  const next = features.map((feature) => {
    if (feature.kind !== 'ram' && feature.kind !== 'gpu') return feature
    const mode = clarification[feature.kind]
    if (!reasons.includes(feature.kind) || !mode || mode === 'keep') return feature
    const after = setCharacteristicMode(feature, mode)
    changes.push({ before: feature, after })
    return after
  })
  return { next, changes }
}

/** Undo only our exact feature objects: never restore snapshots over later user edits. */
export function undoFeatureChanges(features: Characteristic[], changes: FeatureChange[]): Characteristic[] {
  return features.map((feature) => changes.find((change) => change.after === feature)?.before ?? feature)
}

export const reasonLabels: Record<string, string> = {
  expensive: 'Too expensive', ram: 'Insufficient RAM', gpu: 'Insufficient GPU',
  avoidGpu: 'GPU to avoid (feedback only)', other: 'Other reason', skip: 'No reason given',
  compatibility: 'Compatibility to verify', capacity: 'Capacity / load to verify',
}
