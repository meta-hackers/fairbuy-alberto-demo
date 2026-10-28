import { useEffect, useMemo, useState } from 'react'
import { offers as allOffers, products, type Product, type DismissReason } from './data/fixtures'
import { computeMatch, type Clarification } from './lib/matching'
import { clarifyFeatures, undoFeatureChanges, type Feedback } from './lib/feedback'
import { routeCategory } from './lib/category'
import FeedbackLog from './components/FeedbackLog'
import DismissModal from './components/DismissModal'
import RelayFlow from './components/RelayFlow'
import { mockReply } from './lib/mockReplies'
import { formatCHF, offersForProduct } from './lib/sellers'
import {
  DEFAULT_CHARACTERISTICS,
  DEFAULT_PRICE_RANGE,
  PRODUCT_PRICE_BOUNDS,
  createCustomCharacteristic,
  deriveBrief,
  filterSignature,
  findDiscoveryMatches,
  type Characteristic,
  type PriceBounds,
} from './lib/flow'
import ChatPanel, { type ChatMessage } from './components/ChatPanel'
import CharacteristicsPanel from './components/CharacteristicsPanel'
import PriceRangeSlider from './components/PriceRangeSlider'
import { CompareTray, CompareModal } from './components/CompareTray'
import ProductCard from './components/ProductCard'
import SellerOffers from './components/SellerOffers'
import StageProgress, { type Stage } from './components/StageProgress'

const FAVORITES_KEY = 'fairbuy-demo-favorites-v1'
const FIRST_FOLLOW_UP = 'Great. What will you use the PC for (gaming or something else), what is your budget, and which preferences matter most — resolution/FPS, GPU, RAM, or peripherals?'
const REVEAL_REPLY = 'ok, I have enough information'

type SearchStatus = 'idle' | 'searching' | 'complete'

