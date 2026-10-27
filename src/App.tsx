import { useEffect, useMemo, useState } from 'react'
import {
  defaultBrief,
  offers as allOffers,
  products,
  type Brief,
  type DismissReason,
  type Product,
} from './data/fixtures'
import { applyDismissal, discoverAlternatives, evaluateCatalog, removeLearned, type Clarification } from './lib/matching'
import { offersForProduct } from './lib/sellers'
import BriefSidebar from './components/BriefSidebar'
import ChatPanel, { type ChatMessage } from './components/ChatPanel'
import { CompareTray, CompareModal } from './components/CompareTray'
import DismissModal from './components/DismissModal'
import ProductCard from './components/ProductCard'
import SellerOffers from './components/SellerOffers'
import StageProgress, { type Stage } from './components/StageProgress'

const primaryIds = products.filter((product) => product.pool === 'primary').map((product) => product.id)
const FAVORITES_KEY = 'fairbuy-demo-favorites-v1'

function loadFavorites(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

const initialMessages: ChatMessage[] = [
  { id: 'm1', role: 'assistant', text: 'Ciao, sono FairBuy. Cerco un PC gaming nuovo e ti faccio poche domande mirate prima di confrontare i prodotti.' },
  { id: 'm2', role: 'user', text: 'Cerco un PC gaming nuovo.' },
  { id: 'm3', role: 'assistant', text: 'Perfetto. A cosa giochi, a che risoluzione/FPS, e il budget CHF 1’200–2’400 include anche periferiche? Poi scegliamo GPU e RAM: obbligatorie o preferite.' },
]

interface Snapshot {
  brief: Brief
  discoveredIds: string[]
  dismissedIds: string[]
  messages: ChatMessage[]
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
  const [stage, setStage] = useState<Stage>('ask')
  const [brief, setBrief] = useState<Brief>(defaultBrief)
  const [discoveredIds, setDiscoveredIds] = useState<string[]>([])
  const [dismissedIds, setDismissedIds] = useState<string[]>([])
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'partial' | 'complete'>('idle')
  const [revealIndex, setRevealIndex] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dismissId, setDismissId] = useState<string | null>(null)
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [compareOpen, setCompareOpen] = useState(false)
  const [favorites, setFavorites] = useState<string[]>(loadFavorites)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [sourceOffline, setSourceOffline] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [toast, setToast] = useState<{ message: string; undo?: boolean } | null>(null)
  const [lastDismissal, setLastDismissal] = useState<Snapshot | null>(null)

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites))
  }, [favorites])

  useEffect(() => {
    if (searchStatus !== 'searching') return
    if (revealIndex >= primaryIds.length) {
      setSearchStatus('complete')
      setMessages((current) => [...current, { id: `done-${Date.now()}`, role: 'assistant', text: `Ho trovato ${primaryIds.length} prodotti esatti da fonti sintetiche. I prezzi sono range di totali consegnati confermati; le offerte con totale incompleto restano separate.` }])
      return
    }
    const timer = window.setTimeout(() => {
      const id = primaryIds[revealIndex]
      setDiscoveredIds((current) => current.includes(id) ? current : [...current, id])
      setRevealIndex((current) => current + 1)
    }, 650)
    return () => window.clearTimeout(timer)
  }, [searchStatus, revealIndex])

  useEffect(() => {
    if (searchStatus !== 'partial') return
    const timer = window.setTimeout(() => setSearchStatus('complete'), 1100)
    return () => window.clearTimeout(timer)
  }, [searchStatus])

  const visibleOffers = useMemo(() => sourceOffline ? allOffers.filter((offer) => offer.retailer !== 'Galaxus') : allOffers, [sourceOffline])
  const catalog = useMemo(() => evaluateCatalog(products, brief, visibleOffers, discoveredIds, dismissedIds), [brief, visibleOffers, discoveredIds, dismissedIds])
  const matchById = useMemo(() => Object.fromEntries(catalog.results.map((match) => [match.productId, match])), [catalog.results])
  const productById = useMemo(() => Object.fromEntries(products.map((product) => [product.id, product])), [])
  const offlineOfferCount = allOffers.filter((offer) => offer.retailer === 'Galaxus' && discoveredIds.includes(offer.productId)).length

  const addMessage = (role: ChatMessage['role'], text: string) => setMessages((current) => [...current, { id: `m-${Date.now()}-${Math.random()}`, role, text }])

  const startSearch = () => {
    setStage('discover')
    setSearchStatus('searching')
    setRevealIndex(0)
    setDiscoveredIds([])
    setDismissedIds([])
    setSelectedId(null)
    setCompareIds([])
    setFavoritesOnly(false)
    setMessages([
      { id: 'search-user', role: 'user', text: 'Cerco un PC gaming nuovo.' },
      { id: 'search-assistant', role: 'assistant', text: `Cerco prodotti nuovi a Zurigo con budget CHF ${brief.budgetMin}–${brief.budgetMax}, ${brief.resolution} · ${brief.targetFps} fps. GPU RTX ${brief.gpu.value}+ ${brief.gpu.mode === 'required' ? 'obbligatoria' : 'preferita'}; RAM ${brief.ram.value} GB ${brief.ram.mode === 'required' ? 'obbligatoria' : 'preferita'}.` },
    ])
  }

  const prepareBrief = () => {
    setStage('configure')
    addMessage('assistant', 'Rivedi il brief: puoi cambiare budget, GPU, RAM, città e preferenze. Poi avvio la ricerca simulata.')
  }

  const navigate = (next: Stage) => {
    setMobileNav(false)
    if (next === 'discover' && discoveredIds.length === 0) { startSearch(); return }
    if (next === 'product' && !selectedId) { setStage('discover'); return }
    setStage(next)
  }

  const openProduct = (id: string) => {
    setSelectedId(id)
    setStage('product')
    setMobileNav(false)
    addMessage('assistant', `Apro la configurazione esatta di ${productById[id].name}. Confronto solo offerte della stessa configurazione e condizione.`)
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

  const applyFeedback = (productId: string, reasons: DismissReason[], clarification: Clarification, note: string) => {
    const product = productById[productId]
    if (!product) return
    const baseBrief = note ? { ...brief, notes: note } : brief
    const result = applyDismissal(product, reasons, clarification, baseBrief)
    const alternatives = discoverAlternatives(product, reasons, discoveredIds, [...dismissedIds, productId])
    setLastDismissal({ brief, discoveredIds, dismissedIds, messages })
    setBrief(result.brief)
    setDismissedIds((current) => [...current, productId])
    setDiscoveredIds((current) => [...new Set([...current, ...alternatives])])
    setDismissId(null)
    setSearchStatus(alternatives.length > 0 ? 'partial' : 'complete')
    if (selectedId === productId) { setSelectedId(null); setStage('discover') }
    const names = alternatives.map((id) => productById[id]?.name).filter(Boolean).join(', ')
    addMessage('assistant', `${result.message}${names ? ` Nuove alternative trovate: ${names}.` : ''}`)
    setToast({ message: 'Prodotto rimosso. Il brief è stato aggiornato.', undo: true })
  }

  const undoDismissal = () => {
    if (!lastDismissal) return
    setBrief(lastDismissal.brief)
    setDiscoveredIds(lastDismissal.discoveredIds)
    setDismissedIds(lastDismissal.dismissedIds)
    setMessages(lastDismissal.messages)
    setLastDismissal(null)
    setToast({ message: 'Rimozione annullata.' })
  }

  const resetDemo = () => {
    localStorage.removeItem(FAVORITES_KEY)
    setStage('ask')
    setBrief(defaultBrief)
    setDiscoveredIds([])
    setDismissedIds([])
    setSearchStatus('idle')
    setRevealIndex(0)
    setSelectedId(null)
    setDismissId(null)
    setCompareIds([])
    setCompareOpen(false)
    setFavorites([])
    setFavoritesOnly(false)
    setSourceOffline(false)
    setMessages(initialMessages)
    setLastDismissal(null)
    setToast({ message: 'Demo ripristinata: stato e preferiti cancellati.' })
  }

  const changeBrief = (next: Brief) => setBrief(next)
  const removePref = (id: string) => { setBrief(removeLearned(brief, id)); setToast({ message: 'Preferenza rimossa dal brief.' }) }
  const askGame = (game: string) => setBrief((current) => ({ ...current, games: current.games.includes(game) ? current.games.filter((g) => g !== game) : [...current.games, game] }))
  const askResolution = (resolution: string) => setBrief((current) => ({ ...current, resolution, targetFps: resolution === '4K' ? 60 : resolution === '1440p' ? 120 : 144 }))
  const togglePeripherals = () => setBrief((current) => ({ ...current, includesPeripherals: !current.includesPeripherals }))

  const activeProduct = selectedId ? productById[selectedId] : null
  const activeOffers = activeProduct ? offersForProduct(visibleOffers, activeProduct.id) : []
  const selectedProducts = compareIds.map((id) => productById[id]).filter((product): product is Product => Boolean(product))
  const filteredFeasible = catalog.feasible.filter((match) => !favoritesOnly || favorites.includes(match.productId))
  const filteredExcluded = catalog.excluded.filter((match) => !favoritesOnly || favorites.includes(match.productId))
  const filteredUnknown = catalog.unknown.filter((match) => !favoritesOnly || favorites.includes(match.productId))
  const noResults = filteredFeasible.length === 0 && filteredUnknown.length === 0
  const rangeCrossesBudget = filteredFeasible.some((match) => match.offerRange && match.offerRange[1] > brief.budgetMax)
  const renderCard = (match: (typeof catalog.results)[number]) => {
    const product = productById[match.productId]
    if (!product) return null
    return <ProductCard key={product.id} product={product} match={match} offers={offersForProduct(visibleOffers, product.id)} favorite={favorites.includes(product.id)} compared={compareIds.includes(product.id)} onOpen={() => openProduct(product.id)} onDismiss={() => setDismissId(product.id)} onFavorite={() => toggleFavorite(product.id)} onCompare={() => toggleCompare(product.id)} />
  }
  const title = stage === 'ask' ? 'Cerco un PC gaming nuovo' : stage === 'configure' ? 'Rivedi il brief' : stage === 'product' && activeProduct ? activeProduct.name : 'Prodotti trovati'

  return (
    <div className="app-shell">
      <aside className={`app-rail ${mobileNav ? 'is-open' : ''}`} aria-label="Navigazione demo">
        <div className="brand"><span className="brand__mark">◇</span><span>fairbuy</span></div>
        <span className="demo-badge">DEMO · dati simulati</span>
        <nav className="rail-nav">
          <button type="button" className={stage === 'ask' ? 'is-active' : ''} onClick={() => navigate('ask')}>01 Richiesta</button>
          <button type="button" className={stage === 'configure' ? 'is-active' : ''} onClick={() => navigate('configure')}>02 Brief</button>
          <button type="button" className={stage === 'discover' ? 'is-active' : ''} onClick={() => navigate('discover')}>03 Scoperta</button>
          <button type="button" className={stage === 'product' ? 'is-active' : ''} onClick={() => navigate('product')}>04 Scelta esatta</button>
          <button type="button" className={favoritesOnly ? 'is-active' : ''} onClick={() => { setFavoritesOnly((current) => !current); if (stage === 'ask' || stage === 'configure') navigate('discover') }}>♥ Preferiti ({favorites.length})</button>
        </nav>
        <div className="rail-note">
          <strong>Percorso 3 min</strong>
          <button type="button" onClick={prepareBrief}>1. Rivedi il brief</button>
          <button type="button" onClick={startSearch}>2. Avvia ricerca</button>
          <button type="button" onClick={() => discoveredIds.includes('orbit') ? setDismissId('orbit') : setToast({ message: 'Avvia prima la ricerca demo.' })}>3. Rifiuta ORBIT</button>
          <button type="button" onClick={() => discoveredIds.includes('nova') ? openProduct('nova') : setToast({ message: 'Avvia prima la ricerca demo.' })}>4. Scegli NOVA</button>
          <button type="button" onClick={toggleSource}>5. Simula fonte offline</button>
        </div>
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
        <StageProgress stage={stage} onNavigate={navigate} />
        <main className="app-content">
          {(stage === 'ask' || stage === 'configure') ? (
            <div className="ask-layout">
              <ChatPanel stage={stage} messages={messages} brief={brief} searchStatus={searchStatus} discoveredCount={discoveredIds.length} totalCount={primaryIds.length} onConfigure={prepareBrief} onSearch={startSearch} onGame={askGame} onResolution={askResolution} onPeripherals={togglePeripherals} />
              <aside className="ask-side">
                <div className="panel"><div className="panel-heading"><span className="panel-kicker">Brief di partenza</span><span className="synthetic-badge">mock</span></div><dl className="summary-list"><dt>Budget</dt><dd>CHF {brief.budgetMin}–{brief.budgetMax}</dd><dt>Uso</dt><dd>{brief.resolution} · {brief.targetFps} fps</dd><dt>GPU</dt><dd>RTX {brief.gpu.value}+ {brief.gpu.mode === 'required' ? 'obbligatoria' : 'preferita'}</dd><dt>RAM</dt><dd>{brief.ram.value} GB {brief.ram.mode === 'required' ? 'obbligatoria' : 'preferita'}</dd><dt>Località</dt><dd>Zurigo (coarse)</dd></dl></div>
                <div className="panel"><div className="panel-heading"><span className="panel-kicker">Cosa è simulato</span></div><ul className="plain-list"><li>Prodotti, prezzi e retailer inventati.</li><li>Nessuna API, AI, autenticazione o scraping.</li><li>Nessun checkout né contatto venditore.</li><li>Le scelte dell’utente restano locali.</li></ul></div>
              </aside>
            </div>
          ) : null}
          {stage === 'discover' ? (
            <div className="workspace-grid">
              <BriefSidebar brief={brief} onChange={changeBrief} onRemoveLearned={removePref} />
              <section className="results" aria-live="polite">
                <div className="results-head">
                  <div><p className="eyebrow">Discover · risultati sintetici</p><h2>{favoritesOnly ? 'Preferiti' : 'Prodotti per te'}</h2></div>
                  <label className="checkline"><input type="checkbox" checked={favoritesOnly} onChange={(e) => setFavoritesOnly(e.target.checked)} data-testid="favorites-filter" /> Solo preferiti</label>
                </div>
                <div className="results-status">
                  <span>{filteredFeasible.length} consigliati · {filteredUnknown.length} da verificare · {filteredExcluded.length} esclusi</span>
                  <span className={`status-pill status-pill--${searchStatus}`}>{searchStatus === 'searching' ? 'ricerca in corso' : searchStatus === 'partial' ? 'risultati parziali' : 'ricerca completa'}</span>
                </div>
                {sourceOffline ? <p className="source-banner" role="status" data-testid="source-banner">Fonte Galaxus offline (simulazione): {offlineOfferCount} offerte non valutate. La classifica è parziale e può cambiare.</p> : null}
                {rangeCrossesBudget ? <p className="info-banner">Alcuni range superano il tetto di budget, ma almeno un’offerta esatta rientra: il prodotto non viene escluso per l’intero range.</p> : null}
                {noResults ? (
                  <div className="empty-state" data-testid="empty-state">
                    <span className="empty-state__icon">◇</span>
                    <h3>{favoritesOnly ? 'Nessun preferito in questa ricerca' : 'Nessun prodotto soddisfa i vincoli'}</h3>
                    <p>{favoritesOnly ? 'Salva un prodotto con il cuore, oppure disattiva il filtro.' : 'I vincoli obbligatori escludono tutte le fixture disponibili. Rilassa un requisito o rivedi il brief: FairBuy non cambia nulla da solo.'}</p>
                    <div className="empty-state__actions">
                      {favoritesOnly ? <button type="button" className="button button--primary" onClick={() => setFavoritesOnly(false)}>Mostra tutti i prodotti</button> : <button type="button" className="button button--primary" onClick={() => setBrief({ ...brief, budgetMax: 2400 })}>Porta il budget massimo a CHF 2’400</button>}
                      <button type="button" className="button button--ghost" onClick={prepareBrief}>Rivedi il brief</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {filteredFeasible.length > 0 ? <section className="result-group"><div className="result-group__head"><h3>Consigliati</h3><span className="hint">Feasibility prima del punteggio</span></div><div className="product-grid">{filteredFeasible.map(renderCard)}</div></section> : null}
                    {filteredUnknown.length > 0 ? <section className="result-group result-group--unknown"><div className="result-group__head"><h3>Da verificare</h3><span className="hint">Dati o costi decisivi mancanti</span></div><div className="product-grid">{filteredUnknown.map(renderCard)}</div></section> : null}
                    {filteredExcluded.length > 0 ? <section className="result-group result-group--excluded"><div className="result-group__head"><h3>Esclusi per vincolo obbligatorio</h3><span className="hint">Separati, mai nascosti senza spiegazione</span></div><div className="product-grid">{filteredExcluded.map(renderCard)}</div></section> : null}
                  </>
                )}
              </section>
              <aside className="insights">
                <SourcePanel sourceOffline={sourceOffline} offlineOfferCount={offlineOfferCount} onToggle={toggleSource} />
                <div className="panel">
                  <div className="panel-heading"><span className="panel-kicker">Perché cambia</span><span className="soft-tag">appreso</span></div>
                  {brief.learned.length === 0 ? <p className="hint">Nessuna preferenza appresa. Rifiuta un prodotto con un motivo per vedere l’aggiornamento del brief.</p> : <p className="hint"><strong>{brief.learned.length} preferenza/e appresa/e</strong> visibili e reversibili nel brief a sinistra.</p>}
                  <p className="hint">I rifiuti non diventano regole obbligatorie senza una tua scelta esplicita.</p>
                </div>
                <div className="panel">
                  <div className="panel-heading"><span className="panel-kicker">Regole demo</span></div>
                  <ul className="plain-list"><li>Hard fail → gruppo escluse.</li><li>Unknown cost → totale non confermato.</li><li>Range che attraversa il budget ≠ esclusione automatica.</li><li>Match illustrativo ≠ confidenza evidenze.</li></ul>
                </div>
                <div className="panel"><div className="panel-heading"><span className="panel-kicker">Copertura</span></div><p className="hint">Solo fixture sintetiche svizzere in CHF. Nessuna ricerca reale, nessuna esaustività di mercato, nessun link retailer attivo.</p></div>
              </aside>
            </div>
          ) : null}
          {stage === 'product' && activeProduct ? (
            <div className="workspace-grid workspace-grid--product">
              <BriefSidebar brief={brief} onChange={changeBrief} onRemoveLearned={removePref} />
              <SellerOffers product={activeProduct} offers={activeOffers} match={matchById[activeProduct.id] ?? { productId: activeProduct.id, tier: 'unknown', reasons: [], score: null, hardFailures: [], softMisses: [], unknown: ['Dati non disponibili'], bestOffer: null, offerRange: null, excluded: false }} sourceOffline={sourceOffline} onBack={() => setStage('discover')} />
              <aside className="insights"><SourcePanel sourceOffline={sourceOffline} offlineOfferCount={offlineOfferCount} onToggle={toggleSource} /><div className="panel"><h3>Decisione</h3><p className="hint">Scegli un’offerta esatta e apri il dettaglio retailer simulato. FairBuy non compra e non contatta nessuno.</p></div></aside>
            </div>
          ) : null}
        </main>
        <footer className="app-footer"><span>fairbuy · concept demo</span><span>Dati sintetici · nessuna offerta reale · nessun acquisto</span></footer>
      </div>
      <CompareTray products={selectedProducts} onOpen={() => setCompareOpen(true)} onRemove={toggleCompare} onClear={() => setCompareIds([])} />
      {compareOpen ? <CompareModal products={selectedProducts} matches={matchById} onClose={() => setCompareOpen(false)} /> : null}
      {dismissId && productById[dismissId] ? <DismissModal product={productById[dismissId]} brief={brief} onClose={() => setDismissId(null)} onApply={(reasons, clarification, note) => applyFeedback(dismissId, reasons, clarification, note)} /> : null}
      {toast ? <div className="toast" role="status"><span>{toast.message}</span>{toast.undo ? <button type="button" onClick={undoDismissal}>Annulla</button> : null}<button type="button" className="toast__close" onClick={() => setToast(null)} aria-label="Chiudi notifica">×</button></div> : null}
    </div>
  )
}
