import { useEffect, useMemo, useState } from 'react'
import { relayTotal, relayProducts, type RelayProduct } from '../data/relay'
import type { Offer, Product } from '../data/fixtures'
import { TOP_K, createCustomCharacteristic, filterSignature, rankProducts, type Characteristic } from '../lib/flow'
import type { Feedback } from '../lib/feedback'
import { deriveFeedbackClarification, extractRequirements, preferencesFromFeedback } from '../lib/requirements'
import { demoOfferUrl, formatCHF, formatCHFRange } from '../lib/sellers'
import ChatPanel, { type ChatMessage } from './ChatPanel'
import CharacteristicsPanel from './CharacteristicsPanel'
import PriceRangeSlider from './PriceRangeSlider'
import type { Stage } from './StageProgress'
import ShoppingShell from './ShoppingShell'
import FeedbackLog from './FeedbackLog'
import { reasonLabels } from '../lib/feedback'
import DismissModal, { type FeedbackDraft } from './DismissModal'
import LoadingIndicator from './LoadingIndicator'

const RELAY_BOUNDS = { min: 0, max: 150 }
const RELAY_DEFAULT_RANGE = { min: 0, max: 150 }

const asScoringProduct = (product: RelayProduct): Product => ({
  id: product.id,
  name: product.name,
  config: { cpu: 'Relay', gpu: 'Relay', ramGB: product.capacityW, storageGB: 1, condition: 'New' },
  tagline: product.claim,
  features: [
    product.claim,
    product.dimensions,
    product.protection,
    `${product.voltageV} V AC`,
    product.hueCompatible ? 'Hue Bridge compatible' : '',
    product.onOffOnly ? 'ON/OFF only' : '',
    `Rated for ${product.capacityW} W`,
  ].filter(Boolean),
  maxResolution: '1080p',
  illustration: 'aura',
  pool: 'primary',
})

const asScoringOffer = (product: RelayProduct, offer: RelayProduct['offers'][number], index: number): Offer => ({
  id: `${product.id}-${index}`,
  productId: product.id,
  retailer: offer.seller as Offer['retailer'],
  seller: offer.seller,
  item: offer.item ?? 0,
  shipping: offer.item === null ? null : offer.shipping,
  fees: offer.fees,
  stock: offer.stock,
  deliveryDays: offer.deliveryDays,
  warrantyMonths: offer.warrantyMonths,
  returnDays: offer.returnDays,
  sourceTs: offer.recorded,
  confidence: 100,
})

const scoringOffers = relayProducts.flatMap((product) => product.offers.map((offer, index) => asScoringOffer(product, offer, index)))

function relayBudgetRange(max: number) {
  const ceiling = Math.max(5, Math.min(RELAY_BOUNDS.max, Math.round(max / 5) * 5))
  return { min: 0, max: ceiling }
}

function seedMessages(initialMessages: string[], features: Characteristic[], budget: number | null): ChatMessage[] {
  const users: ChatMessage[] = initialMessages.map((text, index) => ({ id: `seed-user-${index}`, role: 'user', text }))
  const pickups = features.map((feature) => feature.label)
  const budgetText = budget !== null ? ` I noted ${Math.round(budget)} CHF as a starting soft price preference.` : ''
  const reply = pickups.length
    ? `I picked up ${pickups.join('; ')}.${budgetText} Review and edit these in Configure. This is a synthetic demo with fictional relay products and offers.`
    : 'Tell me about your light, wiring, bridge or priorities. The available catalog is fictional; I will not assume compatibility or electrical details you have not provided.'
  return [...users, { id: 'seed-assistant-0', role: 'assistant', text: reply }]
}

