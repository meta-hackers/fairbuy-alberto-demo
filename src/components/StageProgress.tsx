export type Stage = 'ask' | 'configure' | 'discover' | 'product'

const steps = [
  { id: 'ask', label: 'Richiesta', short: 'ASK' },
  { id: 'configure', label: 'Brief', short: 'CONFIGURE' },
  { id: 'discover', label: 'Scoperta', short: 'DISCOVER' },
  { id: 'learn', label: 'Apprendimento', short: 'LEARN' },
  { id: 'choose', label: 'Scelta esatta', short: 'CHOOSE' },
  { id: 'compare', label: 'Offerte', short: 'COMPARE' },
] as const

function currentIndex(stage: Stage): number {
  if (stage === 'ask') return 0
  if (stage === 'configure') return 1
  if (stage === 'discover') return 2
  return 4
}

interface Props {
  stage: Stage
  onNavigate: (stage: Stage) => void
}

export default function StageProgress({ stage, onNavigate }: Props) {
  const index = currentIndex(stage)
  return (
    <nav className="stage-progress" aria-label="Avanzamento del percorso guidato">
      <div className="stage-progress__track" aria-hidden="true">
        <span style={{ width: `${(index / (steps.length - 1)) * 100}%` }} />
      </div>
      <ol>
        {steps.map((step, i) => {
          const active = i === index || (stage === 'product' && i === 5)
          const done = i < index
          const target: Stage | null = step.id === 'ask' ? 'ask' : step.id === 'configure' ? 'configure' : step.id === 'discover' ? 'discover' : step.id === 'choose' ? 'product' : null
          return (
            <li key={step.id} className={active ? 'is-active' : done ? 'is-done' : ''}>
              {target ? (
                <button type="button" onClick={() => onNavigate(target)} aria-current={active ? 'step' : undefined}>
                  <span className="stage-progress__num">{done ? '✓' : String(i + 1).padStart(2, '0')}</span>
                  <span className="stage-progress__label">{step.label}</span>
                  <span className="stage-progress__short">{step.short}</span>
                </button>
              ) : (
                <span className="stage-progress__static" aria-current={active ? 'step' : undefined}>
                  <span className="stage-progress__num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="stage-progress__label">{step.label}</span>
                  <span className="stage-progress__short">{step.short}</span>
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
