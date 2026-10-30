export type Stage = 'ask' | 'configure' | 'discover' | 'buy'

const steps: Array<{ id: Stage | 'learn'; label: string }> = [
  { id: 'ask', label: 'Ask' }, { id: 'configure', label: 'Configure' },
  { id: 'discover', label: 'Discover' }, { id: 'learn', label: 'Learn' }, { id: 'buy', label: 'Buy' },
]

interface Props {
  stage: Stage
  learning: boolean
  canConfigure: boolean
  canBuy: boolean
  onNavigate: (stage: Stage) => void
}

export default function StageProgress({ stage, learning, canConfigure, canBuy, onNavigate }: Props) {
  return <nav className="breadcrumb" aria-label="Shopping journey">
    <ol>{steps.map((step) => {
      if (step.id === 'learn') {
        return <li key={step.id}>
          <button type="button" disabled aria-current={learning ? 'step' : undefined}
            title="Learn happens in the feedback dialog over Discover. Dismiss a result to open it."
            aria-describedby="learn-step-note" data-testid="stage-learn">Learn</button>
          <span id="learn-step-note" hidden>Learning happens in the feedback dialog over Discover.</span>
        </li>
      }
      const reason = step.id !== 'ask' && !canConfigure ? 'Complete your request in Ask first.'
        : step.id === 'buy' && !canBuy ? 'Select a product in Discover first.' : undefined
      return <li key={step.id}>
        <button type="button" disabled={Boolean(reason)} title={reason}
          aria-current={stage === step.id && !(learning && step.id === 'discover') ? 'step' : undefined}
          data-testid={`stage-${step.id}`} onClick={() => onNavigate(step.id as Stage)}>{step.label}</button>
      </li>
    })}</ol>
  </nav>
}