export default function RelayFlow({ initialMessages, onRestart }: { initialMessages: string[]; onRestart: () => void }) {
  const start = useMemo(() => extractRequirements('relay', initialMessages.join(' ')), [initialMessages])
  const [stage, setStage] = useState<Stage>('ask')
  const [messages, setMessages] = useState<ChatMessage[]>(() => seedMessages(initialMessages, start.features, start.budgetMax))
  const [ready, setReady] = useState(start.features.length >= 2 || (start.features.length >= 1 && start.budgetMax !== null))
  const [features, setFeatures] = useState<Characteristic[]>(start.features)
  const [range, setRange] = useState(start.budgetMax !== null ? relayBudgetRange(start.budgetMax) : RELAY_DEFAULT_RANGE)
  const [shown, setShown] = useState<string[]>([])
  const [signature, setSignature] = useState('')
  const [expanded, setExpanded] = useState<string[]>([])
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [dismiss, setDismiss] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const activeDismissed = useMemo(() => new Set(feedback.filter((entry) => entry.active).map((entry) => entry.productId)), [feedback])
  const ranked = useMemo(() => rankProducts(relayProducts.map(asScoringProduct), scoringOffers, features, range), [features, range])
  const activeRanked = useMemo(() => ranked.filter((result) => !activeDismissed.has(result.product.id)), [ranked, activeDismissed])
  const dismissedRanked = useMemo(() => ranked.filter((result) => activeDismissed.has(result.product.id)), [ranked, activeDismissed])
  const top = useMemo(() => activeRanked.slice(0, TOP_K), [activeRanked])
  const shownRanked = top.filter((result) => shown.includes(result.product.id))
  const pending = top.find((result) => !shown.includes(result.product.id))
  const [updateNotice, setUpdateNotice] = useState<string | null>(null)
  const [highlighted, setHighlighted] = useState<string[]>([])
  const dismissedNoteFor = (productId: string): string | null => {
    const entry = feedback.find((item) => item.productId === productId && item.active)
    if (!entry) return null
    const reasonText = entry.reasons.length ? entry.reasons.map((reason) => reasonLabels[reason] ?? reason).join(', ') : 'your feedback'
    return `Dismissed: ${reasonText}${entry.note ? ` — ${entry.note}` : ''}`
  }
  const entryIdFor = (productId: string): string | null => feedback.find((item) => item.productId === productId && item.active)?.id ?? null
  const personalized = (result: { reasons: string[]; tradeoffs: string[]; unknown: string[] }): string => {
    const first = result.reasons[0] ?? result.tradeoffs[0] ?? result.unknown[0]
    if (first) return `I thought you would like this because ${first.charAt(0).toLowerCase()}${first.slice(1)}`
    return 'I thought you would like this because it is the closest available option in this synthetic demo catalog.'
  }
  const active = relayProducts.find((product) => product.id === selected)
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
    const userText = [...messages.filter((message) => message.role === 'user').map((message) => message.text), text].join(' ')
    const extracted = extractRequirements('relay', userText)
    const enough = extracted.features.length >= 2 || (extracted.features.length >= 1 && extracted.budgetMax !== null)
    if (extracted.budgetMax !== null) setRange(relayBudgetRange(extracted.budgetMax))
    setFeatures(extracted.features)
    setReady(enough)
    const pickups = extracted.features.map((feature) => feature.label)
    const reply = pickups.length
      ? `${enough ? 'I picked up' : 'I picked up'} ${pickups.join('; ')}.${extracted.budgetMax !== null ? ` I noted ${Math.round(extracted.budgetMax)} CHF as a starting soft price preference.` : ''} ${enough ? 'Review and edit these in Configure.' : 'Add one more detail so Configure is useful.'} This is a synthetic demo with fictional relay products and offers.`
      : 'I need a little more detail about the light, wiring, bridge or budget. This is a synthetic demo with fictional data.'
    setMessages((current) => [...current, { id: `u-${current.length}`, role: 'user', text }, { id: `a-${current.length}`, role: 'assistant', text: reply }])
  }

  const toggle = (list: string[], id: string) => list.includes(id) ? list.filter((item) => item !== id) : [...list, id]

  const apply = (draft: FeedbackDraft) => {
    if (!dismiss) return
    const product = relayProducts.find((item) => item.id === dismiss)
    if (!product) return
    const entryId = `${Date.now()}-${feedback.length}`
    const fallback = deriveFeedbackClarification('relay', draft.reasons, draft.note).text
    const clarification = draft.clarification || fallback || draft.note.trim()
    const existingLabels = new Set(features.map((feature) => feature.label.toLowerCase()))
    const learned = preferencesFromFeedback('relay', clarification)
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

  return <ShoppingShell stage={stage} ready={ready} selected={Boolean(active)} learning={Boolean(dismiss)} onNavigate={navigate} onRestart={onRestart}>
    {stage === 'ask' ? <ChatPanel messages={messages} revealed={ready} characteristicCount={features.length} onSend={send} onConfigure={() => navigate('configure')} placeholder="Your light, bridge, wiring and budget…" /> : null}

    {stage === 'configure' ? <section className="panel" data-testid="configure-page">
      <h2>Your requirements and price range</h2>
      <p className="hint configure-intro">These are the relay requirements inferred from your messages. Edit, remove or add any detail. Everything below is a soft preference used for ranking.</p>
      <PriceRangeSlider bounds={RELAY_BOUNDS} value={range} step={5} onChange={setRange} idPrefix="relay-price" />
      <p className="hint">Budget includes the item, shipping, and fees.</p>
      <CharacteristicsPanel characteristics={features} onRemove={(id) => setFeatures(features.filter((feature) => feature.id !== id))} onAdd={(label) => setFeatures([...features, createCustomCharacteristic(label)])} />
      <p className="hint" data-testid="soft-note">All requirements and the price range are soft preferences. No device is excluded for a mismatch; trade-offs stay visible in Discover.</p>
      <p className="hint">Compatibility and electrical details are only listed when you provided them. The fictional catalog does not certify real installation.</p>
      <div className="configure-cta">
        <button type="button" className="button button--primary" data-testid="configure-continue" onClick={() => navigate('discover')}>Find products →</button>
      </div>
    </section> : null}

    {stage === 'discover' ? <section data-testid="discover-page">
      <div className="section-toolbar"><p data-testid="search-status">{pending ? `Finding ranked options… ${shownRanked.length}/${top.length}` : `${top.length} ranked options found`}</p><button type="button" className="text-button" onClick={() => navigate('configure')}>Edit in Configure</button></div>
      <p className="hint catalog-note">Synthetic demo · fictional relay catalog · up to {TOP_K} ranked matches · price ranges use delivered totals (item, shipping and fees, VAT included) across the listed seller offers. Every requirement, including budget, is a soft preference.</p>
      {features.some((feature) => !feature.supported) ? <p className="evidence-note">Some requirements cannot be verified against the available product information. They are shown without affecting the score.</p> : null}
      {pending ? <LoadingIndicator mode={refreshing ? 'updating' : 'loading'} /> : null}
      {updateNotice ? <p className="update-banner" role="status" aria-live="polite" data-testid="matches-updated">{updateNotice}</p> : null}
      {feedback.length > 0 ? <FeedbackLog entries={feedback} onUndo={undo} /> : null}
      <div className="product-grid">{[...shownRanked, ...dismissedRanked].map((result) => {
        const product = relayProducts.find((item) => item.id === result.product.id)!
        const rangeText = result.offerRange ? formatCHFRange(result.offerRange[0], result.offerRange[1]) : 'Price unknown'
        const dismissedNote = dismissedNoteFor(product.id)
        const dismissed = Boolean(dismissedNote)
        return <article className={`product-card${dismissed ? ' product-card--dismissed' : ''}${highlighted.includes(product.id) ? ' product-card--updated' : ''}`} key={product.id} data-testid={`product-card-${product.id}`} data-score={result.score} data-dismissed={dismissed ? 'true' : 'false'}>
          <button type="button" className="product-summary" data-testid={`expand-${product.id}`} aria-expanded={expanded.includes(product.id)} aria-controls={`relay-details-${product.id}`} onClick={() => setExpanded(toggle(expanded, product.id))}>
            <span className="product-summary__heading">
              <span className="product-summary__name">{product.name}</span>
              <span className="match-score" data-testid={`match-${product.id}`} data-label={result.label}>{result.label} · {Number.isInteger(result.score) ? result.score : result.score.toFixed(1)}%</span>
            </span>
            <span className="product-summary__offer">
              <strong data-testid={`price-${product.id}`}>{rangeText}</strong>
              <span className="retailer-tags" data-testid={`retailers-${product.id}`} aria-label={`Retailers in this price range: ${result.retailers.join(', ')}`}>
                {result.retailers.map((retailer) => <span className="retailer-tag" key={retailer}>{retailer}</span>)}
              </span>
            </span>
            <span aria-hidden="true">{expanded.includes(product.id) ? '−' : '+'}</span>
          </button>
          <p className="personalized-reason" data-testid={`personalized-${product.id}`}>{personalized(result)}</p>
          {dismissed ? <p className="dismissed-note" data-testid={`dismissed-note-${product.id}`}>{dismissedNote}</p> : null}
          <div className="product-details" id={`relay-details-${product.id}`} hidden={!expanded.includes(product.id)}>
            <p>{product.claim}</p>
            <p className="hint">{product.voltageV} V AC · {product.dimensions} · {product.protection} · ON/OFF only</p>
            <div className="match-explanation">
              <h3>Why this is ranked here</h3>
              <ul className="reason-list" data-testid={`reasons-${product.id}`}>
                {result.reasons.length ? result.reasons.map((reason) => <li key={reason}>{reason}</li>) : <li>No specific preference is matched yet; the score reflects the price range only.</li>}
              </ul>
              {result.tradeoffs.length ? <>
                <h3>Trade-offs</h3>
                <ul className="reason-list reason-list--tradeoff" data-testid={`tradeoffs-${product.id}`}>{result.tradeoffs.map((tradeoff) => <li key={tradeoff}>{tradeoff}</li>)}</ul>
              </> : null}
              {result.unknown.length ? <p className="evidence-note" data-testid={`unknown-${product.id}`}>{result.unknown.join(' ')}</p> : null}
            </div>
            <p className="hint">Scores express preference adherence, not electrical certification. Price ranges use delivered totals (item, shipping and fees, VAT included) across the listed seller offers.</p>
            <div className="product-actions">{dismissed
              ? <button type="button" className="button" data-testid={`restore-${product.id}`} onClick={() => { const entryId = entryIdFor(product.id); if (entryId) undo(entryId) }}>Restore</button>
              : <><button type="button" className="button button--primary" data-testid={`buy-${product.id}`} onClick={() => { setSelected(product.id); setStage('buy') }}>Purchase options →</button>
              <button type="button" className="text-button" data-testid={`dismiss-${product.id}`} onClick={() => setDismiss(product.id)}>Not for me</button></>}</div>
          </div>
        </article>
      })}</div>
      {!top.length && !dismissedRanked.length ? <div className="empty-state" data-testid="empty-state"><h2>No options in this demo catalog</h2><p>Undo feedback or adjust preferences in Configure. Nothing is excluded by a soft preference alone.</p></div> : null}
    </section> : null}

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
        <a className="offer-link" data-testid={`relay-offer-link-${index}`} href={demoOfferUrl(offer.seller, active.id)} target="_blank" rel="noopener noreferrer">View at {offer.seller} (synthetic demo link) →</a>
      </article>)}</div>
      <p className="hint">Have a qualified professional handle installation and electrical safety.</p>
      <p className="hint">Purchase options are read-only. Checkout is not available here.</p>
    </section> : null}

    {dismiss ? <DismissModal key={dismiss} productName={relayProducts.find((product) => product.id === dismiss)?.name ?? 'This relay'} category="relay"
      onClose={() => { const id = dismiss; setDismiss(null); document.querySelector<HTMLButtonElement>(`[data-testid="dismiss-${id}"]`)?.focus() }} onApply={apply} /> : null}
  </ShoppingShell>
}
