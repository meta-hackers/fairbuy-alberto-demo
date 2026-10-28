# FairBuy — demo gaming PC (frontend-only)

Demo statica e interattiva del percorso **FairBuy Guided Shopping** per un PC gaming nuovo.
Non è un prodotto live: prodotti, configurazioni, prezzi, retailer, stock e timestamp sono
**fixture sintetiche inventate**. Non esistono AI, backend, autenticazione, scraping, checkout,
link retailer reali o contatti con venditori.

L’interfaccia parte da una chat **genuinamente vuota** e accompagna l’utente attraverso:

**ASK → CONFIGURE → DISCOVER → LEARN → CHOOSE → COMPARE**

La categoria PC resta il fallback. Un primo messaggio che nomina un interruttore/switch
smart instrada invece a una demo distinta di relè per neon. Solo il primo messaggio (o una
risposta alla domanda di disambiguazione) sceglie categoria; i messaggi successivi non la
cambiano.

## Cosa è possibile provare

- **ASK vuota**: zero messaggi precompilati e nessuna caratteristica preimpostata.
- Primo messaggio libero → una sola risposta simulata che chiede uso, budget e preferenze.
- Secondo messaggio → risposta esatta `ok, ho abbastanza informazioni` e comparsa delle
  caratteristiche simulate (uso, risoluzione, GPU, RAM, condizione).
- Chat sempre scrivibile anche dopo la comparsa delle caratteristiche; le risposte successive
  sono deterministiche, etichettate “simulata · nessuna AI” e non azzerano le caratteristiche.
- Caratteristiche **rimovibili singolarmente** e **aggiungibili come testo libero**; le modifiche
  restano attive passando tra ASK, CONFIGURE e DISCOVER.
- La barra mantiene tutti i sei stage: quelli non ancora raggiungibili sono disabilitati con
  spiegazione; su schermi stretti sono disposti in due righe.
- Card sottili con nome e minimo prezzo confermato; espansione accessibile mostra dettagli,
  preferiti, confronto, offerte e azione di esclusione motivata.
- Esclusione reversibile con motivi/nota, registro LEARN e ripristino. Solo scelte RAM/GPU
  esplicite cambiano la caratteristica mostrata; nessuna regola nascosta.
- Percorso separato relè smart: caratteristiche mock, potenza neon sconosciuta e candidati
  storici/non verificati; confronto prodotti, nessuna istruzione di cablaggio.
- CTA **Configura** solo dopo la comparsa delle caratteristiche, senza navigazione automatica.
- **CONFIGURE** separata con un unico slider di prezzo a **due cursori** (minimo/massimo),
  valori CHF visibili, uso da tastiera e divieto di incrocio.
- **DISCOVER** con filtri sempre visibili, indicatore `Sta cercando...`, un prodotto mock ogni
  **2000 ms** sotto i filtri, stato completato e stato vuoto sensato.
- Filtri per prezzo e caratteristiche supportate; le caratteristiche personalizzate sono
  mostrate ma **non verificate** e non vengono usate per dichiarare un match.
- Timer ripulito su navigazione, cambio filtri e smontaggio; nessun inserimento duplicato.
- Offerte esatte per configurazione/condizione, confronto prodotti, preferiti in `localStorage`,
  fonte Galaxus offline simulata, dettaglio retailer “Nessun acquisto effettuato”.
- Layout mobile senza overflow orizzontale e navigazione completa ASK > CONFIGURE > DISCOVER >
  LEARN > CHOOSE > COMPARE.

### ASK con testo libero

In fase ASK puoi digitare una risposta libera: **Invio** invia, **Shift+Invio** va a capo.
Le risposte sono deterministiche e scriptate su parole chiave (budget, giochi, risoluzione/FPS,
RAM, GPU), con un fallback esplicito per gli altri input. Sono sempre etichettate come simulate:
nessun modello AI e nessuna richiesta di rete. Il testo libero **non modifica le caratteristiche**:
le preferenze si gestiscono con i controlli di CONFIGURE o con il pannello caratteristiche.

## Confini mock

- Tutti i dati sono statici in `src/data/fixtures.ts`.
- I nomi Amazon, Galaxus, MediaWorld, TechStore e PC Dock sono **etichette illustrative**:
  nessuna integrazione, nessuna API, nessuna disponibilità reale.
