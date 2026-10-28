export type Stage = 'ask' | 'configure' | 'discover' | 'learn' | 'product' | 'compare'

const steps = [
  { id: 'ask', label: 'Richiesta', short: 'ASK' },
  { id: 'configure', label: 'Configura', short: 'CONFIGURE' },
  { id: 'discover', label: 'Scoperta', short: 'DISCOVER' },
  { id: 'learn', label: 'Feedback', short: 'LEARN' },
  { id: 'product', label: 'Scelta esatta', short: 'CHOOSE' },
  { id: 'compare', label: 'Confronto', short: 'COMPARE' },
] as const

function currentIndex(stage: Stage): number {
  if (stage === 'ask') return 0
  if (stage === 'configure') return 1
  return steps.findIndex((step) => step.id === stage)
}

interface Props {
  stage: Stage
  canConfigure: boolean
  onNavigate: (stage: Stage) => void
  canChoose?: boolean
  canCompare?: boolean
}

export default function StageProgress({ stage, canConfigure, canChoose = false, canCompare = false, onNavigate }: Props) {
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
          const reason = step.id !== 'ask' && !canConfigure ? 'Invia prima due messaggi in ASK.'
            : step.id === 'product' && !canChoose ? 'Apri prima un prodotto dai risultati.'
              : step.id === 'compare' && !canCompare ? 'Seleziona prima almeno due prodotti da confrontare.' : undefined
          const locked = Boolean(reason)
          return (
            <li key={step.id} className={active ? 'is-active' : done ? 'is-done' : ''}>
              <button
                type="button"
                disabled={locked}
                title={reason ?? step.label}
                aria-label={`${step.short}: ${reason ?? step.label}`}
                onClick={() => onNavigate(step.id)}
                aria-current={active ? 'step' : undefined}
                aria-disabled={locked || undefined}
                data-testid={`stage-${step.id}`}
              >
                <span className="stage-progress__num">{done ? '✓' : String(i + 1).padStart(2, '0')}</span>
                <span className="stage-progress__label">{step.label}</span>
                <span className="stage-progress__short" aria-hidden="true">{step.short}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
