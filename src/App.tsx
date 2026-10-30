import { useEffect, useMemo, useState } from 'react'
import { offers, products } from './data/fixtures'
import type { Feedback } from './lib/feedback'
import { routeCategory } from './lib/category'
import { offersForProduct } from './lib/sellers'
import {
  DEFAULT_PRICE_RANGE,
  PRODUCT_PRICE_BOUNDS,
  TOP_K,
  createCustomCharacteristic,
  filterSignature,
  rankProducts,
  setCharacteristicMode,
  type Characteristic,
} from './lib/flow'
import {
  deriveFeedbackClarification,
  extractRequirements,
  preferencesFromFeedback,
} from './lib/requirements'
import FeedbackLog from './components/FeedbackLog'
import { reasonLabels } from './lib/feedback'
import DismissModal, { type FeedbackDraft } from './components/DismissModal'
import RelayFlow from './components/RelayFlow'
import ChatPanel, { type ChatMessage } from './components/ChatPanel'
import CharacteristicsPanel from './components/CharacteristicsPanel'
import LoadingIndicator from './components/LoadingIndicator'
import PriceRangeSlider from './components/PriceRangeSlider'
import ProductCard from './components/ProductCard'
import SellerOffers from './components/SellerOffers'
import ShoppingShell from './components/ShoppingShell'
import type { Stage } from './components/StageProgress'

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`

function budgetRangeFor(max: number) {
  const ceiling = Math.max(PRODUCT_PRICE_BOUNDS.min, Math.min(PRODUCT_PRICE_BOUNDS.max, Math.round(max)))
  return { min: Math.min(DEFAULT_PRICE_RANGE.min, ceiling), max: ceiling }
}

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
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [dismiss, setDismiss] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const activeDismissed = useMemo(() => new Set(feedback.filter((entry) => entry.active).map((entry) => entry.productId)), [feedback])
  const ranked = useMemo(() => rankProducts(products, offers, features, range), [features, range])
  const activeRanked = useMemo(() => ranked.filter((result) => !activeDismissed.has(result.product.id)), [ranked, activeDismissed])
  const dismissedRanked = useMemo(() => ranked.filter((result) => activeDismissed.has(result.product.id)), [ranked, activeDismissed])
  const top = useMemo(() => activeRanked.slice(0, TOP_K), [activeRanked])
  const shownRanked = top.filter((result) => shown.includes(result.product.id))
  const pending = top.find((result) => !shown.includes(result.product.id))
  const [updateNotice, setUpdateNotice] = useState<string | null>(null)
  const [highlighted, setHighlighted] = useState<string[]>([])
  const entryByProduct = useMemo(() => {
    const map = new Map<string, string>()
    for (const entry of feedback) if (entry.active && !map.has(entry.productId)) map.set(entry.productId, entry.id)
    return map
  }, [feedback])
  const dismissedNoteFor = (productId: string): string | null => {
    const entry = feedback.find((item) => item.productId === productId && item.active)
    if (!entry) return null
    const reasonText = entry.reasons.length ? entry.reasons.map((reason) => reasonLabels[reason] ?? reason).join(', ') : 'your feedback'
    return `Dismissed: ${reasonText}${entry.note ? ` — ${entry.note}` : ''}`
  }
  const active = products.find((product) => product.id === selected)
  const currentSignature = filterSignature(features, range)

  useEffect(() => {
    if (stage !== 'discover' || !pending) return
    const timer = window.setTimeout(() => setShown((ids) => ids.includes(pending.product.id) ? ids : [...ids, pending.product.id]), 2000)
    return () => window.clearTimeout(timer)
  }, [stage, pending?.product.id, shown])

  useEffect(() => {
    if (stage === 'discover' && !pending) setRefreshing(false)
  }, [stage, pending])

  const navigate = (next: Stage) => {
    if (next !== 'ask' && !ready || next === 'buy' && !active) return
    if (next === 'discover' && signature !== currentSignature) { setShown([]); setSignature(currentSignature); setRefreshing(false); setUpdateNotice(null); setHighlighted([]) }
    setStage(next)
  }

  const send = (text: string) => {
    const count = messages.filter((message) => message.role === 'user').length
    const user: ChatMessage = { id: uid(), role: 'user', text }

    if (!count && routeCategory(text) === 'relay') { setRelaySeed([text]); return }
    if (count === 1 && ambiguous && routeCategory(text) === 'relay') {
      setRelaySeed([messages[0].text, text]); return
    }
    if (count === 1 && ambiguous) setAmbiguous(false)

    let reply: string
    const ambiguousNow = !count && routeCategory(text) === 'ambiguous'
    if (ambiguousNow) {
      setAmbiguous(true)
      reply = 'Do you mean a computer or a smart relay for a light, rather than a Nintendo or network switch?'
    } else {
      const userText = [...messages.filter((message) => message.role === 'user').map((message) => message.text), text].join(' ')
      const extracted = extractRequirements('pc', userText)
      if (extracted.budgetMax !== null) setRange(budgetRangeFor(extracted.budgetMax))
      setFeatures(extracted.features)
      const enough = extracted.features.length >= 2 || (extracted.features.length >= 1 && extracted.budgetMax !== null)
      setReady(enough)
      const pickups = extracted.features.map((feature) => feature.label)
      if (pickups.length === 0) {
        reply = 'I need a little more detail to infer a useful requirement. What will you use it for, or what feature matters most? Budget can be reviewed in Configure. This is a synthetic demo with fictional catalog data.'
      } else if (!enough) {
        reply = `I picked up ${pickups.join('; ')}. Add one more useful detail — such as a budget, resolution, memory target or feature — and I’ll open Configure.`
      } else {
        const budget = extracted.budgetMax !== null ? ` I noted ${Math.round(extracted.budgetMax)} CHF as a starting soft price preference.` : ''
        reply = `I picked up ${pickups.join('; ')}.${budget} Review and edit these in Configure. This is a synthetic demo with fictional catalog data.`
      }
    }
    setMessages((current) => [...current, user, { id: uid(), role: 'assistant', text: reply }])
  }

  const restart = () => {
    setRelaySeed(null); setAmbiguous(false); setStage('ask'); setMessages([]); setFeatures([]); setReady(false)
    setRange(DEFAULT_PRICE_RANGE); setShown([]); setSignature(''); setSelected(null); setExpanded([]); setFeedback([]); setDismiss(null); setRefreshing(false); setUpdateNotice(null); setHighlighted([])
  }

  const apply = (draft: FeedbackDraft) => {
    if (!dismiss) return
    const product = products.find((item) => item.id === dismiss)
    if (!product) return
    const entryId = uid()
    const fallback = deriveFeedbackClarification('pc', draft.reasons, draft.note).text
    const clarification = draft.clarification || fallback || draft.note.trim()
    const existingLabels = new Set(features.map((feature) => feature.label.toLowerCase()))
    const learned = preferencesFromFeedback('pc', clarification)
      .filter((feature) => !existingLabels.has(feature.label.toLowerCase()))
      .map((feature, index) => ({ ...feature, id: `feedback-${entryId}-${index}` }))
    const nextFeatures = [...features, ...learned]
    setFeatures(nextFeatures)
    setFeedback((current) => [...current, {
      id: entryId, productId: product.id, productName: product.name, reasons: draft.reasons, note: draft.note,
      active: true, changes: [], clarification: clarification || 'No new preference; product kept at the bottom of the discovery list.',
      preferenceIds: learned.map((feature) => feature.id),
    }])
    if (selected === product.id) setSelected(null)
    setDismiss(null)
    setShown([])
    setSignature(filterSignature(nextFeatures, range))
    setRefreshing(true)
    setUpdateNotice(`Matches updated: ${clarification || 'preference updated'} — scores recomputed for the visible list.`)
    setHighlighted(ranked.map((result) => result.product.id))
  }

  const undo = (id: string) => {
    const entry = feedback.find((item) => item.id === id)
    if (!entry) return
    const remove = new Set(entry.preferenceIds ?? [])
    const nextFeatures = features.filter((feature) => !remove.has(feature.id))
    setFeatures(nextFeatures)
    setFeedback((current) => current.map((item) => item.id === id ? { ...item, active: false } : item))
    setShown([])
    setSignature(filterSignature(nextFeatures, range))
    setRefreshing(true)
    setUpdateNotice('Matches updated: feedback restored — scores recomputed for the visible list.')
    setHighlighted(ranked.map((result) => result.product.id))
  }

  if (relaySeed) return <RelayFlow initialMessages={relaySeed} onRestart={restart} />

  return <ShoppingShell stage={stage} ready={ready} selected={Boolean(active)} learning={Boolean(dismiss)} onNavigate={navigate} onRestart={restart}>
    {stage === 'ask' ? <ChatPanel messages={messages} revealed={ready} characteristicCount={features.length} onSend={send} onConfigure={() => navigate('configure')} /> : null}

    {stage === 'configure' ? <section className="panel" data-testid="configure-page">
      <h2>Your requirements and price range</h2>
      <p className="hint configure-intro">These are the requirements inferred from your messages. Edit, remove or add any detail. Everything below is a soft preference used for ranking.</p>
      <PriceRangeSlider bounds={PRODUCT_PRICE_BOUNDS} value={range} onChange={setRange} />
      <CharacteristicsPanel characteristics={features} onRemove={(id) => setFeatures(features.filter((feature) => feature.id !== id))}
        onAdd={(label) => setFeatures([...features, createCustomCharacteristic(label)])}
        onMode={(id, mode) => setFeatures(features.map((feature) => feature.id === id ? setCharacteristicMode(feature, mode) : feature))} />
      <p className="hint" data-testid="soft-note">All requirements and the price range are soft preferences. High priority changes ranking emphasis; no product is excluded for a mismatch.</p>
      <div className="configure-cta">
        <button type="button" className="button button--primary" data-testid="configure-continue" onClick={() => navigate('discover')}>Find products →</button>
      </div>
    </section> : null}

    {stage === 'discover' ? <section data-testid="discover-page">
      <div className="section-toolbar"><p data-testid="search-status">{pending ? `Finding ranked options… ${shownRanked.length}/${top.length}` : `${top.length} ranked options found`}</p>
        <button type="button" className="text-button" onClick={() => navigate('configure')}>Edit in Configure</button></div>
      <p className="hint catalog-note">Synthetic demo · fictional catalog · up to {TOP_K} ranked matches · price ranges use delivered totals (item, shipping and fees, VAT included) across the listed retailer offers. Every requirement, including budget, is a soft preference.</p>
      {features.some((feature) => !feature.supported) ? <p className="evidence-note">Some requirements cannot be verified against the available product information. They are shown without affecting the score.</p> : null}
      {pending ? <LoadingIndicator mode={refreshing ? 'updating' : 'loading'} /> : null}
      {updateNotice ? <p className="update-banner" role="status" aria-live="polite" data-testid="matches-updated">{updateNotice}</p> : null}
      {feedback.length > 0 ? <FeedbackLog entries={feedback} onUndo={undo} /> : null}
      <div className="product-grid">{shownRanked.map((result) => <ProductCard key={result.product.id}
        ranked={result}
        expanded={expanded.includes(result.product.id)} onToggle={() => setExpanded((ids) => ids.includes(result.product.id) ? ids.filter((id) => id !== result.product.id) : [...ids, result.product.id])}
        onDismiss={() => setDismiss(result.product.id)} onOpen={() => { setSelected(result.product.id); setStage('buy') }}
        highlighted={highlighted.includes(result.product.id)} />)}
        {dismissedRanked.map((result) => <ProductCard key={`dismissed-${result.product.id}`}
          ranked={result}
          expanded={expanded.includes(result.product.id)} onToggle={() => setExpanded((ids) => ids.includes(result.product.id) ? ids.filter((id) => id !== result.product.id) : [...ids, result.product.id])}
          onDismiss={() => setDismiss(result.product.id)} onOpen={() => { setSelected(result.product.id); setStage('buy') }}
          dismissedNote={dismissedNoteFor(result.product.id)} onRestore={() => { const entryId = entryByProduct.get(result.product.id); if (entryId) undo(entryId) }}
          highlighted={highlighted.includes(result.product.id)} />)}</div>
      {!top.length && !dismissedRanked.length ? <div className="empty-state" data-testid="empty-state"><h2>No options in this demo catalog</h2><p>Undo feedback or adjust your preferences in Configure. Nothing is excluded by a soft preference alone.</p></div> : null}
    </section> : null}

    {stage === 'buy' && active ? <SellerOffers product={active} offers={offersForProduct(offers, active.id)} onBack={() => navigate('discover')} /> : null}
    {dismiss ? <DismissModal key={dismiss} productName={products.find((product) => product.id === dismiss)?.name ?? 'This product'} category="pc"
      onClose={() => { const id = dismiss; setDismiss(null); document.querySelector<HTMLButtonElement>(`[data-testid="dismiss-${id}"]`)?.focus() }} onApply={apply} /> : null}
  </ShoppingShell>
}
