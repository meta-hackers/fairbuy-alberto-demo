export type Stage = 'ask' | 'configure' | 'discover' | 'product'

const steps = [
  { id: 'ask', label: 'Richiesta', short: 'ASK' },
  { id: 'configure', label: 'Configura', short: 'CONFIGURE' },
  { id: 'discover', label: 'Scoperta', short: 'DISCOVER' },
] as const

function currentIndex(stage: Stage): number {
  if (stage === 'ask') return 0
  if (stage === 'configure') return 1
  return 2
}

interface Props {
  stage: Stage
  canConfigure: boolean
  onNavigate: (stage: Stage) => void
}

export default function StageProgress({ stage, canConfigure, onNavigate }: Props) {
  const index = currentIndex(stage)
  return (
    <nav className="stage-progress" aria-label="Avanzamento del percorso guidato">
      <div className="stage-progress__track" aria-hidden="true">
        <span style={{ width: `${(index / (steps.length - 1)) * 100}%` }} />
      </div>
      <ol>
        {steps.map((step, i) => {
          const active = i === index
          const done = i < index
          const locked = step.id !== 'ask' && !canConfigure
          return (
            <li key={step.id} className={active ? 'is-active' : done ? 'is-done' : ''}>
              <button
                type="button"
                disabled={locked}
                onClick={() => onNavigate(step.id)}
                aria-current={active ? 'step' : undefined}
                aria-disabled={locked || undefined}
                data-testid={`stage-${step.id}`}
              >
                <span className="stage-progress__num">{done ? '✓' : String(i + 1).padStart(2, '0')}</span>
                <span className="stage-progress__label">{step.label}</span>
                <span className="stage-progress__short">{step.short}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
