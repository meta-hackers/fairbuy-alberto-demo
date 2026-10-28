import { useEffect, useMemo, useState } from 'react'
import { RELAY_FEATURES, RELAY_FOLLOW_UP, relayFitsScenario, relayPrice, relayTotal, relayProducts } from '../data/relay'
import { createCustomCharacteristic } from '../lib/flow'
import type { Feedback } from '../lib/feedback'
import { formatCHF } from '../lib/sellers'
import ChatPanel, { type ChatMessage } from './ChatPanel'
import CharacteristicsPanel from './CharacteristicsPanel'
import PriceRangeSlider from './PriceRangeSlider'
import type { Stage } from './StageProgress'
import ShoppingShell from './ShoppingShell'
import FeedbackLog from './FeedbackLog'

const FAVORITES_KEY = 'fairbuy-relay-favorites-v1'
function loadFavorites(): string[] {
  try { const value = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]'); return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [] } catch { return [] }
}

export default function RelayFlow({ initialMessages, onRestart }: { initialMessages: string[]; onRestart: () => void }) {
  const [stage, setStage] = useState<Stage>('ask')
  const [messages, setMessages] = useState<ChatMessage[]>(() => initialMessages.flatMap((text, index) => [
    { id: `seed-user-${index}`, role: 'user' as const, text },
    { id: `seed-assistant-${index}`, role: 'assistant' as const, text: index === 0 ? RELAY_FOLLOW_UP : 'Review your starting requirements in Configure.' },
  ]))
  const [ready, setReady] = useState(initialMessages.length >= 2)
  const [features, setFeatures] = useState(initialMessages.length >= 2 ? RELAY_FEATURES : [])
  const [range, setRange] = useState({ min: 0, max: 150 })
  const [shown, setShown] = useState<string[]>([])
  const [signature, setSignature] = useState('')
  const [expanded, setExpanded] = useState<string[]>([])
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [dismiss, setDismiss] = useState<string | null>(null)
  const [reasons, setReasons] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [favorites, setFavorites] = useState(loadFavorites)
  const eligible = useMemo(() => relayProducts.filter((product) => {
    const price = relayPrice(product)
    return price !== null && price >= range.min && price <= range.max && relayFitsScenario(product) && !feedback.some((entry) => entry.active && entry.productId === product.id)
  }), [range, feedback])
  const pending = eligible.find((product) => !shown.includes(product.id))
  const active = relayProducts.find((product) => product.id === selected)
  const currentSignature = JSON.stringify([range, features])
  useEffect(() => { localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)) }, [favorites])
  useEffect(() => {
    if (stage !== 'discover' || !pending) return
    const timer = window.setTimeout(() => setShown((ids) => ids.includes(pending.id) ? ids : [...ids, pending.id]), 2000)
    return () => window.clearTimeout(timer)
  }, [stage, pending?.id, shown])
  useEffect(() => {
    if (!dismiss) return
    const first = document.querySelector<HTMLButtonElement>('[data-testid="relay-cancel"]')
    first?.focus()
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDismiss()
      if (event.key === 'Tab') {
        const controls = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="dismiss-modal"] button:not(:disabled), [data-testid="dismiss-modal"] textarea'))
        const target = event.shiftKey ? controls.at(-1) : controls[0]
        if (document.activeElement === (event.shiftKey ? controls[0] : controls.at(-1))) { event.preventDefault(); target?.focus() }
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [dismiss])
  const navigate = (next: Stage) => {
    if (next !== 'ask' && !ready || next === 'buy' && !active) return
    if (next === 'discover' && signature !== currentSignature) { setShown([]); setSignature(currentSignature) }
    setStage(next)
  }
  const send = (text: string) => {
    const count = messages.filter((m) => m.role === 'user').length
    setMessages((current) => [...current, { id: `u-${current.length}`, role: 'user', text }, {
      id: `a-${current.length}`, role: 'assistant',
      text: count === 1 ? 'Review your starting requirements in Configure.' : 'Your setup uses an 18 W neon light with Hue Bridge control and ON/OFF switching. Edit requirements in Configure; this message has not changed them.',
    }])
    if (count === 1) { setReady(true); setFeatures(RELAY_FEATURES) }
  }
  const toggle = (list: string[], id: string) => list.includes(id) ? list.filter((item) => item !== id) : [...list, id]
  const closeDismiss = () => {
    const id = dismiss; setDismiss(null)
    document.querySelector<HTMLButtonElement>(`[data-testid="dismiss-${id}"]`)?.focus()
  }
  const apply = (skip = false) => {
    const product = relayProducts.find((item) => item.id === dismiss)!
    setFeedback((current) => [...current, { id: `${Date.now()}-${current.length}`, productId: product.id, productName: product.name,
      reasons: skip ? ['skip'] : reasons.length ? reasons : ['other'], note: skip ? '' : note.trim(), active: true, changes: [], clarification: 'Requirements unchanged.' }])
    if (selected === product.id) setSelected(null)
    setDismiss(null)
  }

  return <ShoppingShell stage={stage} ready={ready} selected={Boolean(active)} favorites={favorites.length} onNavigate={navigate} onRestart={onRestart}>
    {stage === 'ask' ? <ChatPanel messages={messages} revealed={ready} characteristicCount={features.length} onSend={send} onConfigure={() => navigate('configure')} placeholder="Your light, bridge, and budget…" /> : null}
    {stage === 'configure' ? <section className="panel" data-testid="configure-page">
      <h2>Budget & requirements</h2>
      <PriceRangeSlider bounds={{ min: 0, max: 150 }} value={range} step={5} onChange={setRange} />
      <p className="hint">Budget includes the item, shipping, and fees.</p>
      <CharacteristicsPanel characteristics={features} onRemove={(id) => setFeatures(features.filter((f) => f.id !== id))} onAdd={(label) => setFeatures([...features, createCustomCharacteristic(label)])} />
      <p className="hint">18 W neon load · Hue Bridge · ON/OFF only. Each listed device supports this setup.</p>
    </section> : null}
    {stage === 'discover' ? <section data-testid="discover-page">
      <div className="section-toolbar"><p role="status" data-testid="search-status">{pending ? 'Finding options…' : `${eligible.length} options found`}</p><button type="button" className="text-button" onClick={() => navigate('configure')}>Edit in Configure</button></div>
      <div className="product-grid">{eligible.filter((p) => shown.includes(p.id)).map((product) => <article className="product-card" key={product.id} data-testid={`product-card-${product.id}`}>
        <button type="button" className="product-summary" data-testid={`expand-${product.id}`} aria-expanded={expanded.includes(product.id)} aria-controls={`relay-details-${product.id}`} onClick={() => setExpanded(toggle(expanded, product.id))}>
          <span>{product.name}</span><strong>{relayPrice(product) === null ? 'Price unknown' : formatCHF(relayPrice(product)!)}</strong><span aria-hidden="true">{expanded.includes(product.id) ? '−' : '+'}</span>
        </button>
        <div className="product-details" id={`relay-details-${product.id}`} hidden={!expanded.includes(product.id)}>
          <p>{product.claim}</p>
          <p className="hint">{product.voltageV} V AC · {product.dimensions} · {product.protection}</p>
          <div className="product-actions"><button type="button" className="button button--primary" data-testid={`buy-${product.id}`} onClick={() => { setSelected(product.id); setStage('buy') }}>Purchase options →</button>
            <button type="button" className="text-button" aria-pressed={favorites.includes(product.id)} data-testid={`favorite-${product.id}`} onClick={() => setFavorites(toggle(favorites, product.id))}>{favorites.includes(product.id) ? '♥ Saved' : '♡ Save'}</button>
            <button type="button" className="text-button" data-testid={`dismiss-${product.id}`} onClick={() => { setDismiss(product.id); setReasons([]); setNote('') }}>Not for me</button></div>
        </div>
      </article>)}</div>
      {!eligible.length ? <div className="empty-state" data-testid="empty-state"><h2>No matching options</h2><p>Adjust your budget in Configure, or restore a product in Learn.</p></div> : null}
      {pending ? <p className="hint" data-testid="searching-indicator">Finding the next option…</p> : null}
      {feedback.some((entry) => entry.active) ? <button type="button" className="text-button" onClick={() => navigate('learn')}>Review excluded products in Learn</button> : null}
    </section> : null}
    {stage === 'learn' ? <><FeedbackLog entries={feedback} onUndo={(id) => {
      const entry = feedback.find((item) => item.id === id)!
      setFeedback((current) => current.map((item) => item.id === id ? { ...item, active: false } : item))
      setShown((ids) => ids.filter((productId) => productId !== entry.productId))
    }} /><button type="button" className="text-button back-link" onClick={() => navigate('discover')}>← Back to Discover</button></> : null}
    {stage === 'buy' && active ? <section data-testid="buy-page">
      <button type="button" className="text-button back-link" onClick={() => navigate('discover')}>← Back to Discover</button>
      <div className="selected-product"><h2>{active.name}</h2><p>{active.claim}</p><p>{active.voltageV} V AC · {active.dimensions} · {active.protection} · ON/OFF only</p></div>
      <h3>Seller options</h3><p className="hint">Delivered totals shown · VAT included</p>
      <div className="offer-list">{[...active.offers].sort((a, b) => (relayTotal(a) ?? Infinity) - (relayTotal(b) ?? Infinity)).map((offer, index) => <article className="offer-row" key={offer.seller} data-testid={`relay-offer-${index}`}>
        <div className="offer-heading"><h3>{offer.seller}</h3><strong>{relayTotal(offer) === null ? 'Total unknown' : formatCHF(relayTotal(offer)!)}</strong></div><dl className="offer-facts">
          <dt>Seller</dt><dd>{offer.seller}</dd>
          <dt>Item</dt><dd>{offer.item === null ? 'Unknown' : formatCHF(offer.item)}</dd>
          <dt>Shipping</dt><dd>{offer.shipping === null ? 'Unknown' : formatCHF(offer.shipping)}</dd>
          <dt>Fees</dt><dd>{offer.fees === null ? 'Unknown' : formatCHF(offer.fees)}</dd>
          <dt>Delivered total</dt><dd>{relayTotal(offer) === null ? 'Unknown' : formatCHF(relayTotal(offer)!)}</dd>
          <dt>Availability</dt><dd>{offer.stock}</dd><dt>Delivery</dt><dd>{offer.deliveryDays}</dd>
          <dt>Terms</dt><dd>{offer.warrantyMonths}-month warranty · {offer.returnDays}-day returns</dd>
          <dt>Recorded</dt><dd>{offer.recorded}</dd>
        </dl>
      </article>)}</div>
      <p className="hint">Have a qualified professional handle installation and electrical safety.</p>
      <p className="hint">Purchase options are read-only. Checkout is not available here.</p>
    </section> : null}
    {dismiss ? <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="relay-dismiss-title" data-testid="dismiss-modal">
      <div className="modal__header"><h2 id="relay-dismiss-title">Why is it not a fit?</h2><button type="button" className="text-button" data-testid="relay-cancel" onClick={closeDismiss}>Cancel</button></div>
      <div className="reason-grid">{[['expensive', 'Too expensive'], ['compatibility', 'Compatibility to verify'], ['capacity', 'Load / capacity to verify'], ['other', 'Another reason']].map(([id, label]) => <button type="button" className="chip" key={id} aria-pressed={reasons.includes(id)} onClick={() => setReasons(toggle(reasons, id))}>{label}</button>)}</div>
      <label className="textarea-label">Or add a note<textarea rows={3} maxLength={280} value={note} onChange={(event) => setNote(event.target.value)} /></label>
      <div className="modal__actions"><button type="button" className="text-button" data-testid="dismiss-skip" onClick={() => apply(true)}>Skip without a reason</button><button type="button" className="button button--primary" data-testid="dismiss-apply" disabled={!reasons.length && !note.trim()} onClick={() => apply()}>Save feedback</button></div>
    </section></div> : null}
  </ShoppingShell>
}
