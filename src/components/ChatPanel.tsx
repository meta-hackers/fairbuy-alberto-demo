import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { Brief } from '../data/fixtures'
import type { Stage } from './StageProgress'

export interface ChatMessage {
  id: string
  role: 'assistant' | 'user' | 'system'
  text: string
  simulated?: boolean
}

interface Props {
  stage: Stage
  messages: ChatMessage[]
  brief: Brief
  searchStatus: 'idle' | 'searching' | 'partial' | 'complete'
  discoveredCount: number
  totalCount: number
  onConfigure: () => void
  onSearch: () => void
  onGame: (game: string) => void
  onResolution: (resolution: string) => void
  onPeripherals: () => void
  onSendFreeText: (text: string) => void
}

const quickGames = ['FPS competitivi', 'Giochi AAA', 'Sim racing']
const quickRes = ['1080p', '1440p', '4K']

export default function ChatPanel(props: Props) {
  const { stage, messages, brief, searchStatus, discoveredCount, totalCount, onConfigure, onSearch, onGame, onResolution, onPeripherals, onSendFreeText } = props
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const draftIsEmpty = draft.trim().length === 0
  useEffect(() => {
    const log = logRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [messages, searchStatus, discoveredCount])
  const submitDraft = () => {
    const text = draft.trim()
    if (!text) return
    setDraft('')
    onSendFreeText(text)
    inputRef.current?.focus()
  }
  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submitDraft()
    }
  }

  return (
    <section className="chat-panel" aria-label="Assistente FairBuy simulato">
      <div className="chat-panel__header">
        <div><span className="logo-mark" aria-hidden="true">◇</span><strong>FairBuy Assistant</strong></div>
        <span className="soft-tag">scriptato · nessun modello AI</span>
      </div>
      <div className="chat-log" aria-live="polite" aria-relevant="additions" ref={logRef} data-testid="chat-log">
        {messages.map((message) => (
          <div className={`bubble bubble--${message.role}`} key={message.id} data-testid={`message-${message.role}`} data-simulated={message.simulated ? 'true' : undefined}>
            <span className="bubble__role">
              {message.role === 'user' ? 'Tu' : message.role === 'system' ? 'Sistema demo' : 'FairBuy'}
              {message.simulated ? <span className="bubble__sim">simulata · nessuna AI</span> : null}
            </span>
            <p>{message.text}</p>
          </div>
        ))}
        {searchStatus === 'searching' || searchStatus === 'partial' ? (
          <div className="bubble bubble--assistant">
            <span className="bubble__role">FairBuy</span>
            <p>{searchStatus === 'searching' ? 'Sto cercando tra fonti sintetiche…' : 'Aggiorno il confronto con i nuovi fixture…'}</p>
            <div className="progress-line"><span style={{ width: `${Math.min(100, (discoveredCount / Math.max(1, totalCount)) * 100)}%` }} /></div>
          </div>
        ) : null}
      </div>
      {stage === 'ask' ? (
        <div className="chat-actions">
          <div className="quick-block">
            <span className="quick-label">A cosa giochi?</span>
            <div className="chip-row">{quickGames.map((game) => <button type="button" key={game} className={`chip ${brief.games.includes(game) ? 'is-active' : ''}`} onClick={() => onGame(game)}>{game}</button>)}</div>
          </div>
          <div className="quick-block">
            <span className="quick-label">Risoluzione e FPS?</span>
            <div className="chip-row">{quickRes.map((res) => <button type="button" key={res} className={`chip ${brief.resolution === res ? 'is-active' : ''}`} onClick={() => onResolution(res)}>{res} · {res === '4K' ? '60' : res === '1440p' ? '120' : '144'} fps</button>)}</div>
          </div>
          <label className="checkline"><input type="checkbox" checked={brief.includesPeripherals} onChange={onPeripherals} /> Il budget include periferiche</label>
          <div className="composer">
            <label className="composer__label" htmlFor="ask-free-text">Scrivi la tua risposta</label>
            <textarea id="ask-free-text" className="composer__input" rows={2} value={draft} placeholder="Es. gioco soprattutto FPS a 1440p, budget massimo 1800 CHF" onChange={(event) => setDraft(event.target.value)} onKeyDown={handleComposerKeyDown} data-testid="ask-input" />
            <div className="chat-actions__row">
              <button type="button" className="button button--ghost button--small" onClick={submitDraft} disabled={draftIsEmpty} data-testid="ask-send">Invia</button>
              <span className="hint">Invio per spedire · Shift+Invio per andare a capo · risposte simulate, nessuna AI</span>
            </div>
          </div>
          <div className="chat-actions__row">
            <button type="button" className="button button--primary" onClick={onConfigure} data-testid="prepare-brief">Prepara il brief →</button>
          </div>
        </div>
      ) : null}
      {stage === 'configure' ? (
        <div className="chat-actions">
          <div className="brief-review">
            <span className="quick-label">Rivedi prima della ricerca</span>
            <p><strong>CHF {brief.budgetMin}–{brief.budgetMax}</strong> · {brief.resolution} · {brief.targetFps} fps · {brief.city}</p>
            <p>GPU RTX {brief.gpu.value}+ {brief.gpu.mode === 'required' ? 'obbligatoria' : 'preferita'} · RAM {brief.ram.value} GB {brief.ram.mode === 'required' ? 'obbligatoria' : 'preferita'}</p>
            <p className="hint">Massimo strict. Minimo soft. {brief.avoidGpu.length ? `Eviti: ${brief.avoidGpu.join(', ')}.` : 'Nessuna GPU da evitare.'}</p>
          </div>
          <button type="button" className="button button--primary" onClick={onSearch} data-testid="start-search">Cerca PC gaming →</button>
        </div>
      ) : null}
      {stage === 'discover' || stage === 'product' ? (
        <div className="chat-actions chat-actions--status">
          <span className={`status-pill status-pill--${searchStatus}`}>{searchStatus === 'complete' ? 'Ricerca completata' : searchStatus === 'partial' ? 'Risultati parziali' : 'Ricerca in corso'}</span>
          <span className="hint">{discoveredCount} prodotti visibili · dati sintetici, nessuna fonte reale</span>
        </div>
      ) : null}
    </section>
  )
}
