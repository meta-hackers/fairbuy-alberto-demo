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
const FIRST_FOLLOW_UP = 'Perfetto. A cosa ti serve il PC (giochi o altro), che budget hai in mente e quali preferenze contano di più — risoluzione/FPS, GPU, RAM o periferiche?'
const REVEAL_REPLY = 'ok, ho abbastanza informazioni'

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
      <p className="hint">Galaxus · fixture sintetica. Nessuna richiesta di rete.</p>
      {sourceOffline ? <p className="source-banner" role="status" data-testid="source-banner">Risultati parziali: {offlineOfferCount} offerte Galaxus non valutate. La classifica può cambiare.</p> : null}
      <button type="button" className={`button button--small ${sourceOffline ? 'button--primary' : 'button--ghost'}`} onClick={onToggle} data-testid="source-toggle">{sourceOffline ? 'Riprova fonte Galaxus' : 'Simula fonte Galaxus offline'}</button>
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
        setMessages([userMessage, { id: messageId('assistant'), role: 'assistant', text: 'Quale categoria intendi: PC/computer oppure interruttore relè smart per neon (non Nintendo né rete)?', simulated: true }])
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
      setToast({ message: 'Completa prima i due messaggi in ASK: le caratteristiche non sono ancora disponibili.' })
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
      if (current.length >= 3) { setToast({ message: 'Puoi confrontare al massimo 3 prodotti.' }); return current }
      return [...current, id]
    })
  }

  const toggleSource = () => {
    const next = !sourceOffline
    setSourceOffline(next)
    addMessage(next ? 'system' : 'assistant', next
      ? 'Fonte Galaxus simulata come non disponibile. La classifica è parziale: le sue offerte non vengono valutate.'
      : 'Fonte Galaxus ripristinata. I risultati tornano completi per le fixture disponibili.')
    setToast({ message: next ? 'Fonte offline simulata: risultati parziali.' : 'Fonte ripristinata.' })
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
    setToast({ message: 'Demo ripristinata: chat e caratteristiche azzerate.' })
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
      clarification: changes.length ? `Scelta esplicita: ${changes.map((change) => change.after.label).join('; ')}.` : 'Caratteristiche e prezzo invariati. Nessun vincolo automatico.',
    }
    setFeedback((current) => [...current, entry])
    setCharacteristics(next)
    setCompareIds((current) => current.filter((id) => id !== product.id))
    setDismissId(null)
    setToast({ message: `${product.name} escluso. Motivo salvato in LEARN; puoi ripristinarlo.` })
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
    setToast({ message: 'Esclusione annullata. Le modifiche successive sono conservate; il prodotto rientra solo se compatibile con i filtri.' })
  }

  const title = stage === 'ask'
    ? 'Cerco un PC gaming nuovo'
    : stage === 'configure'
      ? 'Configura prezzo e filtri'
      : stage === 'product' && activeProduct
        ? activeProduct.name
        : 'Prodotti trovati'

  if (relaySeed) return <RelayFlow initialMessages={relaySeed} onRestart={resetDemo} />

  return (
    <div className="app-shell">
      <aside className={`app-rail ${mobileNav ? 'is-open' : ''}`} aria-label="Navigazione demo">
        <div className="brand"><span className="brand__mark">◇</span><span>fairbuy</span></div>
        <span className="demo-badge">DEMO · dati simulati</span>
        <nav className="rail-nav">
          <button type="button" data-testid="rail-ask" className={stage === 'ask' ? 'is-active' : ''} onClick={() => navigate('ask')}>01 Richiesta</button>
          <button type="button" data-testid="rail-configure" className={stage === 'configure' ? 'is-active' : ''} onClick={() => navigate('configure')}>02 Configura</button>
          <button type="button" data-testid="rail-discover" className={stage === 'discover' || stage === 'product' ? 'is-active' : ''} onClick={() => navigate('discover')}>03 Scoperta</button>
        </nav>
        <div className="rail-note">
          <strong>Percorso</strong>
          <p className="rail-fine">1. Due messaggi in ASK<br />2. Configura prezzo e filtri<br />3. Scopri i prodotti</p>
        </div>
        <p className="rail-fine" data-testid="favorites-count">♥ Preferiti salvati: {favorites.length}</p>
        <button type="button" className="rail-reset" onClick={resetDemo} data-testid="reset-demo">Ripristina demo</button>
        <p className="rail-fine">Nessun acquisto, nessun link reale, nessuna AI.</p>
      </aside>
      {mobileNav ? <button type="button" className="nav-scrim" aria-label="Chiudi navigazione" onClick={() => setMobileNav(false)} /> : null}
      <div className="app-main">
        <header className="topbar">
          <button type="button" className="menu-button" onClick={() => setMobileNav((current) => !current)} aria-expanded={mobileNav} aria-label="Apri navigazione">☰</button>
          <div><p className="eyebrow">FairBuy workspace · Zurigo</p><h1>{title}</h1></div>
          <span className="demo-badge demo-badge--top">DEMO / dati simulati</span>
        </header>
        <StageProgress stage={compareOpen ? 'compare' : stage} canConfigure={revealed} canChoose={Boolean(selectedId)} canCompare={compareIds.length >= 2} onNavigate={navigate} />
        <main className="app-content">
          {revealed && (stage === 'learn' || feedback.length > 0) ? <FeedbackLog entries={feedback} onUndo={undoFeedback} /> : null}
          {stage === 'learn' ? <button type="button" className="button" onClick={() => navigate('discover')}>Torna a DISCOVER</button> : null}
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
                      hint="Modifiche qui o in Configura restano attive in tutte le fasi."
                    />
                  </div>
                ) : (
                  <div className="panel" data-testid="ask-locked">
                    <div className="panel-heading"><span className="panel-kicker">Caratteristiche</span><span className="soft-tag">in attesa</span></div>
                    <p className="hint">Nessuna caratteristica è preimpostata. Scrivi due messaggi: al secondo l’assistente simulato mostra le caratteristiche scelte.</p>
                  </div>
                )}
                <div className="panel">
                  <div className="panel-heading"><span className="panel-kicker">Cosa è simulato</span><span className="synthetic-badge">mock</span></div>
                  <ul className="plain-list">
                    <li>Risposte deterministiche a parole chiave, nessun modello AI.</li>
                    <li>Caratteristiche e prodotti sono fixture sintetiche.</li>
                    <li>Nessuna API, nessun acquisto, nessun link reale.</li>
                  </ul>
                </div>
              </aside>
            </div>
          ) : null}

          {stage === 'configure' ? (
            <div className="configure-page" data-testid="configure-page">
              <section className="panel configure-panel" aria-label="Configura prezzo e caratteristiche">
                <div className="panel-heading"><span className="panel-kicker">Configura</span><span className="soft-tag">dati sintetici</span></div>
                <h2>Prezzo e caratteristiche</h2>
                <p className="hint">Un solo intervallo di prezzo con due cursori. Le caratteristiche restano modificabili e non si azzerano tornando ad ASK.</p>
                <PriceRangeSlider bounds={PRODUCT_PRICE_BOUNDS} value={priceRange} onChange={changePriceRange} />
                <CharacteristicsPanel
                  characteristics={characteristics}
                  onRemove={removeCharacteristic}
                  onAdd={addCharacteristic}
                  title="Caratteristiche scelte"
                  hint="Rimuovi o aggiungi testo libero: le modifiche vengono conservate nella ricerca."
                />
                <div className="configure-actions">
                  <button type="button" className="button button--ghost" onClick={() => navigate('ask')} data-testid="back-to-ask">← Torna ad ASK</button>
                  <button type="button" className="button button--primary" onClick={() => startDiscovery()} data-testid="start-discovery">Avvia ricerca →</button>
                </div>
                <p className="hint">La ricerca mostra un prodotto ogni 2 secondi e si ferma quando esaurisce i risultati compatibili.</p>
              </section>
              <aside className="ask-side">
                <div className="panel">
                  <div className="panel-heading"><span className="panel-kicker">Riepilogo filtri</span></div>
                  <dl className="summary-list">
                    <dt>Prezzo</dt><dd>{formatCHF(priceRange.min)} – {formatCHF(priceRange.max)}</dd>
                    <dt>Caratteristiche</dt><dd>{characteristics.length}</dd>
                    <dt>Compatibili (fixture)</dt><dd>{matches.matches.length}</dd>
                  </dl>
                </div>
                <div className="panel">
                  <div className="panel-heading"><span className="panel-kicker">Nota</span></div>
                  <p className="hint">Il conteggio è calcolato sulle fixture sintetiche. Le caratteristiche personalizzate non sono verificate sui prodotti.</p>
                </div>
              </aside>
            </div>
          ) : null}

          {stage === 'discover' ? (
            <div className="discover-page" data-testid="discover-page">
              <section className="discover-filters panel" aria-label="Filtri di ricerca">
                <div className="panel-heading"><span className="panel-kicker">Filtri</span><span className="soft-tag">dati sintetici</span></div>
                <PriceRangeSlider bounds={PRODUCT_PRICE_BOUNDS} value={priceRange} onChange={changePriceRange} />
                <CharacteristicsPanel
                  characteristics={characteristics}
                  onRemove={removeCharacteristic}
                  onAdd={addCharacteristic}
                  title="Caratteristiche attive"
                  hint="La ricerca riparte da zero quando cambi un filtro."
                />
              </section>
              <div className="discover-main">
                <section className="results" aria-live="polite">
                  <div className="results-head">
                    <div><p className="eyebrow">Discover · risultati sintetici</p><h2>Prodotti per te</h2></div>
                    <span className={`status-pill status-pill--${searchStatus}`} data-testid="search-status">
                      {searchStatus === 'searching' ? 'Sta cercando...' : searchStatus === 'complete' ? 'Ricerca completata' : 'Pronta'}
                    </span>
                  </div>
                  <div className="results-status">
                    <span data-testid="discover-count">{discoveredProducts.length} visibili · {matches.matches.length} compatibili con filtri supportati</span>
                    <span>{searchStatus === 'searching' ? 'Inserimento ogni 2 secondi' : searchStatus === 'complete' ? 'Nessun altro risultato' : 'In attesa'}</span>
                  </div>
                  {matches.unsupported.length > 0 ? (
                    <p className="info-banner" data-testid="unsupported-banner">
                      Filtri personalizzati non verificabili: {matches.unsupported.map((characteristic) => characteristic.label).join(', ')}. Non vengono usati per il match e nessun prodotto viene dichiarato compatibile con essi.
                    </p>
                  ) : null}
                  {searchStatus === 'searching' ? (
                    <div className="searching-state" role="status" data-testid="searching-indicator">
                      <span className="spinner" aria-hidden="true" />
                      <div>
                        <strong>Sta cercando...</strong>
                        <p className="hint">Un prodotto ogni 2 secondi. {discoveredProducts.length}/{matches.matches.length} mostrati.</p>
                      </div>
                    </div>
                  ) : null}
                  {searchStatus === 'complete' && matches.matches.length === 0 ? (
                    <div className="empty-state" data-testid="empty-state">
                      <span className="empty-state__icon">◇</span>
                      <h3>Nessun prodotto con questi filtri</h3>
                      <p>Il prezzo o le caratteristiche supportate escludono tutte le fixture sintetiche. FairBuy non cambia nulla da solo: allarga un filtro o torna ad ASK.</p>
                      <div className="empty-state__actions">
                        <button type="button" className="button button--primary" onClick={() => { setPriceRange(PRODUCT_PRICE_BOUNDS); startDiscovery(characteristics, PRODUCT_PRICE_BOUNDS) }} data-testid="reset-filters">Allarga il budget</button>
                        <button type="button" className="button button--ghost" onClick={() => navigate('ask')}>Torna ad ASK</button>
                      </div>
                    </div>
                  ) : null}
                  {discoveredProducts.length > 0 ? (
                    <div className="product-grid" data-testid="discover-grid">{discoveredProducts.map(renderCard)}</div>
                  ) : null}
                  {searchStatus === 'complete' && matches.matches.length > 0 ? (
                    <p className="search-complete" role="status" data-testid="search-complete">Ricerca completata: {matches.matches.length} prodotti compatibili con i filtri supportati mostrati. Nessun altro prodotto nel catalogo sintetico.</p>
                  ) : null}
                </section>
                <aside className="insights">
                  <div className="panel">
                    <div className="panel-heading"><span className="panel-kicker">Come funziona</span></div>
                    <ul className="plain-list">
                      <li>Un prodotto mock ogni 2 secondi, sotto i filtri.</li>
                      <li>La ricerca si ferma quando i risultati compatibili sono esauriti.</li>
                      <li>Cambiare un filtro azzera e riavvia la ricerca.</li>
                    </ul>
                  </div>
                  <div className="panel">
                    <div className="panel-heading"><span className="panel-kicker">Filtri non verificabili</span></div>
                    <p className="hint">Le caratteristiche personalizzate sono mostrate ma non vengono confrontate con le specifiche sintetiche: nessun prodotto viene dichiarato compatibile con esse.</p>
                  </div>
                  <div className="panel">
                    <div className="panel-heading"><span className="panel-kicker">Copertura</span></div>
                    <p className="hint">Solo fixture sintetiche svizzere in CHF. Nessuna ricerca reale, nessuna esaustività di mercato, nessun link retailer attivo.</p>
                  </div>
                </aside>
              </div>
            </div>
          ) : null}

          {stage === 'product' && activeProduct && activeMatch ? (
            <div className="workspace-grid workspace-grid--product">
              <aside className="panel">
                <div className="panel-heading"><span className="panel-kicker">Filtri attivi</span></div>
                <p className="hint">{formatCHF(priceRange.min)} – {formatCHF(priceRange.max)}</p>
                {characteristics.length > 0 ? <ul className="plain-list">{characteristics.map((characteristic) => <li key={characteristic.id}>{characteristic.label}</li>)}</ul> : <p className="hint">Nessuna caratteristica attiva.</p>}
                <button type="button" className="button button--small" onClick={() => setStage('discover')}>← Torna ai risultati</button>
              </aside>
              <SellerOffers product={activeProduct} offers={activeOffers} match={activeMatch} sourceOffline={sourceOffline} onBack={() => setStage('discover')} />
              <aside className="insights">
                <SourcePanel sourceOffline={sourceOffline} offlineOfferCount={offlineOfferCount} onToggle={toggleSource} />
                <div className="panel"><h3>Decisione</h3><p className="hint">Scegli un’offerta esatta e apri il dettaglio retailer simulato. FairBuy non compra e non contatta nessuno.</p></div>
              </aside>
            </div>
          ) : null}
        </main>
        <footer className="app-footer"><span>fairbuy · concept demo</span><span>Dati sintetici · nessuna offerta reale · nessun acquisto</span></footer>
      </div>
      <CompareTray products={selectedProducts} onOpen={() => setCompareOpen(true)} onRemove={toggleCompare} onClear={() => setCompareIds([])} />
      {compareOpen ? <CompareModal products={selectedProducts} matches={matchById} onClose={() => setCompareOpen(false)} /> : null}
      {dismissId ? <DismissModal key={dismissId} product={productById[dismissId]} brief={brief} onClose={() => { setDismissId(null); window.setTimeout(() => document.querySelector<HTMLButtonElement>(`[data-testid="dismiss-${dismissId}"]`)?.focus(), 0) }} onApply={applyFeedback} /> : null}
      {toast ? <div className="toast" role="status"><span>{toast.message}</span><button type="button" className="toast__close" onClick={() => setToast(null)} aria-label="Chiudi notifica">×</button></div> : null}
    </div>
  )
}
