# FairBuy — demo gaming PC (frontend-only)

Demo statica e interattiva del percorso **FairBuy Guided Shopping** per un PC gaming nuovo.
Non è un prodotto live: prodotti, configurazioni, prezzi, retailer, stock e timestamp sono
**fixture sintetiche inventate**. Non esistono AI, backend, autenticazione, scraping, checkout,
link retailer reali o contatti con venditori.

L’interfaccia parte dalla richiesta **“Cerco un PC gaming nuovo”** e accompagna l’utente attraverso:

**ASK → CONFIGURE → DISCOVER → LEARN → CHOOSE EXACT PRODUCT → COMPARE SELLERS**

## Cosa è possibile provare

- Assistente scriptato che pone domande su giochi, risoluzione/FPS, periferiche, GPU e RAM.
- Budget CHF con slider e input numerici, minimo **soft** e massimo **strict**.
- Requisiti GPU/RAM **obbligatori o preferiti**, lista GPU da evitare, località coarse “Zurigo”.
- Revisione del brief prima della ricerca.
- Scoperta progressiva di card, con stato ricerca in corso/completa e fonte parziale simulata.
- Colori **più etichette**: verde match forte, ambra compromesso, rosso conflitto obbligatorio
  (gruppo separato), neutro dati/costi/disponibilità mancanti.
- Range di prezzo per configurazione esatta, base di prezzo dichiarata, badge retailer sintetici.
- Rifiuto di una card con motivi contestuali multipli, testo libero o **SKIP**; chiarimento mirato
  (“32 GB obbligatori o preferiti?”), preferenze apprese visibili/rimovibili e **Undo**.
- Nuove alternative da un pool di fixture dopo il feedback, non solo riordino della stessa lista.
- Scelta di un prodotto esatto e confronto delle offerte della **stessa configurazione e condizione**,
  ordinate per totale consegnato confermato; totale non confermato in gruppo separato.
- Dettaglio retailer **simulato** con “Nessun acquisto effettuato”.
- Preferiti in `localStorage`, confronto prodotti, reset completo della demo, layout mobile.

## Confini mock

- Tutti i dati sono statici in `src/data/fixtures.ts`.
- I nomi Amazon, Galaxus, MediaWorld, TechStore e PC Dock sono **etichette illustrative**:
  nessuna integrazione, nessuna API, nessuna disponibilità reale.
- Non c’è input URL/screenshot: non viene effettuato alcun fetch arbitrario.
- Il punteggio “match” è illustrativo e separato dalla confidenza delle evidenze.
- Le fonti offline/online sono una simulazione locale; nessuna rete viene interrogata.
- Nessun pagamento, ordine, prenotazione o messaggio al venditore è possibile.

## Avvio

```bash
npm ci
npm run dev      # sviluppo
npm run build    # type-check + build in dist/
npm run preview  # anteprima del build
npm test         # test unitari deterministici
npx playwright test  # smoke E2E (Chromium)
```

Se Playwright non usa un browser bundled, impostare il percorso Chromium:

```bash
PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npx playwright test
```

Il progetto usa Vite con `base: './'`: il contenuto di `dist/` può essere pubblicato su GitHub
Pages sia alla radice sia sotto `/fairbuy-alberto-demo/`.

## Demo guidata in 3 minuti

1. **0:00–0:25 — ASK.** Apri la demo, leggi la richiesta e le domande dell’assistente. Scegli
   “FPS competitivi”, “1440p · 120 fps” e conferma se il budget include periferiche.
2. **0:25–0:55 — CONFIGURE.** Clicca “Prepara il brief”. Mostra CHF 1’200–2’400, minimo soft,
   massimo strict, GPU RTX 4070+ preferita e RAM 32 GB preferita. Rivedi e avvia la ricerca.
3. **0:55–1:35 — DISCOVER.** Le card appaiono una alla volta. Mostra NOVA verde, ORBIT/STRIX ambra
   e VORTEX neutro per disponibilità non confermata. Sottolinea che il range di VORTEX supera il
   budget ma una singola offerta esatta rientra: il prodotto non viene escluso per il range.
4. **1:35–2:10 — LEARN.** Rimuovi ORBIT con “RAM insufficiente”; scegli “Solo una preferenza”,
   non obbligatoria. Mostra la preferenza appresa e le nuove alternative VEGA/ORBIT Pro. Usa
   “Annulla” per dimostrare l’Undo. Poi rendi GPU o RAM obbligatorie dal brief: le card diventano
   rosse e si spostano nel gruppo escluse.
5. **2:10–2:45 — CHOOSE.** Apri NOVA, mostra le offerte esatte ordinate Galaxus CHF 1’899,
   MediaWorld CHF 1’939, Amazon CHF 1’979, TechStore CHF 2’029, e il gruppo “Totale non confermato”.
   Apri il dettaglio retailer simulato: “Nessun acquisto effettuato”.
6. **2:45–3:00 — COMPARE / RELIABILITY.** Torna ai prodotti, confronta due card, poi simula la fonte
   Galaxus offline: la classifica diventa parziale e VORTEX passa a conflitto. Ripristina la fonte.

## Architettura frontend-only

```text
src/
  data/fixtures.ts       tipi condivisi + prodotti, offerte, brief di default
  lib/matching.ts        feasibility, tier, score, feedback, apprendimento, rediscovery
  lib/sellers.ts         totali, gruppi offerte, range, ordinamento, formattazione CHF
  components/            ChatPanel, BriefSidebar, StageProgress, ProductCard,
                         DismissModal, SellerOffers, CompareTray, ProductIllustration
  App.tsx                stato locale, flusso guidato, fonte simulata, reset, preferiti
  styles.css             design system navy/teal, responsive, focus visibile
e2e/smoke.spec.ts        journey completo, skip+Undo, hard/soft, rediscovery,
                         venditori, fonte offline, preferiti/reset, mobile
```

