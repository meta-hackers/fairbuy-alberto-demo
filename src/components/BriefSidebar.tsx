import { useState } from 'react'
import type { Brief, LearnedPref, RequirementMode } from '../data/fixtures'

const gpuOptions = [
  { label: 'RTX 4070+', value: 4070 },
  { label: 'RTX 4070 SUPER+', value: 4070.5 },
  { label: 'RTX 4070 Ti+', value: 4070.7 },
]
const ramOptions = [16, 32, 64]
const resolutions = ['1080p', '1440p', '4K']
const games = ['Competitive FPS', 'AAA games', 'Sim racing', 'Co-op', 'Strategy']

interface Props {
  brief: Brief
  onChange: (brief: Brief) => void
  onRemoveLearned: (id: string) => void
}

function ModeToggle({ value, onChange, label }: { value: RequirementMode; onChange: (mode: RequirementMode) => void; label: string }) {
  return (
    <div className="mode-toggle" role="group" aria-label={`${label}: required or preferred`}>
      <button type="button" className={value === 'required' ? 'is-active' : ''} onClick={() => onChange('required')}>Required</button>
      <button type="button" className={value === 'preferred' ? 'is-active' : ''} onClick={() => onChange('preferred')}>Preferred</button>
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
    <aside className="brief-sidebar" aria-label="Shopping brief">
      <div className="panel-heading">
        <span className="panel-kicker">Your brief</span>
        <span className="soft-tag">editable</span>
      </div>
      <p className="brief-city">Zurich · coarse location; no address required</p>
      <section className="brief-section">
        <div className="brief-label-row"><h3>Budget in CHF</h3><span className="synthetic-badge">synthetic data</span></div>
        <div className="budget-grid">
          <label>Desired minimum
            <input type="number" min={600} max={5000} step={50} value={brief.budgetMin} onChange={(e) => setMin(Number(e.target.value))} data-testid="budget-min-input" />
          </label>
          <label>Strict maximum
            <input type="number" min={600} max={5000} step={50} value={brief.budgetMax} onChange={(e) => setMax(Number(e.target.value))} data-testid="budget-max-input" />
          </label>
        </div>
        <label className="range-label">Soft minimum
          <input type="range" min={600} max={4000} step={50} value={brief.budgetMin} onChange={(e) => setMin(Number(e.target.value))} aria-label="Desired minimum budget" />
        </label>
        <label className="range-label">Strict maximum
          <input type="range" min={600} max={4000} step={50} value={brief.budgetMax} onChange={(e) => setMax(Number(e.target.value))} aria-label="Strict maximum budget" />
        </label>
        <label className="checkline"><input type="checkbox" checked={brief.minHard} onChange={(e) => patch({ minHard: e.target.checked })} /> Make the minimum strict too</label>
        <p className="hint">The minimum does not exclude a product by itself; the maximum does. VAT included; peripherals {brief.includesPeripherals ? 'included' : 'excluded'}.</p>
      </section>
      <section className="brief-section">
        <h3>Use and peripherals</h3>
        <div className="chip-row" role="group" aria-label="Games">
          {games.map((game) => <button type="button" key={game} className={`chip ${brief.games.includes(game) ? 'is-active' : ''}`} aria-pressed={brief.games.includes(game)} onClick={() => toggleGame(game)}>{game}</button>)}
        </div>
        <div className="field-row">
          <label>Resolution
            <select value={brief.resolution} onChange={(e) => patch({ resolution: e.target.value })}>{resolutions.map((r) => <option key={r}>{r}</option>)}</select>
          </label>
          <label>Target FPS
            <input type="number" min={30} max={360} step={30} value={brief.targetFps} onChange={(e) => patch({ targetFps: Number(e.target.value) })} />
          </label>
        </div>
        <label className="checkline"><input type="checkbox" checked={brief.includesPeripherals} onChange={(e) => patch({ includesPeripherals: e.target.checked })} /> Budget includes peripherals</label>
      </section>
      <section className="brief-section">
        <div className="brief-label-row"><h3>GPU</h3><ModeToggle label="GPU" value={brief.gpu.mode} onChange={(mode) => patch({ gpu: { ...brief.gpu, mode } })} /></div>
        <label>Required threshold
          <select value={brief.gpu.value} onChange={(e) => patch({ gpu: { ...brief.gpu, value: Number(e.target.value) } })} data-testid="gpu-threshold">
            {gpuOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <p className="hint">{brief.gpu.mode === 'required' ? 'GPUs below the threshold are excluded.' : 'GPUs below the threshold remain visible as an amber trade-off.'}</p>
      </section>
      <section className="brief-section">
        <div className="brief-label-row"><h3>RAM</h3><ModeToggle label="RAM" value={brief.ram.mode} onChange={(mode) => patch({ ram: { ...brief.ram, mode } })} /></div>
        <label>Desired minimum
          <select value={brief.ram.value} onChange={(e) => patch({ ram: { ...brief.ram, value: Number(e.target.value) } })} data-testid="ram-threshold">
            {ramOptions.map((value) => <option key={value} value={value}>{value} GB</option>)}
          </select>
        </label>
      </section>
      <section className="brief-section">
        <h3>Avoid</h3>
        <div className="avoid-row">
          <label className="sr-only" htmlFor="avoid-gpu">GPU to avoid</label>
          <input id="avoid-gpu" value={avoidInput} onChange={(e) => setAvoidInput(e.target.value)} placeholder="e.g. RTX 4060 Ti" list="gpu-avoid-list" />
          <datalist id="gpu-avoid-list">{['RTX 4060', 'RTX 4060 Ti', 'RTX 4070', 'RTX 4080 SUPER'].map((gpu) => <option key={gpu} value={gpu} />)}</datalist>
          <button type="button" className="button button--small" onClick={addAvoid}>Add</button>
        </div>
        <div className="chip-row">
          {brief.avoidGpu.length === 0 ? <span className="muted small">No GPUs manually excluded.</span> : brief.avoidGpu.map((gpu) => (
            <button type="button" className="chip chip--avoid" key={gpu} onClick={() => patch({ avoidGpu: brief.avoidGpu.filter((item) => item !== gpu) })} aria-label={`Remove ${gpu} from the avoid list`}>{gpu} ×</button>
          ))}
        </div>
      </section>
      {brief.learned.length > 0 ? (
        <section className="brief-section learned-box">
          <div className="brief-label-row"><h3>Learned from feedback</h3><span className="soft-tag">reversible</span></div>
          <ul className="learned-list">
            {brief.learned.map((pref: LearnedPref) => <li key={pref.id}><span>{pref.label}</span><button type="button" onClick={() => onRemoveLearned(pref.id)} aria-label={`Remove preference: ${pref.label}`}>×</button></li>)}
          </ul>
          <p className="hint">A single exclusion does not create a mandatory rule.</p>
        </section>
      ) : null}
      {brief.notes ? <section className="brief-section"><h3>Feedback note</h3><p className="hint">{brief.notes}</p></section> : null}
    </aside>
  )
}