- Non c’è input URL/screenshot: non viene effettuato alcun fetch arbitrario.
- Il testo libero in ASK è confrontato con parole chiave fisse, non con un modello
  linguistico. Gli input non riconosciuti ricevono un fallback che non finge di comprenderli.
- Il testo libero non applica modifiche alle caratteristiche: restano quelle rivelate o
  modificate esplicitamente dall’utente.
- Il filtro prezzo usa il **totale consegnato confermato più basso** della fixture; non è un
  prezzo di mercato né una quotazione.
- Le caratteristiche personalizzate non sono confrontabili con le specifiche sintetiche:
  vengono ignorate nel match e segnalate esplicitamente.
- Il punteggio “match” è illustrativo e separato dalla confidenza delle evidenze.
- Le fonti offline/online sono una simulazione locale; nessuna rete viene interrogata.
- Nessun pagamento, ordine, prenotazione o messaggio al venditore è possibile.

## Avvio

```bash
npm ci
npm run dev          # sviluppo
npm run build        # type-check + build in dist/
npm run preview      # anteprima del build
npm test             # test unitari deterministici
npm run test:e2e     # test Playwright (Chromium)
```

Se Playwright non usa un browser bundled, impostare il percorso Chromium:

```bash
PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

Il progetto usa Vite con `base: './'`: il contenuto di `dist/` può essere pubblicato su GitHub
Pages sia alla radice sia sotto `/fairbuy-alberto-demo/`. Dopo ogni modifica, `npm run build`
rigenera `dist/` con gli asset relativi pronti per la pubblicazione.

## Demo guidata in 3 minuti

1. **0:00–0:35 — ASK.** Apri la demo: la chat è vuota. Scrivi ad esempio “Mi serve un PC per
   gaming competitivo e AAA” e invia. Mostra la singola risposta simulata che chiede uso, budget
   e preferenze. Scrivi un secondo messaggio, ad esempio “Budget 2000 CHF, 1440p, GPU e RAM
   importanti”: l’assistente risponde esattamente `ok, ho abbastanza informazioni` e compaiono
   le caratteristiche. Continua a scrivere per mostrare che la chat resta disponibile.
2. **0:35–1:05 — CONFIGURE.** Clicca “Configura prezzo e filtri”. Mostra i due cursori, i valori
   CHF, l’uso da tastiera e il fatto che il minimo non può superare il massimo. Rimuovi una
   caratteristica e aggiungine una personalizzata (“Wi-Fi 7”): resta salvata. Torna ad ASK e
   verifica che conversazione e modifiche siano intatte.
3. **1:05–1:45 — DISCOVER.** Avvia la ricerca: nessuna card all’inizio, indicatore
   `Sta cercando...`. Le card compaiono una ogni 2 secondi sotto i filtri. Mostra che la ricerca
   si ferma quando i risultati compatibili sono esauriti e che cambiare un filtro riavvia il
   conteggio senza duplicati. Con un intervallo di prezzo impossibile compare lo stato vuoto.
4. **1:45–2:20 — OFFERTE ESATTE.** Apri NOVA e mostra le offerte ordinate Galaxus CHF 1’899,
   MediaWorld CHF 1’939, Amazon CHF 1’979, TechStore CHF 2’029, più il gruppo “Totale non
   confermato”. Apri il dettaglio retailer simulato: “Nessun acquisto effettuato”.
5. **2:20–2:45 — CONFRONTO / PREFERITI.** Torna ai prodotti, confronta due card e salva un
   preferito. Facoltativo: simula la fonte Galaxus offline dal dettaglio prodotto.

## Architettura frontend-only

```text
src/
  data/fixtures.ts             tipi condivisi + prodotti, offerte, brief di default
  lib/flow.ts                  caratteristiche mock, filtri prezzo/feature, match discovery
  lib/matching.ts              feasibility, tier, score, offerte e compatibilità legacy
  lib/mockReplies.ts           risposte simulate a parole chiave + fallback
  lib/sellers.ts               totali, gruppi offerte, range, ordinamento, formattazione CHF
  components/ChatPanel.tsx     chat vuota, composer, Invio/Shift+Invio, CTA Configura
  components/CharacteristicsPanel.tsx  lista rimovibile + aggiunta testo libero
  components/PriceRangeSlider.tsx      slider a due cursori accessibile
  components/StageProgress.tsx navigazione ASK > CONFIGURE > DISCOVER con lock
  components/ProductCard.tsx   card prodotto (dismiss opzionale, non usato nel flusso)
  components/SellerOffers.tsx  offerte esatte e dettaglio retailer simulato
  App.tsx                      stato locale, timer 2 s, filtri, confronto, preferiti, reset
  styles.css                   design system navy/teal, slider, stati ricerca, responsive
