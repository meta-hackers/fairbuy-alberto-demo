import { useState } from 'react'
import type { Brief, LearnedPref, RequirementMode } from '../data/fixtures'

const gpuOptions = [
  { label: 'RTX 4070+', value: 4070 },
  { label: 'RTX 4070 SUPER+', value: 4070.5 },
  { label: 'RTX 4070 Ti+', value: 4070.7 },
]
const ramOptions = [16, 32, 64]
const resolutions = ['1080p', '1440p', '4K']
const games = ['FPS competitivi', 'Giochi AAA', 'Sim racing', 'Co-op', 'Strategia']

interface Props {
  brief: Brief
  onChange: (brief: Brief) => void
  onRemoveLearned: (id: string) => void
}

function ModeToggle({ value, onChange, label }: { value: RequirementMode; onChange: (mode: RequirementMode) => void; label: string }) {
  return (
    <div className="mode-toggle" role="group" aria-label={`${label}: obbligatorio o preferito`}>
      <button type="button" className={value === 'required' ? 'is-active' : ''} onClick={() => onChange('required')}>Obbligatorio</button>
      <button type="button" className={value === 'preferred' ? 'is-active' : ''} onClick={() => onChange('preferred')}>Preferito</button>
    </div>
  )
}

export default function BriefSidebar({ brief, onChange, onRemoveLearned }: Props) {
  const [avoidInput, setAvoidInput] = useState('')
  const patch = (part: Partial<Brief>) => onChange({ ...brief, ...part })
  const setMin = (raw: number) => patch({ budgetMin: Math.min(Math.max(raw || 0, 600), brief.budgetMax) })
  const setMax = (raw: number) => patch({ budgetMax: Math.max(Math.min(raw || 0, 5000), brief.budgetMin) })
  const toggleGame = (game: string) => patch({ games: brief.games.includes(game) ? brief.games.filter((g) => g !== game) : [...brief.games, game] })
  const addAvoid = () => {
    const value = avoidInput.trim()
    if (!value) return
    if (!brief.avoidGpu.includes(value)) patch({ avoidGpu: [...brief.avoidGpu, value] })
    setAvoidInput('')
  }
  return (
    <aside className="brief-sidebar" aria-label="Brief acquisti">
      <div className="panel-heading">
        <span className="panel-kicker">Il tuo brief</span>
        <span className="soft-tag">modificabile</span>
      </div>
      <p className="brief-city">Zurigo · posizione coarse, nessun indirizzo richiesto</p>
      <section className="brief-section">
        <div className="brief-label-row"><h3>Budget in CHF</h3><span className="synthetic-badge">dati sintetici</span></div>
        <div className="budget-grid">
          <label>Minimo desiderato
            <input type="number" min={600} max={5000} step={50} value={brief.budgetMin} onChange={(e) => setMin(Number(e.target.value))} data-testid="budget-min-input" />
          </label>
          <label>Massimo rigoroso
            <input type="number" min={600} max={5000} step={50} value={brief.budgetMax} onChange={(e) => setMax(Number(e.target.value))} data-testid="budget-max-input" />
          </label>
        </div>
        <label className="range-label">Minimo soft
          <input type="range" min={600} max={4000} step={50} value={brief.budgetMin} onChange={(e) => setMin(Number(e.target.value))} aria-label="Budget minimo desiderato" />
        </label>
        <label className="range-label">Massimo strict
          <input type="range" min={600} max={4000} step={50} value={brief.budgetMax} onChange={(e) => setMax(Number(e.target.value))} aria-label="Budget massimo rigoroso" />
        </label>
        <label className="checkline"><input type="checkbox" checked={brief.minHard} onChange={(e) => patch({ minHard: e.target.checked })} /> Rendi rigido anche il minimo</label>
        <p className="hint">Il minimo non esclude da solo un prodotto; il massimo sì. IVA inclusa, periferiche {brief.includesPeripherals ? 'incluse' : 'escluse'}.</p>
      </section>
      <section className="brief-section">
        <h3>Uso e periferiche</h3>
        <div className="chip-row" role="group" aria-label="Giochi">
          {games.map((game) => <button type="button" key={game} className={`chip ${brief.games.includes(game) ? 'is-active' : ''}`} aria-pressed={brief.games.includes(game)} onClick={() => toggleGame(game)}>{game}</button>)}
        </div>
        <div className="field-row">
          <label>Risoluzione
            <select value={brief.resolution} onChange={(e) => patch({ resolution: e.target.value })}>{resolutions.map((r) => <option key={r}>{r}</option>)}</select>
          </label>
          <label>FPS target
            <input type="number" min={30} max={360} step={30} value={brief.targetFps} onChange={(e) => patch({ targetFps: Number(e.target.value) })} />
          </label>
        </div>
        <label className="checkline"><input type="checkbox" checked={brief.includesPeripherals} onChange={(e) => patch({ includesPeripherals: e.target.checked })} /> Il budget include periferiche</label>
      </section>
      <section className="brief-section">
        <div className="brief-label-row"><h3>GPU</h3><ModeToggle label="GPU" value={brief.gpu.mode} onChange={(mode) => patch({ gpu: { ...brief.gpu, mode } })} /></div>
        <label>Soglia richiesta
          <select value={brief.gpu.value} onChange={(e) => patch({ gpu: { ...brief.gpu, value: Number(e.target.value) } })} data-testid="gpu-threshold">
            {gpuOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <p className="hint">{brief.gpu.mode === 'required' ? 'Le GPU sotto soglia finiscono tra le escluse.' : 'Le GPU sotto soglia restano visibili come compromesso ambra.'}</p>
      </section>
      <section className="brief-section">
        <div className="brief-label-row"><h3>RAM</h3><ModeToggle label="RAM" value={brief.ram.mode} onChange={(mode) => patch({ ram: { ...brief.ram, mode } })} /></div>
        <label>Minimo desiderato
          <select value={brief.ram.value} onChange={(e) => patch({ ram: { ...brief.ram, value: Number(e.target.value) } })} data-testid="ram-threshold">
            {ramOptions.map((value) => <option key={value} value={value}>{value} GB</option>)}
          </select>
        </label>
      </section>
      <section className="brief-section">
        <h3>Da evitare</h3>
        <div className="avoid-row">
          <label className="sr-only" htmlFor="avoid-gpu">GPU da evitare</label>
          <input id="avoid-gpu" value={avoidInput} onChange={(e) => setAvoidInput(e.target.value)} placeholder="Es. RTX 4060 Ti" list="gpu-avoid-list" />
          <datalist id="gpu-avoid-list">{['RTX 4060', 'RTX 4060 Ti', 'RTX 4070', 'RTX 4080 SUPER'].map((gpu) => <option key={gpu} value={gpu} />)}</datalist>
          <button type="button" className="button button--small" onClick={addAvoid}>Aggiungi</button>
        </div>
        <div className="chip-row">
          {brief.avoidGpu.length === 0 ? <span className="muted small">Nessuna GPU esclusa manualmente.</span> : brief.avoidGpu.map((gpu) => (
            <button type="button" className="chip chip--avoid" key={gpu} onClick={() => patch({ avoidGpu: brief.avoidGpu.filter((item) => item !== gpu) })} aria-label={`Rimuovi ${gpu} dalla lista da evitare`}>{gpu} ×</button>
          ))}
        </div>
      </section>
      {brief.learned.length > 0 ? (
        <section className="brief-section learned-box">
          <div className="brief-label-row"><h3>Appreso dal feedback</h3><span className="soft-tag">reversibile</span></div>
          <ul className="learned-list">
            {brief.learned.map((pref: LearnedPref) => <li key={pref.id}><span>{pref.label}</span><button type="button" onClick={() => onRemoveLearned(pref.id)} aria-label={`Rimuovi preferenza ${pref.label}`}>×</button></li>)}
          </ul>
          <p className="hint">Nessuna regola obbligatoria viene dedotta da un singolo rifiuto.</p>
        </section>
      ) : null}
      {brief.notes ? <section className="brief-section"><h3>Nota dal feedback</h3><p className="hint">{brief.notes}</p></section> : null}
    </aside>
  )
}
