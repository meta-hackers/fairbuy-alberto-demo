export type Stage = 'ask' | 'configure' | 'discover' | 'learn' | 'buy'

const steps: Array<{ id: Stage; label: string }> = [
  { id: 'ask', label: 'Ask' }, { id: 'configure', label: 'Configure' },
  { id: 'discover', label: 'Discover' }, { id: 'learn', label: 'Learn' }, { id: 'buy', label: 'Buy' },
]

interface Props {
  stage: Stage
  canConfigure: boolean
  canBuy: boolean
  onNavigate: (stage: Stage) => void
}

export default function StageProgress({ stage, canConfigure, canBuy, onNavigate }: Props) {
  return <nav className="breadcrumb" aria-label="Shopping journey">
    <ol>{steps.map((step) => {
      const reason = step.id !== 'ask' && !canConfigure ? 'Complete your request in Ask first.'
        : step.id === 'buy' && !canBuy ? 'Select a product in Discover first.' : undefined
      return <li key={step.id}>
        <button type="button" disabled={Boolean(reason)} title={reason}
          aria-current={stage === step.id ? 'step' : undefined}
          data-testid={`stage-${step.id}`} onClick={() => onNavigate(step.id)}>{step.label}</button>
      </li>
    })}</ol>
  </nav>
}