e2e/ask-free-text.spec.ts      chat vuota, due messaggi, persistenza caratteristiche, mobile
e2e/smoke.spec.ts              lock navigazione, slider, timing 2 s/4 s, filtri, stati, offerte
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
progress, pannello conversazionale, filtri in alto e griglia card.

## Copertura acceptance

| Criterio | Stato nella demo | Note |
|---|---|---|
| ASK vuota, zero messaggi precompilati | Coperto | `messages` parte da `[]`; hint non è un messaggio |
| Primo messaggio → una sola risposta simulata | Coperto | Chiede uso, budget e preferenze |
| Secondo messaggio → `ok, ho abbastanza informazioni` | Coperto | Testo esatto nel paragrafo del messaggio |
| Caratteristiche mock dopo due messaggi | Coperto | 5 caratteristiche supportate |
| Chat scrivibile dopo la rivelazione | Coperto | Risposte keyword, nessun reset delle caratteristiche |
| Caratteristiche rimovibili e aggiungibili | Coperto | Testo libero con badge “non verificabile” |
| Persistenza tra ASK/CONFIGURE/DISCOVER | Coperto | Stato unico in `App.tsx` |
| CTA Configura solo dopo la rivelazione | Coperto | Nessuna navigazione automatica |
| CONFIGURE separata | Coperto | Stage dedicato, chat non mostrata |
| Slider a due cursori, valori visibili, no crossing | Coperto | Due input range sovrapposti, clamp min/max |
| Accessibilità da tastiera | Coperto | Frecce, Home/End, focus visibile |
| DISCOVER con filtri sempre visibili | Coperto | Pannello filtri sopra i risultati |
| Un prodotto ogni 2000 ms | Coperto | Timer ripulito e riavviato |
| Filtri prezzo + feature supportate | Coperto | Match deterministico sulle fixture |
| Custom non dichiarato compatibile | Coperto | Nota esplicita, ignorato nel match |
| Stato `Sta cercando...` e completato | Coperto | Indicatore e messaggio finale |
| Stato vuoto sensato | Coperto | Con azione “Allarga il budget” |
| Cleanup timer e no duplicati | Coperto | Test con clock finto |
| Ritorno a ASK/DISCOVER coerente | Coperto | Conversazione, caratteristiche e filtri conservati |
| Offerte esatte e confronto | Coperto | Funzionalità legacy compatibile |
| Mobile e accessibilità di base | Coperto | Nessun overflow a 390 px, label e focus |
| AI/STT/TTS, connettori, scraping | **Non implementato** | Fuori scope demo frontend-only |
| Prezzi, stock o copertura di mercato reali | **Non disponibile** | Solo fixture sintetiche in CHF |

## Test e verifica

Comandi eseguiti durante lo sviluppo:

```bash
npm ci
npm run build
npm test
npm run test:e2e
```

Risultati attesi: build TypeScript/Vite pulita, **35 test unitari**, **13 test Playwright**.
Screenshot e report sono in `artifacts/` (`screenshots/` è ignorata da Git); il dettaglio
dell’ultima verifica è in `artifacts/flow-update-report.md`.

## Limiti e prossimi passi

- Le fixture non provano prezzi, stock, garanzie o affidabilità reali.
- Il “match” non è una probabilità né una certificazione; le regole sono dimostrative.
- Il filtro prezzo usa il totale consegnato confermato più basso, non un prezzo live.
- La ricerca è deterministica e limitata al pool; non c’è retrieval reale.
- Il testo libero in ASK non è NLU: riconosce solo parole chiave italiane e non estrae
  importi, modelli o requisiti. Le risposte non aggiornano le caratteristiche.
- Le caratteristiche personalizzate non sono verificate sui prodotti.
- Il pulsante retailer non apre un URL reale e non effettua acquisti.
- Un’integrazione live richiederebbe accesso autorizzato alle fonti, evidenze, timestamp,
  gestione errori e un backend: tutto esplicitamente fuori da questa demo.
- Nessun commit, push o pubblicazione è stato eseguito dall’agente.