Stato e persistenza sono locali al browser. Le uniche scritture sono i preferiti in
`localStorage` (chiave `fairbuy-demo-favorites-v1`), cancellati dal reset demo.

## Riferimenti Wiki

Wiki pubblico al commit
[`7c7498f99d5c04708dcd70d7a9ce8e2bc254e026`](https://github.com/meta-hackers/fairbuy/wiki/7c7498f99d5c04708dcd70d7a9ce8e2bc254e026):

- [Guided Shopping UX](https://github.com/meta-hackers/fairbuy/wiki/Guided-Shopping-UX)
- [Gaming PC Demo: slides e walkthrough](https://github.com/meta-hackers/fairbuy/wiki/Gaming-PC-Demo)
- [Product Selection Logic](https://github.com/meta-hackers/fairbuy/wiki/Selection-Logic)
- [Pain Points and Opportunities](https://github.com/meta-hackers/fairbuy/wiki/Pain-Points-and-Opportunities)
- [Architecture](https://github.com/meta-hackers/fairbuy/wiki/Architecture)
- [Audio](https://github.com/meta-hackers/fairbuy/wiki/Audio)

Architettura, connettori, servizi di ricerca e audio della Wiki sono **futuri**: non sono
implementati in questa demo. La UI adotta la direzione visiva navy/teal, logo compatto, stage
progress, pannello conversazionale, brief a sinistra, griglia card e dettaglio centrale.

## Copertura acceptance Wiki

| Criterio | Stato nella demo | Note |
|---|---|---|
| Budget slider + input numerici, hard vs soft | Coperto | Minimo soft di default; massimo strict |
| Requisiti GPU/RAM obbligatori o preferiti | Coperto | Toggle espliciti, nessuna inferenza silenziosa |
| Card progressive e stato parziale | Coperto | Reveal a intervalli + fonte offline simulata |
| Stessa configurazione/condizione raggruppata | Coperto | Un prodotto = una config esatta; offerte raggruppate |
| Range prezzo con base esplicita | Coperto | Totali consegnati confermati, IVA inclusa, fixture |
| Badge retailer solo con dati sintetici | Coperto | Badge “dati sintetici” sempre visibile |
| Dismiss con motivi contestuali, free text, skip, Undo | Coperto | Multi-select + chiarimento + annulla |
| Feedback aggiorna brief e scopre nuove fixture | Coperto | Pool alternative, non solo riordino |
| Preferenze apprese visibili/editabili/reversibili | Coperto | Chip nel brief, rimozione con × |
| Colori + etichette per strong/preference/conflict/unknown | Coperto | Testo e badge oltre al colore |
| Hard fail separato e mai promosso dal punteggio | Coperto | Gruppo “Esclusi”; score null |
| Range che attraversa il budget non esclude tutto | Coperto | VORTEX ha un’offerta esatta entro budget |
| Offerta esatta: totale confermato, breakdown, stock, garanzia, resi, timestamp | Coperto | Ordinamento per totale; fonte fittizia |
| Costo decisivo mancante separato | Coperto | Gruppo “Totale non confermato” |
| Nessun merge di varianti/condizioni diverse | Coperto | Test unitario sui gruppi esatti |
| Bottone finale = dettaglio retailer simulato | Coperto | “Nessun acquisto effettuato” |
| Confidenza evidenze separata dal match | Coperto | Punteggio illustrativo e testi espliciti |
| Mobile e accessibilità di base | Coperto | Label, focus, dialoghi, nessun overflow a 390 px |
| AI/STT/TTS, connettori, scraping, monitoraggio | **Non implementato** | Fuori scope demo frontend-only |
| Input URL/screenshot | **Non incluso** | Evita fetch arbitrari e falsa estrazione |
| Copertura di mercato o prezzi reali | **Non disponibile** | Solo fixture sintetiche svizzere in CHF |

## Test e verifica

Comandi eseguiti durante lo sviluppo:

```bash
npm ci
npm run build
npm test
npx playwright test
```

Risultati attesi: build TypeScript/Vite pulita, 20 test unitari, 6 smoke test Playwright.
Screenshot e report sono in `artifacts/` (`screenshots/` è ignorata da Git).

## Limiti e prossimi passi

- Le fixture non provano prezzi, stock, garanzie o affidabilità reali.
- Il “match” non è una probabilità né una certificazione; le regole sono versionabili ma qui
  restano dimostrative.
- La ricerca di nuove alternative è deterministica e limitata al pool; non c’è retrieval reale.
- Il pulsante retailer non apre un URL reale e non effettua acquisti.
- Un’integrazione live richiederebbe accesso autorizzato alle fonti, evidenze, timestamp,
  gestione errori e un backend: tutto esplicitamente fuori da questa demo.
- Nessun commit o push è stato eseguito dall’agente; la pubblicazione è gestita dal parent.


## ASK con testo libero

In fase ASK puoi digitare una risposta libera (Invio invia, Shift+Invio va a capo). Le risposte sono deterministiche e scriptate su parole chiave (budget, giochi, risoluzione, RAM, GPU) e sono sempre etichettate come simulate: nessun modello AI, nessuna richiesta di rete. Il testo libero non modifica il brief: le preferenze si applicano con i chip o dal pannello del brief.