function loadFavorites(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

function messageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function SourcePanel({ sourceOffline, offlineOfferCount, onToggle }: { sourceOffline: boolean; offlineOfferCount: number; onToggle: () => void }) {
  return (
    <div className="panel source-panel">
      <div className="panel-heading"><span className="panel-kicker">Stato fonti</span><span className={`status-dot ${sourceOffline ? 'is-off' : ''}`}>{sourceOffline ? 'offline' : 'online'}</span></div>
      <p className="hint">Galaxus · synthetic fixture. No network requests.</p>
      {sourceOffline ? <p className="source-banner" role="status" data-testid="source-banner">Partial results: {offlineOfferCount} Galaxus offers are not being evaluated. Rankings may change.</p> : null}
      <button type="button" className={`button button--small ${sourceOffline ? 'button--primary' : 'button--ghost'}`} onClick={onToggle} data-testid="source-toggle">{sourceOffline ? 'Restore Galaxus source' : 'Simulate Galaxus offline'}</button>
    </div>
  )
}

export default function App() {
  const [relaySeed, setRelaySeed] = useState<string[] | null>(null)
  const [ambiguous, setAmbiguous] = useState(false)
  const [stage, setStage] = useState<Stage>('ask')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [characteristics, setCharacteristics] = useState<Characteristic[]>([])
  const [revealed, setRevealed] = useState(false)
  const [priceRange, setPriceRange] = useState<PriceBounds>(DEFAULT_PRICE_RANGE)
  const [discoveredIds, setDiscoveredIds] = useState<string[]>([])
  const [searchStatus, setSearchStatus] = useState<SearchStatus>('idle')
  const [revealIndex, setRevealIndex] = useState(0)
  const [searchSignature, setSearchSignature] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [compareOpen, setCompareOpen] = useState(false)
  const [favorites, setFavorites] = useState<string[]>(loadFavorites)
  const [sourceOffline, setSourceOffline] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [toast, setToast] = useState<{ message: string } | null>(null)
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [dismissId, setDismissId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<string[]>([])

  const brief = useMemo(() => deriveBrief(characteristics, priceRange), [characteristics, priceRange])
  const matches = useMemo(() => {
    const result = findDiscoveryMatches(products, allOffers, characteristics, priceRange)
    return { ...result, matches: result.matches.filter((product) => !feedback.some((entry) => entry.active && entry.productId === product.id)) }
  }, [characteristics, priceRange, feedback])
  const currentSignature = useMemo(() => filterSignature(characteristics, priceRange), [characteristics, priceRange])
  const visibleOffers = useMemo(() => sourceOffline ? allOffers.filter((offer) => offer.retailer !== 'Galaxus') : allOffers, [sourceOffline])
  const productById = useMemo(() => Object.fromEntries(products.map((product) => [product.id, product])), [])
  const matchById = useMemo(() => Object.fromEntries(matches.matches.map((product) => [product.id, computeMatch(product, brief, offersForProduct(allOffers, product.id))])), [matches.matches, brief])

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites))
  }, [favorites])

  useEffect(() => {
    if (stage !== 'discover' || searchStatus !== 'searching') return
    const product = matches.matches.find((candidate) => !discoveredIds.includes(candidate.id))
    if (!product) {
      setSearchStatus('complete')
      return
    }
    const timer = window.setTimeout(() => {
      setDiscoveredIds((current) => current.includes(product.id) ? current : [...current, product.id])
      setRevealIndex((current) => current + 1)
    }, 2000)
    return () => window.clearTimeout(timer)
  }, [stage, searchStatus, revealIndex, matches, discoveredIds])

  const addMessage = (role: ChatMessage['role'], text: string, simulated = false) => {
    setMessages((current) => [...current, { id: messageId(role), role, text, simulated }])
  }

  const sendMessage = (text: string) => {
    const userCount = messages.filter((message) => message.role === 'user').length
    const userMessage: ChatMessage = { id: messageId('user'), role: 'user', text }

    if (userCount === 0) {
      const category = routeCategory(text)
      if (category === 'relay') { setRelaySeed([text]); return }
      if (category === 'ambiguous') {
        setAmbiguous(true)
        setMessages([userMessage, { id: messageId('assistant'), role: 'assistant', text: 'Which category do you mean: a PC/computer, or a smart relay switch for a neon light (not Nintendo or a network switch)?', simulated: true }])
        return
      }
      setMessages((current) => [...current, userMessage, { id: messageId('assistant'), role: 'assistant', text: FIRST_FOLLOW_UP, simulated: true }])
      return
    }
    if (userCount === 1) {
      if (ambiguous && routeCategory(text) === 'relay') {
        setRelaySeed([messages.find((message) => message.role === 'user')!.text, text]); return
      }
      setMessages((current) => [...current, userMessage, { id: messageId('assistant'), role: 'assistant', text: REVEAL_REPLY, simulated: true }])
      setCharacteristics(DEFAULT_CHARACTERISTICS)
      setRevealed(true)
      return
    }
    const reply = mockReply(text, brief)
    setMessages((current) => [...current, userMessage, { id: messageId('assistant'), role: 'assistant', text: reply.text, simulated: true }])
  }

  const startDiscovery = (nextCharacteristics: Characteristic[] = characteristics, nextRange: PriceBounds = priceRange) => {
    const result = findDiscoveryMatches(products, allOffers, nextCharacteristics, nextRange)
    setStage('discover')
    setDiscoveredIds([])
    setRevealIndex(0)
    setSearchStatus(result.matches.some((product) => !feedback.some((entry) => entry.active && entry.productId === product.id)) ? 'searching' : 'complete')
    setSearchSignature(filterSignature(nextCharacteristics, nextRange))
    setMobileNav(false)
  }

  const navigate = (next: Stage) => {
    setMobileNav(false)
    if (next !== 'ask' && !revealed) {
      setToast({ message: 'Send two messages in ASK first; characteristics are not available yet.' })
      return
    }
    if (next === 'product') {
      if (selectedId) setStage('product')
      return
    }
    if (next === 'compare') { if (compareIds.length >= 2) setCompareOpen(true); return }
    if (next === 'discover') {
      if (searchStatus === 'idle' || searchSignature !== currentSignature) { startDiscovery(); return }
      setStage('discover')
      return
    }
    setStage(next)
  }

  const changePriceRange = (next: PriceBounds) => {
    setPriceRange(next)
    if (stage === 'discover') startDiscovery(characteristics, next)
  }

  const addCharacteristic = (label: string) => {
    const clean = label.trim()
    if (!clean) return
    const next = [...characteristics, createCustomCharacteristic(clean)]
    setCharacteristics(next)
    if (stage === 'discover') startDiscovery(next, priceRange)
  }

  const removeCharacteristic = (id: string) => {
    const next = characteristics.filter((characteristic) => characteristic.id !== id)
    setCharacteristics(next)
    if (stage === 'discover') startDiscovery(next, priceRange)
  }

  const openProduct = (id: string) => {
    setSelectedId(id)
    setStage('product')
    setMobileNav(false)
  }

  const toggleFavorite = (id: string) => {
    setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  const toggleCompare = (id: string) => {
    setCompareIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id)
      if (current.length >= 3) { setToast({ message: 'You can compare up to 3 products.' }); return current }
      return [...current, id]
    })
  }

  const toggleSource = () => {
    const next = !sourceOffline
    setSourceOffline(next)
    addMessage(next ? 'system' : 'assistant', next
      ? 'Galaxus is simulated as unavailable. Results are partial: its offers are not being evaluated.'
      : 'Galaxus has been restored. Results again include all available fixtures.')
    setToast({ message: next ? 'Source simulated offline: partial results.' : 'Source restored.' })
  }

  const resetDemo = () => {
    setRelaySeed(null)
    setAmbiguous(false)
    setFeedback([])
    setDismissId(null)
    setExpandedIds([])
    localStorage.removeItem(FAVORITES_KEY)
    setStage('ask')
    setMessages([])
    setCharacteristics([])
    setRevealed(false)
    setPriceRange(DEFAULT_PRICE_RANGE)
    setDiscoveredIds([])
    setSearchStatus('idle')
    setRevealIndex(0)
    setSearchSignature('')
    setSelectedId(null)
    setCompareIds([])
    setCompareOpen(false)
    setFavorites([])
    setSourceOffline(false)
    setMobileNav(false)
    setToast({ message: 'Demo reset: chat and characteristics cleared.' })
  }

  const activeProduct = selectedId ? productById[selectedId] : null
  const activeOffers = activeProduct ? offersForProduct(visibleOffers, activeProduct.id) : []
  const activeMatch = activeProduct ? computeMatch(activeProduct, brief, activeOffers) : null
  const selectedProducts = compareIds.map((id) => productById[id]).filter((product): product is Product => Boolean(product))
  const discoveredProducts = discoveredIds.map((id) => productById[id]).filter((product): product is Product => Boolean(product) && matches.matches.some((candidate) => candidate.id === product.id))
  const offlineOfferCount = allOffers.filter((offer) => offer.retailer === 'Galaxus' && discoveredIds.includes(offer.productId)).length

  const renderCard = (product: Product) => {
    const match = matchById[product.id]
    if (!match) return null
    return (
      <ProductCard
        key={product.id}
        product={product}
        match={match}
        offers={offersForProduct(allOffers, product.id)}
        favorite={favorites.includes(product.id)}
        compared={compareIds.includes(product.id)}
        onOpen={() => openProduct(product.id)}
        expanded={expandedIds.includes(product.id)}
        onToggle={() => setExpandedIds((current) => current.includes(product.id) ? current.filter((id) => id !== product.id) : [...current, product.id])}
        onDismiss={() => setDismissId(product.id)}
        onFavorite={() => toggleFavorite(product.id)}
        onCompare={() => toggleCompare(product.id)}
      />
    )
  }

  const applyFeedback = (reasons: DismissReason[], clarification: Clarification, note: string) => {
    if (!dismissId) return
    const product = productById[dismissId]
    const { next, changes } = clarifyFeatures(characteristics, reasons, clarification)
    const entry: Feedback = {
      id: messageId('feedback'), productId: product.id, productName: product.name, reasons, note, active: true, changes,
      clarification: changes.length ? `Explicit choice: ${changes.map((change) => change.after.label).join('; ')}.` : 'Characteristics and price unchanged. No automatic constraints.',
    }
    setFeedback((current) => [...current, entry])
    setCharacteristics(next)
    setCompareIds((current) => current.filter((id) => id !== product.id))
    setDismissId(null)
    setToast({ message: `${product.name} excluded. Reason saved in LEARN; you can restore it.` })
    if (changes.length) startDiscovery(next)
  }

  const undoFeedback = (id: string) => {
    const entry = feedback.find((item) => item.id === id)
    if (!entry) return
    const next = undoFeatureChanges(characteristics, entry.changes)
    setCharacteristics(next)
    setFeedback((current) => current.map((item) => item.id === id ? { ...item, active: false } : item))
    setDiscoveredIds((current) => current.filter((productId) => productId !== entry.productId))
    setSearchStatus('searching')
    setToast({ message: 'Exclusion undone. Later edits are preserved; the product returns only if it matches the current filters.' })
  }

  const title = stage === 'ask'
    ? 'Find a new gaming PC'
    : stage === 'configure'
      ? 'Configure price and filters'
      : stage === 'product' && activeProduct
        ? activeProduct.name
        : 'Products found'

  if (relaySeed) return <RelayFlow initialMessages={relaySeed} onRestart={resetDemo} />

  return (
    <div className="app-shell">
      <aside className={`app-rail ${mobileNav ? 'is-open' : ''}`} aria-label="Demo navigation">
        <div className="brand"><span className="brand__mark">◇</span><span>fairbuy</span></div>
        <span className="demo-badge">DEMO · synthetic data</span>
        <nav className="rail-nav">
          <button type="button" data-testid="rail-ask" className={stage === 'ask' ? 'is-active' : ''} onClick={() => navigate('ask')}>01 Request</button>
          <button type="button" data-testid="rail-configure" className={stage === 'configure' ? 'is-active' : ''} onClick={() => navigate('configure')}>02 Configure</button>
          <button type="button" data-testid="rail-discover" className={stage === 'discover' || stage === 'product' ? 'is-active' : ''} onClick={() => navigate('discover')}>03 Discover</button>
        </nav>
        <div className="rail-note">
          <strong>Journey</strong>
          <p className="rail-fine">1. Two messages in ASK<br />2. Configure price and filters<br />3. Discover products</p>
        </div>
        <p className="rail-fine" data-testid="favorites-count">♥ Saved favorites: {favorites.length}</p>
        <button type="button" className="rail-reset" onClick={resetDemo} data-testid="reset-demo">Reset demo</button>
        <p className="rail-fine">No purchases, real links, or AI.</p>
      </aside>
      {mobileNav ? <button type="button" className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} /> : null}
      <div className="app-main">
        <header className="topbar">
          <button type="button" className="menu-button" onClick={() => setMobileNav((current) => !current)} aria-expanded={mobileNav} aria-label="Open navigation">☰</button>
          <div><p className="eyebrow">FairBuy workspace · Zurich</p><h1>{title}</h1></div>
          <span className="demo-badge demo-badge--top">DEMO / synthetic data</span>
        </header>
        <StageProgress stage={compareOpen ? 'compare' : stage} canConfigure={revealed} canChoose={Boolean(selectedId)} canCompare={compareIds.length >= 2} onNavigate={navigate} />
        <main className="app-content">
          {revealed && (stage === 'learn' || feedback.length > 0) ? <FeedbackLog entries={feedback} onUndo={undoFeedback} /> : null}
          {stage === 'learn' ? <button type="button" className="button" onClick={() => navigate('discover')}>Back to DISCOVER</button> : null}
          {stage === 'ask' ? (
            <div className="ask-layout">
              <ChatPanel
                messages={messages}
                revealed={revealed}
                characteristicCount={characteristics.length}
                onSend={sendMessage}
                onConfigure={() => navigate('configure')}
              />
              <aside className="ask-side">
                {revealed ? (
                  <div className="panel">
                    <CharacteristicsPanel
                      characteristics={characteristics}
                      onRemove={removeCharacteristic}
                      onAdd={addCharacteristic}
                      hint="Edits here or in Configure remain active throughout the journey."
                    />
                  </div>
                ) : (
                  <div className="panel" data-testid="ask-locked">
                    <div className="panel-heading"><span className="panel-kicker">Characteristics</span><span className="soft-tag">waiting</span></div>
                    <p className="hint">No characteristics are prefilled. Send two messages; the scripted assistant reveals mock characteristics after the second.</p>
                  </div>
                )}
                <div className="panel">
                  <div className="panel-heading"><span className="panel-kicker">What is simulated</span><span className="synthetic-badge">mock</span></div>
                  <ul className="plain-list">
                    <li>Deterministic keyword replies; no AI model.</li>
                    <li>Characteristics and products are synthetic fixtures.</li>
                    <li>No API, purchases, or real links.</li>
                  </ul>
                </div>
              </aside>
            </div>
          ) : null}

          {stage === 'configure' ? (
            <div className="configure-page" data-testid="configure-page">
              <section className="panel configure-panel" aria-label="Configure price and characteristics">
                <div className="panel-heading"><span className="panel-kicker">Configure</span><span className="soft-tag">synthetic data</span></div>
                <h2>Price and characteristics</h2>
                <p className="hint">One price range with two thumbs. Characteristics stay editable and are preserved when you return to ASK.</p>
                <PriceRangeSlider bounds={PRODUCT_PRICE_BOUNDS} value={priceRange} onChange={changePriceRange} />
                <CharacteristicsPanel
                  characteristics={characteristics}
                  onRemove={removeCharacteristic}
                  onAdd={addCharacteristic}
                  title="Selected characteristics"
                  hint="Remove an item or add free text; edits are preserved in your search."
                />
                <div className="configure-actions">
                  <button type="button" className="button button--ghost" onClick={() => navigate('ask')} data-testid="back-to-ask">← Back to ASK</button>
                  <button type="button" className="button button--primary" onClick={() => startDiscovery()} data-testid="start-discovery">Start discovery →</button>
                </div>
                <p className="hint">Discovery reveals one product every 2 seconds and stops when compatible results are exhausted.</p>
              </section>
              <aside className="ask-side">
                <div className="panel">
                  <div className="panel-heading"><span className="panel-kicker">Filter summary</span></div>
                  <dl className="summary-list">
                    <dt>Price</dt><dd>{formatCHF(priceRange.min)} – {formatCHF(priceRange.max)}</dd>
                    <dt>Characteristics</dt><dd>{characteristics.length}</dd>
                    <dt>Compatible (fixtures)</dt><dd>{matches.matches.length}</dd>
                  </dl>
                </div>
                <div className="panel">
                  <div className="panel-heading"><span className="panel-kicker">Nota</span></div>
                  <p className="hint">Counts use synthetic fixtures. Custom characteristics are not verified against products.</p>
                </div>
              </aside>
            </div>
          ) : null}

          {stage === 'discover' ? (
            <div className="discover-page" data-testid="discover-page">
              <section className="discover-filters panel" aria-label="Search filters">
                <div className="panel-heading"><span className="panel-kicker">Filters</span><span className="soft-tag">synthetic data</span></div>
                <PriceRangeSlider bounds={PRODUCT_PRICE_BOUNDS} value={priceRange} onChange={changePriceRange} />
                <CharacteristicsPanel
                  characteristics={characteristics}
                  onRemove={removeCharacteristic}
                  onAdd={addCharacteristic}
                  title="Active characteristics"
                  hint="Changing a filter restarts discovery from the beginning."
                />
              </section>
              <div className="discover-main">
                <section className="results" aria-live="polite">
                  <div className="results-head">
                    <div><p className="eyebrow">Discover · synthetic results</p><h2>Products for you</h2></div>
                    <span className={`status-pill status-pill--${searchStatus}`} data-testid="search-status">
                      {searchStatus === 'searching' ? 'Searching...' : searchStatus === 'complete' ? 'Discovery complete' : 'Ready'}
                    </span>
                  </div>
                  <div className="results-status">
                    <span data-testid="discover-count">{discoveredProducts.length} shown · {matches.matches.length} match supported filters</span>
                    <span>{searchStatus === 'searching' ? 'One result every 2 seconds' : searchStatus === 'complete' ? 'No more results' : 'Waiting'}</span>
                  </div>
                  {matches.unsupported.length > 0 ? (
                    <p className="info-banner" data-testid="unsupported-banner">
                      Custom filters cannot be verified: {matches.unsupported.map((characteristic) => characteristic.label).join(', ')}. They are excluded from matching; no product is claimed to satisfy them.
                    </p>
                  ) : null}
                  {searchStatus === 'searching' ? (
                    <div className="searching-state" role="status" data-testid="searching-indicator">
                      <span className="spinner" aria-hidden="true" />
                      <div>
                        <strong>Searching...</strong>
                        <p className="hint">One product every 2 seconds. {discoveredProducts.length}/{matches.matches.length} shown.</p>
                      </div>
                    </div>
                  ) : null}
                  {searchStatus === 'complete' && matches.matches.length === 0 ? (
                    <div className="empty-state" data-testid="empty-state">
                      <span className="empty-state__icon">◇</span>
                      <h3>No products match these filters</h3>
                      <p>The price or supported characteristics exclude all synthetic fixtures. FairBuy will not change anything automatically: widen a filter or return to ASK.</p>
                      <div className="empty-state__actions">
                        <button type="button" className="button button--primary" onClick={() => { setPriceRange(PRODUCT_PRICE_BOUNDS); startDiscovery(characteristics, PRODUCT_PRICE_BOUNDS) }} data-testid="reset-filters">Widen the budget</button>
                        <button type="button" className="button button--ghost" onClick={() => navigate('ask')}>Back to ASK</button>
                      </div>
                    </div>
                  ) : null}
                  {discoveredProducts.length > 0 ? (
                    <div className="product-grid" data-testid="discover-grid">{discoveredProducts.map(renderCard)}</div>
                  ) : null}
                  {searchStatus === 'complete' && matches.matches.length > 0 ? (
                    <p className="search-complete" role="status" data-testid="search-complete">Discovery complete: {matches.matches.length} products matching supported filters shown. No more results in the synthetic catalog.</p>
                  ) : null}
                </section>
                <aside className="insights">
                  <div className="panel">
                    <div className="panel-heading"><span className="panel-kicker">How it works</span></div>
                    <ul className="plain-list">
                      <li>One mock product appears below the filters every 2 seconds.</li>
                      <li>Discovery stops when compatible results are exhausted.</li>
                      <li>Changing a filter resets and restarts discovery.</li>
                    </ul>
                  </div>
                  <div className="panel">
                    <div className="panel-heading"><span className="panel-kicker">Unverified filters</span></div>
                    <p className="hint">Custom characteristics are shown but not compared with synthetic specifications; no product is claimed to satisfy them.</p>
                  </div>
                  <div className="panel">
                    <div className="panel-heading"><span className="panel-kicker">Coverage</span></div>
                    <p className="hint">Swiss CHF fixtures only. No live search, market coverage, or active retailer links.</p>
                  </div>
                </aside>
              </div>
            </div>
          ) : null}

          {stage === 'product' && activeProduct && activeMatch ? (
            <div className="workspace-grid workspace-grid--product">
              <aside className="panel">
                <div className="panel-heading"><span className="panel-kicker">Active filters</span></div>
                <p className="hint">{formatCHF(priceRange.min)} – {formatCHF(priceRange.max)}</p>
                {characteristics.length > 0 ? <ul className="plain-list">{characteristics.map((characteristic) => <li key={characteristic.id}>{characteristic.label}</li>)}</ul> : <p className="hint">No active characteristics.</p>}
                <button type="button" className="button button--small" onClick={() => setStage('discover')}>← Back to results</button>
              </aside>
              <SellerOffers product={activeProduct} offers={activeOffers} match={activeMatch} sourceOffline={sourceOffline} onBack={() => setStage('discover')} />
              <aside className="insights">
                <SourcePanel sourceOffline={sourceOffline} offlineOfferCount={offlineOfferCount} onToggle={toggleSource} />
                <div className="panel"><h3>Your decision</h3><p className="hint">Choose an exact offer to view its simulated retailer detail. FairBuy does not purchase or contact anyone.</p></div>
              </aside>
            </div>
          ) : null}
        </main>
        <footer className="app-footer"><span>fairbuy · concept demo</span><span>Synthetic data · no real offers · no purchases</span></footer>
      </div>
      <CompareTray products={selectedProducts} onOpen={() => setCompareOpen(true)} onRemove={toggleCompare} onClear={() => setCompareIds([])} />
      {compareOpen ? <CompareModal products={selectedProducts} matches={matchById} onClose={() => setCompareOpen(false)} /> : null}
      {dismissId ? <DismissModal key={dismissId} product={productById[dismissId]} brief={brief} onClose={() => { setDismissId(null); window.setTimeout(() => document.querySelector<HTMLButtonElement>(`[data-testid="dismiss-${dismissId}"]`)?.focus(), 0) }} onApply={applyFeedback} /> : null}
      {toast ? <div className="toast" role="status"><span>{toast.message}</span><button type="button" className="toast__close" onClick={() => setToast(null)} aria-label="Dismiss notification">×</button></div> : null}
    </div>
  )
}
