import { useEffect, useMemo, useState } from 'react'
import { offers, products, type DismissReason } from './data/fixtures'
import { computeMatch, type Clarification } from './lib/matching'
import { clarifyFeatures, undoFeatureChanges, type Feedback } from './lib/feedback'
import { routeCategory } from './lib/category'
import { mockReply } from './lib/mockReplies'
import { offersForProduct } from './lib/sellers'
import { DEFAULT_CHARACTERISTICS, DEFAULT_PRICE_RANGE, PRODUCT_PRICE_BOUNDS, createCustomCharacteristic,
  deriveBrief, filterSignature, findDiscoveryMatches, setCharacteristicMode, type Characteristic } from './lib/flow'
import FeedbackLog from './components/FeedbackLog'
import DismissModal from './components/DismissModal'
import RelayFlow from './components/RelayFlow'
import ChatPanel, { type ChatMessage } from './components/ChatPanel'
import CharacteristicsPanel from './components/CharacteristicsPanel'
import PriceRangeSlider from './components/PriceRangeSlider'
import ProductCard from './components/ProductCard'
import SellerOffers from './components/SellerOffers'
import ShoppingShell from './components/ShoppingShell'
import type { Stage } from './components/StageProgress'

const FAVORITES_KEY = 'fairbuy-demo-favorites-v1'
function loadFavorites(): string[] {
  try { const value = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]'); return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [] } catch { return [] }
}
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`

export default function App() {
  const [relaySeed, setRelaySeed] = useState<string[] | null>(null)
  const [ambiguous, setAmbiguous] = useState(false)
  const [stage, setStage] = useState<Stage>('ask')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [features, setFeatures] = useState<Characteristic[]>([])
  const [ready, setReady] = useState(false)
  const [range, setRange] = useState(DEFAULT_PRICE_RANGE)
  const [shown, setShown] = useState<string[]>([])
  const [signature, setSignature] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string[]>([])
  const [favorites, setFavorites] = useState(loadFavorites)
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [dismiss, setDismiss] = useState<string | null>(null)
  const brief = useMemo(() => deriveBrief(features, range), [features, range])
  const result = useMemo(() => findDiscoveryMatches(products, offers, features, range), [features, range])
  const eligible = result.matches.filter((product) => !feedback.some((entry) => entry.active && entry.productId === product.id))
  const pending = eligible.find((product) => !shown.includes(product.id))
  const active = products.find((product) => product.id === selected)
  const currentSignature = filterSignature(features, range)

  useEffect(() => { localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)) }, [favorites])
  useEffect(() => {
    if (stage !== 'discover' || !pending) return
    const timer = window.setTimeout(() => setShown((ids) => ids.includes(pending.id) ? ids : [...ids, pending.id]), 2000)
    return () => window.clearTimeout(timer)
  }, [stage, pending?.id, shown])

  const navigate = (next: Stage) => {
    if (next !== 'ask' && !ready || next === 'buy' && !active) return
    if (next === 'discover' && signature !== currentSignature) { setShown([]); setSignature(currentSignature) }
    setStage(next)
  }
  const send = (text: string) => {
    const count = messages.filter((m) => m.role === 'user').length
    const user: ChatMessage = { id: uid(), role: 'user', text }
    if (!count && routeCategory(text) === 'relay') { setRelaySeed([text]); return }
    if (count === 1 && ambiguous && routeCategory(text) === 'relay') {
      setRelaySeed([messages[0].text, text]); return
    }
    let reply: string
    if (!count && routeCategory(text) === 'ambiguous') {
      setAmbiguous(true)
      reply = 'Do you mean a computer or a smart relay for a light, rather than a Nintendo or network switch?'
    } else if (!count) {
      reply = 'What will you use it for, what is your budget, and which requirements matter most?'
    } else if (count === 1) {
      reply = 'Your starting requirements are ready. Review and edit them in Configure.'
      setFeatures(DEFAULT_CHARACTERISTICS); setReady(true)
    } else reply = mockReply(text, brief).text
    setMessages((current) => [...current, user, { id: uid(), role: 'assistant', text: reply }])
  }
  const restart = () => {
    setRelaySeed(null); setAmbiguous(false); setStage('ask'); setMessages([]); setFeatures([]); setReady(false)
    setRange(DEFAULT_PRICE_RANGE); setShown([]); setSignature(''); setSelected(null); setExpanded([]); setFeedback([]); setDismiss(null)
  }
  const apply = (reasons: DismissReason[], clarification: Clarification, note: string) => {
    const product = products.find((item) => item.id === dismiss)!
    const { next, changes } = clarifyFeatures(features, reasons, clarification)
    setFeedback((current) => [...current, { id: uid(), productId: product.id, productName: product.name, reasons, note, active: true, changes,
      clarification: changes.length ? `Updated: ${changes.map((change) => change.after.label).join('; ')}.` : 'Requirements unchanged.' }])
    setFeatures(next); setDismiss(null)
    if (selected === product.id) setSelected(null)
    if (changes.length) { setShown([]); setSignature(filterSignature(next, range)) }
  }
  const undo = (id: string) => {
    const entry = feedback.find((item) => item.id === id)!
    const next = undoFeatureChanges(features, entry.changes)
    setFeatures(next); setFeedback((current) => current.map((item) => item.id === id ? { ...item, active: false } : item))
    setShown((ids) => ids.filter((productId) => productId !== entry.productId))
  }

  if (relaySeed) return <RelayFlow initialMessages={relaySeed} onRestart={restart} />
  return <ShoppingShell stage={stage} ready={ready} selected={Boolean(active)} favorites={favorites.length} onNavigate={navigate} onRestart={restart}>
    {stage === 'ask' ? <ChatPanel messages={messages} revealed={ready} characteristicCount={features.length} onSend={send} onConfigure={() => navigate('configure')} /> : null}
    {stage === 'configure' ? <section className="panel" data-testid="configure-page">
      <h2>Budget & requirements</h2>
      <PriceRangeSlider bounds={PRODUCT_PRICE_BOUNDS} value={range} onChange={setRange} />
      <CharacteristicsPanel characteristics={features} onRemove={(id) => setFeatures(features.filter((f) => f.id !== id))}
        onAdd={(label) => setFeatures([...features, createCustomCharacteristic(label)])}
        onMode={(id, mode) => setFeatures(features.map((f) => f.id === id ? setCharacteristicMode(f, mode) : f))} />
      <p className="hint">Required targets exclude products below the target. Preferred targets allow trade-offs.</p>
    </section> : null}
    {stage === 'discover' ? <section data-testid="discover-page">
      <div className="section-toolbar"><p role="status" data-testid="search-status">{pending ? 'Finding options…' : `${eligible.length} options found`}</p>
        <button type="button" className="text-button" onClick={() => navigate('configure')}>Edit in Configure</button></div>
      <p className="hint catalog-note">Prices are reference amounts. Check current availability and costs before buying.</p>
      {result.unsupported.length > 0 ? <p className="evidence-note">Some requirements cannot be verified against the available product information.</p> : null}
      <div className="product-grid">{eligible.filter((product) => shown.includes(product.id)).map((product) => <ProductCard key={product.id}
        product={product} offers={offersForProduct(offers, product.id)} match={computeMatch(product, brief, offersForProduct(offers, product.id))}
        favorite={favorites.includes(product.id)} onFavorite={() => setFavorites((ids) => ids.includes(product.id) ? ids.filter((id) => id !== product.id) : [...ids, product.id])}
        expanded={expanded.includes(product.id)} onToggle={() => setExpanded((ids) => ids.includes(product.id) ? ids.filter((id) => id !== product.id) : [...ids, product.id])}
        onDismiss={() => setDismiss(product.id)} onOpen={() => { setSelected(product.id); setStage('buy') }} />)}</div>
      {!eligible.length ? <div className="empty-state" data-testid="empty-state"><h2>No matching options</h2><p>Adjust your requirements in Configure, or restore an excluded product in Learn.</p></div> : null}
      {pending ? <p className="hint" data-testid="searching-indicator">Finding the next option…</p> : null}
      {feedback.some((entry) => entry.active) ? <button className="text-button" type="button" onClick={() => navigate('learn')}>Review excluded products in Learn</button> : null}
    </section> : null}
    {stage === 'learn' ? <><FeedbackLog entries={feedback} onUndo={undo} /><button type="button" className="text-button back-link" onClick={() => navigate('discover')}>← Back to Discover</button></> : null}
    {stage === 'buy' && active ? <SellerOffers product={active} offers={offersForProduct(offers, active.id)} onBack={() => navigate('discover')} /> : null}
    {dismiss ? <DismissModal key={dismiss} product={products.find((p) => p.id === dismiss)!} brief={brief}
      onClose={() => { const id = dismiss; setDismiss(null); document.querySelector<HTMLButtonElement>(`[data-testid="dismiss-${id}"]`)?.focus() }} onApply={apply} /> : null}
  </ShoppingShell>
}
