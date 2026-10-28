import { useEffect, useMemo, useState } from 'react'
import { RELAY_FEATURES, RELAY_FOLLOW_UP, RELAY_RESEARCH_NOTE, relayProducts } from '../data/relay'
import { createCustomCharacteristic, type Characteristic } from '../lib/flow'
import type { Feedback } from '../lib/feedback'
import { formatCHF } from '../lib/sellers'
import ChatPanel, { type ChatMessage } from './ChatPanel'
import CharacteristicsPanel from './CharacteristicsPanel'
import PriceRangeSlider from './PriceRangeSlider'
import StageProgress, { type Stage } from './StageProgress'
import FeedbackLog from './FeedbackLog'

export default function RelayFlow({ initialMessages, onRestart }: { initialMessages: string[]; onRestart: () => void }) {
  const [stage, setStage] = useState<Stage>('ask')
  const [messages, setMessages] = useState<ChatMessage[]>(() => initialMessages.flatMap((text, index) => [
    { id: `seed-user-${index}`, role: 'user' as const, text },
    { id: `seed-assistant-${index}`, role: 'assistant' as const, text: index === 0 ? RELAY_FOLLOW_UP : 'ok, I have enough information', simulated: true },
  ]))
  const [revealed, setRevealed] = useState(initialMessages.length >= 2)
  const [features, setFeatures] = useState<Characteristic[]>(initialMessages.length >= 2 ? RELAY_FEATURES : [])
  const [range, setRange] = useState({ min: 0, max: 150 })
  const [shown, setShown] = useState<string[]>([])
  const [started, setStarted] = useState(false)
  const [expanded, setExpanded] = useState<string[]>([])
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [dismiss, setDismiss] = useState<string | null>(null)
  const [reasons, setReasons] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [compare, setCompare] = useState<string[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const eligible = useMemo(() => relayProducts.filter((product) => product.mockTotal >= range.min && product.mockTotal <= range.max && !feedback.some((entry) => entry.active && entry.productId === product.id)), [range, feedback])
  const pending = eligible.find((product) => !shown.includes(product.id))
  useEffect(() => {
    if (stage !== 'discover' || !started || !pending) return
    const timer = window.setTimeout(() => setShown((current) => current.includes(pending.id) ? current : [...current, pending.id]), 2000)
    return () => window.clearTimeout(timer)
  }, [stage, started, pending, shown])
  useEffect(() => {
    if (!dismiss) return
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') closeDismiss() }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [dismiss])

  const navigate = (next: Stage) => {
    if (next !== 'ask' && !revealed) return
    if (next === 'product' && !selected || next === 'compare' && compare.length < 2) return
    if (next === 'discover') setStarted(true)
    setStage(next)
  }
  const restartResults = () => { setShown([]); setStarted(true); setStage('discover') }
  const editFeatures = (next: Characteristic[]) => { setFeatures(next); setShown([]) }
  const send = (text: string) => {
    const count = messages.filter((message) => message.role === 'user').length
    setMessages((current) => [...current, { id: `u-${current.length}`, role: 'user', text }, {
      id: `a-${current.length}`, role: 'assistant', simulated: true,
      text: count === 1 ? 'ok, I have enough information' : 'Scripted reply: relay category unchanged. The neon’s actual wattage is unknown; module capacity is not a measured load. Edit characteristics explicitly in Configure. No AI.',
    }])
    if (count === 1) { setRevealed(true); setFeatures(RELAY_FEATURES) }
  }
  const panel = <CharacteristicsPanel characteristics={features} onRemove={(id) => editFeatures(features.filter((feature) => feature.id !== id))} onAdd={(label) => editFeatures([...features, createCustomCharacteristic(label)])} />
  const slider = <PriceRangeSlider bounds={{ min: 0, max: 150 }} value={range} step={5} onChange={(next) => { setRange(next); setShown([]) }} />
  const toggle = (list: string[], id: string) => list.includes(id) ? list.filter((item) => item !== id) : [...list, id]
  const closeDismiss = () => {
    const id = dismiss
    setDismiss(null)
    window.setTimeout(() => document.querySelector<HTMLButtonElement>(`[data-testid="dismiss-${id}"]`)?.focus(), 0)
  }
  const apply = (skip = false) => {
    const product = relayProducts.find((item) => item.id === dismiss)!
    setFeedback((current) => [...current, { id: `feedback-${Date.now()}-${current.length}`, productId: product.id, productName: product.name, reasons: skip ? ['skip'] : reasons.length ? reasons : ['other'], note: skip ? '' : note.trim(), active: true, changes: [], clarification: 'Exclusion only: no filter or compatibility is changed automatically.' }])
    setCompare((current) => current.filter((id) => id !== product.id))
    setDismiss(null)
  }
  const active = relayProducts.find((product) => product.id === selected)

  return <div className="relay-shell" data-testid="relay-shell">
    <header className="topbar"><div><p className="eyebrow">FairBuy · synthetic demo · no AI</p><h1>Smart relay for neon light</h1></div><button className="button" data-testid="reset-demo" onClick={onRestart}>New search / Reset demo</button></header>
    <StageProgress stage={stage} canConfigure={revealed} canChoose={Boolean(selected)} canCompare={compare.length >= 2} onNavigate={navigate} />
    <main className="app-content">
      {revealed && (feedback.length > 0 || stage === 'learn') ? <FeedbackLog entries={feedback} onUndo={(id) => {
        const entry = feedback.find((item) => item.id === id)!
        setFeedback((current) => current.map((item) => item.id === id ? { ...item, active: false } : item))
        setShown((current) => current.filter((productId) => productId !== entry.productId))
      }} /> : null}
      {stage === 'ask' ? <div className="ask-layout"><ChatPanel messages={messages} revealed={revealed} characteristicCount={features.length} onSend={send} onConfigure={() => navigate('configure')} placeholder="Smart relay for a neon light, budget, Hue Bridge…" />{revealed ? <aside className="panel">{panel}</aside> : <aside className="panel" data-testid="ask-locked">No characteristics appear before your second message.</aside>}</div> : null}
      {stage === 'configure' ? <section className="panel" data-testid="configure-page"><h2>Configure · relay price and requirements</h2>{slider}{panel}<p className="info-banner">The neon’s actual wattage is UNKNOWN. The cited 200 W LED / 1.5 A rating is module capacity, not a measurement of the neon load. No-dimmer capability must be verified; the source is contradictory.</p><div className="configure-actions"><button className="button" data-testid="back-to-ask" onClick={() => navigate('ask')}>Back to ASK</button><button className="button button--primary" data-testid="start-discovery" onClick={restartResults}>Start discovery</button></div></section> : null}
      {stage === 'discover' ? <div className="discover-page" data-testid="discover-page"><section className="panel discover-filters">{slider}{panel}</section><section className="results">
        <h2>Research candidates · not certified</h2><p className="info-banner">{RELAY_RESEARCH_NOTE}</p>
        <p className="hint">Technical characteristics express your requirements; they are not verified product facts. Only the mock budget filters these candidates. Totals are synthetic (simulated shipping included), not confirmed real totals.</p>
        <span data-testid="search-status">{pending ? 'Searching...' : 'Discovery complete'}</span>
        {pending ? <p role="status" data-testid="searching-indicator">Searching... · one candidate every 2 seconds</p> : null}
        {!eligible.length ? <p data-testid="empty-state">No candidates match this budget or these exclusions. Change the budget or restore a product in LEARN.</p> : null}
        <div className="product-grid">{eligible.filter((product) => shown.includes(product.id)).map((product) => <article className="product-card" key={product.id} data-testid={`product-card-${product.id}`}>
          <button className="product-summary" data-testid={`expand-${product.id}`} aria-expanded={expanded.includes(product.id)} aria-controls={`relay-details-${product.id}`} onClick={() => setExpanded(toggle(expanded, product.id))}><span>{product.name}</span><strong>{formatCHF(product.mockTotal)} mock</strong><span aria-hidden="true">{expanded.includes(product.id) ? '−' : '+'}</span></button>
          <div className="product-details" id={`relay-details-${product.id}`} hidden={!expanded.includes(product.id)}>
            <p>{product.claim}</p><p className="hint">Mock total: {formatCHF(product.mockTotal)}. No confirmed real delivered total or live price.</p>
            <a href={product.url} target="_blank" rel="noreferrer">Reference source (not a live offer)</a>
            <div className="product-card__actions"><button className="button" data-testid={`dismiss-${product.id}`} onClick={() => { setDismiss(product.id); setReasons([]); setNote('') }}>Exclude with a reason</button><label><input type="checkbox" checked={compare.includes(product.id)} onChange={() => setCompare(toggle(compare, product.id))} /> Compare</label></div>
            <button className="button" aria-pressed={favorites.includes(product.id)} onClick={() => setFavorites(toggle(favorites, product.id))}>Favorite {favorites.includes(product.id) ? '♥' : '♡'}</button>
            <button className="button" onClick={() => { setSelected(product.id); setStage('product') }}>Details / references</button>
          </div>
        </article>)}</div>
        {!pending && eligible.length > 0 ? <p data-testid="search-complete">Discovery complete · {eligible.length} candidates. Requirements are not certified.</p> : null}
      </section></div> : null}
      {stage === 'learn' ? <button className="button" onClick={() => navigate('discover')}>Back to DISCOVER</button> : null}
      {stage === 'product' && active ? <section className="panel" data-testid="relay-reference"><h2>{active.name}</h2><p>{active.claim}</p><p>Mock total: {formatCHF(active.mockTotal)}. No confirmed real delivered price.</p><a href={active.url} target="_blank" rel="noreferrer">Product reference</a><p><a href="https://www.led-trading.de/mediafiles/anleitungen/Anleitung%209106.pdf" target="_blank" rel="noreferrer">LED Trading instructions (reference)</a></p><p><a href="https://iconnecthue.com/supported-devices/" target="_blank" rel="noreferrer">iConnectHue (reference)</a></p><p>{RELAY_RESEARCH_NOTE}</p><p>Product comparison only; no wiring instructions. Have the load, safety, and exact model checked by a qualified professional.</p><button className="button" onClick={() => navigate('discover')}>Back to DISCOVER</button></section> : null}
      {stage === 'compare' ? <section className="panel" data-testid="relay-compare"><h2>COMPARE · synthetic references</h2>{relayProducts.filter((product) => compare.includes(product.id)).map((product) => <article key={product.id}><h3>{product.name} · {formatCHF(product.mockTotal)} mock</h3><p>{product.claim}</p></article>)}<button className="button" onClick={() => navigate('discover')}>Back to DISCOVER</button></section> : null}
    </main>
    {dismiss ? <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="relay-dismiss-title" data-testid="dismiss-modal"><h2 id="relay-dismiss-title">Why exclude this relay?</h2><p>This exclusion is reversible. No hidden filters are added.</p><div className="reason-grid">{[['expensive', 'Too expensive'], ['compatibility', 'Compatibility to verify'], ['capacity', 'Load / capacity to verify'], ['other', 'Another reason']].map(([id, label]) => <button className="chip chip--reason" key={id} aria-pressed={reasons.includes(id)} onClick={() => setReasons(toggle(reasons, id))}>{label}</button>)}</div><label>Or add a note<textarea autoFocus rows={3} maxLength={280} value={note} onChange={(event) => setNote(event.target.value)} /></label><div className="modal__actions"><button className="button" onClick={closeDismiss}>Cancel</button><button className="button" data-testid="dismiss-skip" onClick={() => apply(true)}>Skip without a reason</button><button className="button button--primary" data-testid="dismiss-apply" disabled={!reasons.length && !note.trim()} onClick={() => apply()}>Apply feedback</button></div></section></div> : null}
  </div>
}
